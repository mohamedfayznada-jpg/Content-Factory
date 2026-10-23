(() => {
  const $ = id => document.getElementById(id);
  const DB_NAME = "content-factory-assets", STORE = "images";
  let activeImage = null, references = [], enhanced = null;
  function openDB() {
    return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE)){const s=db.createObjectStore(STORE,{keyPath:"id"});s.createIndex("projectId","projectId",{unique:false});}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  }
  async function allForProject(projectId) {
    const db=await openDB(); return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readonly"),req=tx.objectStore(STORE).index("projectId").getAll(projectId);req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();});
  }
  async function storeImage(item) {
    const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(item);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error||new Error("تعذر الحفظ؛ قد تكون مساحة المتصفح ممتلئة"));};tx.onabort=()=>{db.close();reject(tx.error||new Error("تم إلغاء الحفظ"));};});
  }
  async function deleteImage(id) {
    const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);});
  }
  function readFileAsData(file) {
    return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error("تعذرت قراءة الصورة"));reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});
  }
  async function compressImage(file) {
    const raw=await readFileAsData(file);
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error("ملف صورة غير صالح"));i.src=raw;});
    const max=900, scale=Math.min(1,max/Math.max(img.width,img.height)), canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
    canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL("image/jpeg",0.68);
  }
  async function drawGallery(projectId) {
    const gallery=$("saved-image-gallery");if(!gallery)return;
    try {
      const images=await allForProject(projectId);
      if(!images.length){gallery.innerHTML='<p class="muted">لسه مفيش صور محفوظة في المشروع ده.</p>';return;}
      gallery.innerHTML="";
      images.forEach(item=>{const fig=document.createElement("div");fig.className="project";const img=document.createElement("img");img.src=item.image;img.alt=item.prompt||"صورة محفوظة";img.loading="lazy";img.style.cssText="width:100%;max-width:360px;display:block;border-radius:10px;margin:0 auto 8px";const desc=document.createElement("p");desc.className="muted";desc.textContent=item.prompt;const actions=document.createElement("div");actions.className="actions";const dl=document.createElement("button");dl.className="btn primary";dl.textContent="تنزيل";dl.onclick=()=>{const a=document.createElement("a");a.href=item.image;a.download="content-factory-image.png";a.click();};const del=document.createElement("button");del.className="btn";del.textContent="حذف";del.onclick=async()=>{if(confirm("تحذف الصورة من المشروع؟")){await deleteImage(item.id);drawGallery(projectId);}};actions.append(dl,del);fig.append(img,desc,actions);gallery.append(fig);});
    } catch {gallery.textContent="المتصفح لم يسمح بفتح مساحة الصور المحفوظة.";}
  }
  function drawReferences() {
    const host=$("reference-list");if(!host)return;host.innerHTML="";
    references.forEach((ref,index)=>{const item=document.createElement("div");item.className="project";item.style.cssText="display:inline-block;width:130px;vertical-align:top;margin:4px";const img=document.createElement("img");img.src=ref.data;img.alt=ref.name;img.style.cssText="width:100%;height:100px;object-fit:cover;border-radius:8px";const name=document.createElement("p");name.className="muted";name.style.cssText="font-size:11px;overflow-wrap:anywhere";name.textContent=ref.name;const remove=document.createElement("button");remove.className="btn";remove.textContent="إزالة";remove.onclick=()=>{references.splice(index,1);enhanced=null;drawReferences();};item.append(img,name,remove);host.append(item);});
    $("reference-count").textContent=references.length+" صورة مرجعية";
  }
  async function attach() {
    const p=typeof current==="function"?current():null,host=$("workspace");
    if(!p||p.kind!=="image"||!host||$("image-generator"))return;
    const card=document.createElement("section");card.id="image-generator";card.className="card";card.style.marginTop="16px";
    card.innerHTML='<div class="head"><h3>🖼️ مولّد الصور الذكي</h3><span class="status">Pollinations · Gemini AI</span></div><p class="muted">أضف أي عدد من الصور المرجعية. الذكاء الاصطناعي هيحللها ويحسّن البرومبت في JSON قبل توليد الصورة. عدد الصور غير محدد من الواجهة، لكن حجم الطلب ومساحة المتصفح يفضلوا حدود تقنية.</p><div class="field"><label>الوصف الأساسي للصورة</label><textarea id="image-prompt" placeholder="صف الصورة التي تريد توليدها بالتفصيل"></textarea></div><div class="field"><label>الصور المرجعية (اختيار متعدد)</label><input id="reference-files" type="file" accept="image/png,image/jpeg,image/webp" multiple><span id="reference-count" class="muted">0 صورة مرجعية</span><div id="reference-list"></div></div><div class="grid"><div class="field"><label>نسبة الأبعاد</label><select id="image-ratio"><option value="1:1">مربع 1:1</option><option value="16:9">أفقي 16:9</option><option value="9:16">عمودي 9:16</option><option value="4:5">منشور 4:5</option><option value="3:2">أفقي 3:2</option></select></div><div class="field" style="align-content:end"><button id="enhance-prompt" class="btn">✨ تحسين البرومبت بالذكاء الاصطناعي</button></div></div><div id="enhance-status" class="muted"></div><div id="enhanced-box" style="display:none"><div class="field"><label>البرومبت المحسّن (JSON قابل للتعديل)</label><textarea id="enhanced-json" style="direction:ltr;text-align:left;min-height:230px;font-family:monospace"></textarea></div><div class="actions"><button id="use-enhanced" class="btn">استخدام البرومبت المحسّن</button><button id="copy-json" class="btn">نسخ JSON</button></div></div><div class="actions" style="margin-top:10px"><button id="image-generate" class="btn primary">توليد الصورة ✨</button></div><div id="image-result"></div><hr style="border:0;border-top:1px solid var(--line);margin:20px 0"><div class="head"><h3>الصور المحفوظة في المشروع</h3></div><div id="saved-image-gallery" class="list"></div>';
    host.appendChild(card);
    $("image-prompt").value=p.selectedIdea?String(p.selectedIdea).replace(/[{}"]/g," ").slice(0,1200):p.topic;
    $("reference-files").onchange=async e=>{const files=Array.from(e.target.files||[]);if(!files.length)return;const status=$("enhance-status");status.textContent="جاري تجهيز الصور المرجعية...";try{for(const file of files){if(!file.type.startsWith("image/"))continue;references.push({name:file.name,data:await compressImage(file)});}enhanced=null;$("enhanced-box").style.display="none";drawReferences();status.textContent="تم تجهيز الصور المرجعية. تقدر تضيف صورًا أخرى في أي وقت.";}catch(err){status.textContent=err.message||"تعذر تجهيز إحدى الصور.";}e.target.value="";};
    $("enhance-prompt").onclick=async()=>{const btn=$("enhance-prompt"),status=$("enhance-status"),prompt=$("image-prompt").value.trim();if(prompt.length<3){status.textContent="اكتب وصف الصورة الأول.";return;}btn.disabled=true;status.textContent="الذكاء الاصطناعي بيحلل الوصف والصور المرجعية ويجهز JSON...";try{const r=await fetch("/api/enhance-image-prompt",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,ratio:$("image-ratio").value,references:references.map(x=>({name:x.name,data:x.data}))})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"تعذر تحسين البرومبت");enhanced=d.items;$("enhanced-json").value=JSON.stringify(enhanced,null,2);$("enhanced-box").style.display="block";status.textContent="تم تحليل "+references.length+" صورة مرجعية وإنشاء JSON محسن. راجعه قبل الاستخدام.";}catch(err){status.textContent=err.message;}finally{btn.disabled=false;}};
    $("use-enhanced").onclick=()=>{try{enhanced=JSON.parse($("enhanced-json").value);if(!enhanced.enhanced_prompt)throw Error();$("image-prompt").value=enhanced.enhanced_prompt;$("enhance-status").textContent="تم استخدام البرومبت المحسّن. اضغط توليد الصورة.";}catch{$("enhance-status").textContent="راجع JSON؛ لازم يحتوي على enhanced_prompt صالح."; }};
    $("copy-json").onclick=async()=>{try{await navigator.clipboard.writeText($("enhanced-json").value);$("copy-json").textContent="اتنسخ ✓";}catch{$("enhance-status").textContent="تعذر النسخ التلقائي؛ انسخ JSON يدويًا.";}};
    $("image-generate").onclick=async()=>{const btn=$("image-generate"),out=$("image-result"),prompt=$("image-prompt").value.trim(),ratio=$("image-ratio").value;if(prompt.length<3){out.textContent="اكتب وصفًا للصورة أولًا.";return;}btn.disabled=true;btn.textContent="جاري التوليد...";out.textContent="قد يستغرق التوليد بعض الوقت.";try{const r=await fetch("/api/generate-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,ratio})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"فشل توليد الصورة");activeImage={image:d.image,prompt,ratio,projectId:p.id,referenceCount:references.length,enhancedPrompt:enhanced};out.innerHTML='<div class="output"><img id="generated-image" alt="الصورة المولدة" style="width:100%;max-width:720px;display:block;margin:auto;border-radius:12px"><div class="actions" style="margin-top:10px"><button class="btn primary" id="save-project-image">حفظ في المشروع</button><button class="btn" id="download-image">تنزيل الصورة</button></div><p id="image-save-status" class="muted"></p></div>';$("generated-image").src=d.image;$("download-image").onclick=()=>{const a=document.createElement("a");a.href=d.image;a.download="content-factory-image.png";a.click();};$("save-project-image").onclick=async()=>{const b=$("save-project-image"),s=$("image-save-status");b.disabled=true;s.textContent="جاري الحفظ...";try{await storeImage({id:"img_"+Date.now()+"_"+Math.random().toString(36).slice(2,8),...activeImage,createdAt:new Date().toISOString()});s.textContent="اتحفظت الصورة داخل المشروع ✓";await drawGallery(p.id);}catch(err){s.textContent=err.message||"تعذر الحفظ. نزّل الصورة بدلًا من ذلك.";}finally{b.disabled=false;}};}catch(err){out.textContent=err.message;}finally{btn.disabled=false;btn.textContent="توليد صورة جديدة ✨";}};
    drawReferences();drawGallery(p.id);
  }
  const watch=new MutationObserver(()=>{attach().catch(()=>{});});
  function start(){const host=$("workspace");if(host)watch.observe(host,{childList:true,subtree:true});attach();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();