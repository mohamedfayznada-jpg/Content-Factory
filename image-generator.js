(() => {
  const $ = id => document.getElementById(id);
  const DB_NAME = "content-factory-assets";
  const STORE = "images";
  let activeImage = null;
  const esc = s => String(s || "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("projectId", "projectId", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("تعذر فتح مساحة حفظ الصور"));
    });
  }
  async function allForProject(projectId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).index("projectId").getAll(projectId);
      req.onsuccess = () => resolve((req.result || []).sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }
  async function storeImage(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error("تعذر حفظ الصورة؛ قد تكون مساحة المتصفح ممتلئة")); };
      tx.onabort = () => { db.close(); reject(tx.error || new Error("تم إلغاء حفظ الصورة")); };
    });
  }
  async function deleteImage(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }
  async function drawGallery(projectId) {
    const gallery = $("saved-image-gallery");
    if (!gallery) return;
    try {
      const images = await allForProject(projectId);
      if (!images.length) {
        gallery.innerHTML = '<p class="muted">لسه مفيش صور محفوظة في المشروع ده.</p>';
        return;
      }
      gallery.innerHTML = "";
      images.forEach(item => {
        const figure = document.createElement("div");
        figure.className = "project";
        const img = document.createElement("img");
        img.src = item.image; img.alt = item.prompt || "صورة محفوظة";
        img.loading = "lazy";
        img.style.cssText = "width:100%;max-width:360px;display:block;border-radius:10px;margin:0 auto 8px";
        const desc = document.createElement("p");
        desc.className = "muted"; desc.textContent = item.prompt;
        const actions = document.createElement("div"); actions.className = "actions";
        const download = document.createElement("button");
        download.className = "btn primary"; download.textContent = "تنزيل";
        download.onclick = () => { const a=document.createElement("a"); a.href=item.image; a.download="content-factory-image.png"; a.click(); };
        const remove = document.createElement("button");
        remove.className = "btn"; remove.textContent = "حذف";
        remove.onclick = async () => {
          if (!confirm("تحذف الصورة من المشروع؟")) return;
          try { await deleteImage(item.id); await drawGallery(projectId); }
          catch { alert("تعذر حذف الصورة."); }
        };
        actions.append(download, remove);
        figure.append(img, desc, actions);
        gallery.append(figure);
      });
    } catch {
      gallery.textContent = "المتصفح لم يسمح بفتح مساحة الصور المحفوظة.";
    }
  }
  async function attach() {
    const p = typeof current === "function" ? current() : null;
    const host = $("workspace");
    if (!p || p.kind !== "image" || !host || $("image-generator")) return;
    const card = document.createElement("section");
    card.id = "image-generator"; card.className = "card"; card.style.marginTop = "16px";
    card.innerHTML = '<div class="head"><h3>🖼️ مولّد الصور</h3><span class="status">Pollinations · Z-Image</span></div><p class="muted">ولّد صورة واحفظها داخل المشروع للرجوع إليها لاحقًا على نفس المتصفح.</p><div class="field"><label>وصف الصورة</label><textarea id="image-prompt" placeholder="مثال: إعلان منتج أنيق لقارورة مياه على خلفية طبيعية، بدون كتابة داخل الصورة"></textarea></div><div class="grid"><div class="field"><label>نسبة الأبعاد</label><select id="image-ratio"><option value="1:1">مربع 1:1</option><option value="16:9">أفقي 16:9</option><option value="9:16">عمودي 9:16</option><option value="4:5">منشور 4:5</option><option value="3:2">أفقي 3:2</option></select></div><div class="field" style="align-content:end"><button id="image-generate" class="btn primary">توليد الصورة ✨</button></div></div><div id="image-result"></div><hr style="border:0;border-top:1px solid var(--line);margin:20px 0"><div class="head"><h3>الصور المحفوظة في المشروع</h3></div><div id="saved-image-gallery" class="list"></div>';
    host.appendChild(card);
    $("image-prompt").value = p.selectedIdea ? String(p.selectedIdea).replace(/[{}"]/g," ").slice(0,1200) : p.topic;
    drawGallery(p.id);
    $("image-generate").onclick = async () => {
      const btn = $("image-generate"), out = $("image-result"), prompt = $("image-prompt").value.trim(), ratio = $("image-ratio").value;
      if (prompt.length < 3) { out.textContent = "اكتب وصفًا للصورة أولًا."; return; }
      btn.disabled = true; btn.textContent = "جاري التوليد..."; out.textContent = "قد يستغرق التوليد بعض الوقت.";
      try {
        const r = await fetch("/api/generate-image", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt,ratio}) });
        const d = await r.json().catch(()=>({}));
        if (!r.ok) throw new Error(d.error || "فشل توليد الصورة");
        activeImage = { image:d.image, prompt, ratio, projectId:p.id };
        out.innerHTML = '<div class="output"><img id="generated-image" alt="الصورة المولدة" style="width:100%;max-width:720px;display:block;margin:auto;border-radius:12px"><div class="actions" style="margin-top:10px"><button class="btn primary" id="save-project-image">حفظ في المشروع</button><button class="btn" id="download-image">تنزيل الصورة</button></div><p id="image-save-status" class="muted"></p></div>';
        $("generated-image").src = d.image;
        $("download-image").onclick = () => { const a=document.createElement("a"); a.href=d.image; a.download="content-factory-image.png"; a.click(); };
        $("save-project-image").onclick = async () => {
          const saveBtn = $("save-project-image"), status = $("image-save-status");
          saveBtn.disabled = true; status.textContent = "جاري الحفظ...";
          try {
            await storeImage({ id:"img_"+Date.now()+"_"+Math.random().toString(36).slice(2,8), ...activeImage, createdAt:new Date().toISOString() });
            status.textContent = "اتحفظت الصورة داخل المشروع ✓";
            await drawGallery(p.id);
          } catch (e) { status.textContent = e.message || "تعذر الحفظ. جرّب تنزيل الصورة بدلًا من ذلك."; }
          finally { saveBtn.disabled = false; }
        };
      } catch (e) { out.textContent = e.message; }
      finally { btn.disabled = false; btn.textContent = "توليد صورة جديدة ✨"; }
    };
  }
  const watch = new MutationObserver(() => { attach().catch(()=>{}); });
  function start() { const host = $("workspace"); if (host) watch.observe(host,{childList:true,subtree:true}); attach(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",start); else start();
})();