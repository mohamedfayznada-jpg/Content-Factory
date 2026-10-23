(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s || "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  async function attach() {
    const p = typeof current === "function" ? current() : null;
    const host = $("workspace");
    if (!p || p.kind !== "image" || !host || $("image-generator")) return;
    const card = document.createElement("section");
    card.id = "image-generator"; card.className = "card"; card.style.marginTop = "16px";
    card.innerHTML = '<div class="head"><h3>🖼️ مولّد الصور المجاني</h3><span class="status">Pollinations · Z-Image</span></div><p class="muted">اكتب وصف الصورة، أو استخدم الفكرة المعتمدة. التوليد يعتمد على توافر الحصة المجانية للمزوّد.</p><div class="field"><label>وصف الصورة</label><textarea id="image-prompt" placeholder="مثال: إعلان منتج أنيق لقارورة مياه على خلفية طبيعية، بدون كتابة داخل الصورة"></textarea></div><div class="grid"><div class="field"><label>نسبة الأبعاد</label><select id="image-ratio"><option value="1:1">مربع 1:1</option><option value="16:9">أفقي 16:9</option><option value="9:16">عمودي 9:16</option><option value="4:5">منشور 4:5</option><option value="3:2">أفقي 3:2</option></select></div><div class="field" style="align-content:end"><button id="image-generate" class="btn primary">توليد الصورة ✨</button></div></div><div id="image-result"></div>';
    host.appendChild(card);
    $("image-prompt").value = p.selectedIdea ? String(p.selectedIdea).replace(/[{}"]/g," ").slice(0,1200) : p.topic;
    $("image-generate").onclick = async () => {
      const btn = $("image-generate"), out = $("image-result"), prompt = $("image-prompt").value.trim();
      if (prompt.length < 3) { out.textContent = "اكتب وصفًا للصورة أولًا."; return; }
      btn.disabled = true; btn.textContent = "جاري التوليد..."; out.textContent = "قد يستغرق التوليد بعض الوقت.";
      try {
        const r = await fetch("/api/generate-image", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt,ratio:$("image-ratio").value}) });
        const d = await r.json().catch(()=>({}));
        if (!r.ok) throw new Error(d.error || "فشل توليد الصورة");
        out.innerHTML = '<div class="output"><img id="generated-image" alt="الصورة المولدة" style="width:100%;max-width:720px;display:block;margin:auto;border-radius:12px"><div class="actions" style="margin-top:10px"><button class="btn primary" id="download-image">حفظ الصورة</button></div></div>';
        $("generated-image").src = d.image;
        $("download-image").onclick = () => { const a=document.createElement("a"); a.href=d.image; a.download="content-factory-image.png"; a.click(); };
      } catch (e) { out.textContent = e.message; }
      finally { btn.disabled = false; btn.textContent = "توليد صورة جديدة ✨"; }
    };
  }
  const watch = new MutationObserver(() => { attach().catch(()=>{}); });
  function start() { const host = $("workspace"); if (host) watch.observe(host,{childList:true,subtree:true}); attach(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",start); else start();
})();