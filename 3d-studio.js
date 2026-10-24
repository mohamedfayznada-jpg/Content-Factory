import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/exporters/GLTFExporter.js';

(() => {
  const style = document.createElement('style');
  style.textContent = `
  .studio3d-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(280px,1fr);gap:16px}
  .studio3d-stage{position:relative;min-height:390px;border-radius:15px;overflow:hidden;background:radial-gradient(circle at 50% 25%,#3d2934,#15131b 70%);border:1px solid #49303a}
  .studio3d-stage canvas{display:block;width:100%;height:390px}
  .studio3d-hud{position:absolute;top:12px;right:12px;display:flex;gap:6px;flex-wrap:wrap}
  .studio3d-hud span{background:#1a0f12dd;color:#f9e6d1;border:1px solid #f5c45144;padding:5px 8px;border-radius:20px;font-size:10px}
  .studio3d-timeline{height:8px;background:#eee4df;border-radius:8px;overflow:hidden;margin:12px 0}
  .studio3d-timeline>div{height:100%;width:0;background:linear-gradient(90deg,#881e3f,#f5c451);transition:width .1s}
  .studio3d-note{font-size:12px;line-height:1.9;color:#6f7785}
  .studio3d-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  .studio3d-actions .btn{flex:1}
  .studio3d-field{display:grid;gap:6px;margin:12px 0}
  .studio3d-field label{font-weight:800;font-size:12px}
  .studio3d-field textarea,.studio3d-field input,.studio3d-field select{width:100%;border:1px solid #ded3cc;border-radius:10px;padding:10px;background:#fffdfb;font:inherit}
  .studio3d-field textarea{min-height:95px}
  .studio3d-spec{direction:ltr;text-align:left;white-space:pre-wrap;overflow:auto;max-height:260px;background:#1a0f12;color:#f9e6d1;border-radius:10px;padding:12px;font:12px/1.6 ui-monospace,monospace}
  .studio3d-status{font-size:12px;color:#6f7785;line-height:1.8;margin-top:8px}
  @media(max-width:850px){.studio3d-grid{grid-template-columns:1fr}.studio3d-stage,.studio3d-stage canvas{min-height:320px;height:320px}}
  `;
  document.head.appendChild(style);

  const nav = document.querySelector('.brand-nav');
  const main = document.querySelector('.app-main');
  if (!nav || !main || document.getElementById('page-3d-studio')) return;

  const navButton = document.createElement('button');
  navButton.dataset.page = '3d-studio';
  navButton.innerHTML = '<span>⬡</span><b class="nav-label">3D والتحريك</b>';
  const imageNav = nav.querySelector('[data-page="image-studio"]');
  if (imageNav) imageNav.insertAdjacentElement('afterend', navButton); else nav.append(navButton);

  const page = document.createElement('div');
  page.id = 'page-3d-studio';
  page.className = 'page-view';
  page.innerHTML = `
    <section class="hero"><small>MF CREATIVE STUDIO / 3D LAB</small><h1>من الصورة إلى <em>مشهد متحرك</em></h1><p>استورد مجسمًا ثلاثي الأبعاد، حرّكه بوصف مفهوم، وعاين النتيجة في المتصفح. الأدوات الأساسية تعمل دون مفتاح API أو GPU على الخادم.</p></section>
    <div class="studio3d-grid">
      <div>
        <section class="card">
          <div class="head"><h2>معاينة المشهد</h2><span class="pill">Three.js · WebGL</span></div>
          <div class="studio3d-stage" id="studio3d-stage"><div class="studio3d-hud"><span id="studio3d-object-label">مجسم تجريبي</span><span id="studio3d-run-label">جاهز</span></div></div>
          <div class="studio3d-timeline"><div id="studio3d-progress"></div></div>
          <div class="actions"><button class="btn primary" id="studio3d-play">▶ تشغيل الحركة</button><button class="btn" id="studio3d-reset">إعادة ضبط</button></div>
          <div class="studio3d-status" id="studio3d-status" role="status">المشهد التجريبي جاهز. يمكنك استيراد ملف GLB/GLTF أو تجربة وصف الحركة.</div>
        </section>
        <section class="card">
          <div class="head"><h2>ملف المجسم</h2></div>
          <div class="studio3d-field"><label for="studio3d-file">استيراد مجسم (.glb / .gltf)</label><input id="studio3d-file" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json"></div>
          <p class="studio3d-note">ملفات GLTF التي تستخدم ملفات خامات منفصلة قد تحتاج إلى رفع ملف GLB المدمج بدلًا منها. الملفات المستوردة تتم معالجتها داخل المتصفح.</p>
          <div class="studio3d-actions"><button class="btn" id="studio3d-export">تصدير المشهد كـ GLB</button><button class="btn" id="studio3d-export-spec">تنزيل وصف الحركة JSON</button></div>
        </section>
      </div>
      <div>
        <section class="card">
          <div class="head"><h2>مخطط الحركة</h2></div>
          <div class="studio3d-field"><label for="studio3d-prompt">اكتب الحركة باللغة الطبيعية</label><textarea id="studio3d-prompt">لف المجسم 180 درجة في ثانيتين، ثم حرّك الكاميرا في قوس جانبي ببطء لمدة ثانية.</textarea></div>
          <div class="studio3d-field"><label for="studio3d-duration">مدة الحركة (ثوانٍ)</label><input id="studio3d-duration" type="number" min="1" max="60" step="0.5" value="3"></div>
          <div class="studio3d-field"><label for="studio3d-motion">نوع الحركة</label><select id="studio3d-motion"><option value="rotate">دوران حول المحور الرأسي</option><option value="orbit">حركة كاميرا حول المجسم</option><option value="float">ارتفاع وانخفاض ناعم</option><option value="product">دوران منتج مع اقتراب الكاميرا</option></select></div>
          <div class="studio3d-field"><label for="studio3d-degrees">زاوية الدوران</label><input id="studio3d-degrees" type="number" min="-720" max="720" step="15" value="180"></div>
          <div class="studio3d-actions"><button class="btn primary" id="studio3d-build">تحليل الوصف وتجهيز الحركة</button></div>
          <p class="studio3d-note">المخطط الحالي يستخدم قواعد واضحة داخل المتصفح، وليس نموذجًا لغويًا. راجع البيانات الناتجة قبل استخدامها في مشروع إنتاج.</p>
        </section>
        <section class="card">
          <div class="head"><h2>بيانات الحركة</h2></div>
          <pre class="studio3d-spec" id="studio3d-spec">لم يتم إنشاء مخطط بعد.</pre>
          <p class="studio3d-note">يشمل التصدير وصفًا منظمًا للحركة. تصدير GLB يحفظ هندسة المجسم والخامات؛ لا يفترض أن يحوّل مخطط الحركة هذا إلى Animation Clip قياسي.</p>
        </section>
      </div>
    </div>`;
  main.appendChild(page);

  const title = document.getElementById('page-title');
  const allPages = () => document.querySelectorAll('.page-view');
  function goStudio() {
    allPages().forEach(p => p.classList.toggle('active', p === page));
    document.querySelectorAll('[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === '3d-studio'));
    if (title) title.textContent = '3D والتحريك';
    window.scrollTo({top:0,behavior:'smooth'});
    if (!renderer) initScene();
    resize();
  }
  navButton.addEventListener('click', goStudio);
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-go="3d-studio"]');
    if (target) goStudio();
  });

  const stage = document.getElementById('studio3d-stage');
  const status = document.getElementById('studio3d-status');
  const specNode = document.getElementById('studio3d-spec');
  let renderer, scene, camera, controls, product, importedRoot = null, animationFrame = 0, playing = false, startAt = 0, duration = 3, motion = null, raf = 0;
  const clock = new THREE.Clock();

  function setStatus(text) { status.textContent = text; }
  function initScene() {
    if (renderer) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#1b1720');
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(4.4, 3.1, 6.5);
    renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    stage.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0,1,0);
    scene.add(new THREE.HemisphereLight(0xffe8d0,0x312033,2.0));
    const key = new THREE.DirectionalLight(0xffd59a,3.2); key.position.set(4,7,5); scene.add(key);
    const rim = new THREE.DirectionalLight(0xff527d,2.0); rim.position.set(-5,3,-4); scene.add(rim);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#28232b',roughness:.72,metalness:.12}));
    floor.rotation.x = -Math.PI/2; floor.position.y = -0.03; scene.add(floor);
    const grid = new THREE.GridHelper(10,20,'#66505b','#403640'); grid.position.y = -0.015; scene.add(grid);
    createDemoObject();
    resize();
    window.addEventListener('resize',resize);
    animate();
  }
  function createDemoObject() {
    if (importedRoot) { scene.remove(importedRoot); disposeTree(importedRoot); importedRoot=null; }
    if (product) { scene.remove(product); disposeTree(product); }
    product = new THREE.Group();
    const glass = new THREE.MeshPhysicalMaterial({color:'#8ad9e9',metalness:.12,roughness:.16,transmission:.15,thickness:.3,clearcoat:1});
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.62,.52,2.0,64,1,false),glass);
    body.position.y=1.15; product.add(body);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(.52,48,24),glass); shoulder.scale.set(1,.52,1); shoulder.position.y=2.12; product.add(shoulder);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.24,.28,.28,48),new THREE.MeshStandardMaterial({color:'#b7e9f3',metalness:.18,roughness:.22})); neck.position.y=2.43; product.add(neck);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.32,48),new THREE.MeshStandardMaterial({color:'#f5c451',metalness:.42,roughness:.25})); cap.position.y=2.72; product.add(cap);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(.626,.526,.72,64,1,true),new THREE.MeshStandardMaterial({color:'#881e3f',roughness:.55,metalness:.05,side:THREE.DoubleSide}));
    label.position.y=1.12; product.add(label);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.62,.025,12,64),new THREE.MeshStandardMaterial({color:'#f5c451',metalness:.6,roughness:.22})); ring.rotation.x=Math.PI/2; ring.position.y=1.5; product.add(ring);
    scene.add(product);
    document.getElementById('studio3d-object-label').textContent='زجاجة تجريبية';
  }
  function disposeTree(root) { root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.dispose();}}); }
  function resize() {
    if(!renderer || !stage.clientWidth) return;
    const w=stage.clientWidth,h=stage.clientHeight || 390;
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
  }
  function animate() {
    raf=requestAnimationFrame(animate);
    const elapsed=playing?(performance.now()-startAt)/1000:0;
    if(playing && motion) {
      const t=Math.min(1,elapsed/duration);
      const eased=t*t*(3-2*t);
      applyMotion(eased,t);
      document.getElementById('studio3d-progress').style.width=(t*100)+'%';
      document.getElementById('studio3d-run-label').textContent='يعمل '+elapsed.toFixed(1)+'s';
      if(t>=1){playing=false;document.getElementById('studio3d-play').textContent='▶ تشغيل الحركة';document.getElementById('studio3d-run-label').textContent='اكتملت';setStatus('اكتملت الحركة. يمكنك تعديل القيم أو تصدير المشهد والبيانات.');}
    }
    controls?.update();renderer?.render(scene,camera);
  }
  function applyMotion(eased,t) {
    const root=importedRoot || product;
    if(!root)return;
    const d=Number(motion?.rotation_degrees || 180)*Math.PI/180;
    const type=motion?.type || 'rotate';
    root.rotation.y=d*eased;
    if(type==='float') root.position.y=Math.sin(eased*Math.PI)*.55;
    else root.position.y=0;
    if(type==='orbit' || type==='product') {
      const a=eased*Math.PI*.65, radius=type==='product'?6.5:7.5;
      camera.position.set(Math.sin(a)*radius,3.0,Math.cos(a)*radius);
      if(type==='product') camera.position.multiplyScalar(1-.18*eased);
      camera.lookAt(0,1.1,0);
    }
  }
  function resetMotion() {
    playing=false;motion=null;
    const root=importedRoot || product;if(root){root.rotation.set(0,0,0);root.position.y=0;}
    if(camera){camera.position.set(4.4,3.1,6.5);controls.target.set(0,1,0);controls.update();}
    document.getElementById('studio3d-progress').style.width='0%';
    document.getElementById('studio3d-run-label').textContent='جاهز';
    document.getElementById('studio3d-play').textContent='▶ تشغيل الحركة';
  }
  function buildMotion() {
    const prompt=document.getElementById('studio3d-prompt').value.trim();
    duration=Math.max(1,Math.min(60,Number(document.getElementById('studio3d-duration').value)||3));
    const type=document.getElementById('studio3d-motion').value;
    const degrees=Math.max(-720,Math.min(720,Number(document.getElementById('studio3d-degrees').value)||180));
    const spec={schema_version:'1.0',engine:'three.js',source_prompt:prompt,duration_seconds:duration,fps:24,easing:'smoothstep',subject:importedRoot?'imported_model':'demo_bottle',actions:[],constraints:['preserve_mesh_geometry','no_unintended_scale_changes','camera_motion_is_independent_of_subject_rotation']};
    if(type==='rotate'||type==='product') spec.actions.push({start_seconds:0,end_seconds:type==='product'?duration*.66:duration,target:'subject',property:'rotation_y_degrees',from:0,to:degrees,easing:'ease_in_out'});
    if(type==='orbit'||type==='product') spec.actions.push({start_seconds:type==='product'?duration*.45:0,end_seconds:duration,target:'camera',property:'orbit_around_subject',direction:'clockwise',easing:'ease_in_out'});
    if(type==='float') spec.actions.push({start_seconds:0,end_seconds:duration,target:'subject',property:'position_y',from:0,to:.55,curve:'sine_wave'});
    if(prompt) spec.interpretation_note='This first-pass planner uses selected motion controls and does not infer every instruction in the natural-language prompt.';
    motion={type,rotation_degrees:degrees,spec};
    specNode.textContent=JSON.stringify(spec,null,2);
    setStatus('تم إنشاء مخطط أولي. راجع البيانات؛ النص الحر محفوظ، أما نوع الحركة وزاويتها ومدتها فتم أخذها من عناصر التحكم.');
    document.getElementById('studio3d-progress').style.width='0%';
  }
  document.getElementById('studio3d-build').addEventListener('click',buildMotion);
  document.getElementById('studio3d-play').addEventListener('click',()=>{
    if(!renderer)initScene();
    if(!motion)buildMotion();
    resetMotion();buildMotion();playing=true;startAt=performance.now();document.getElementById('studio3d-play').textContent='⏵ تشغيل...';setStatus('تعمل المعاينة وفق مخطط الحركة الحالي.');
  });
  document.getElementById('studio3d-reset').addEventListener('click',()=>{resetMotion();setStatus('تمت إعادة ضبط المشهد.');});
  document.getElementById('studio3d-file').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(!renderer)initScene();
    if(file.size>100*1024*1024){setStatus('حجم الملف أكبر من 100MB. اختر ملفًا أصغر لتجنب تجمد المتصفح.');e.target.value='';return;}
    setStatus('جارٍ تحميل المجسم...');
    try {
      let url;
      if(file.name.toLowerCase().endsWith('.gltf')){url=URL.createObjectURL(file);setStatus('ملفات GLTF ذات الخامات الخارجية قد لا تظهر كاملة. استخدم GLB مدمجًا إن أمكن.');}
      else url=URL.createObjectURL(file);
      const gltf=await new GLTFLoader().loadAsync(url);
      if(importedRoot){scene.remove(importedRoot);disposeTree(importedRoot);}
      if(product){scene.remove(product);disposeTree(product);product=null;}
      importedRoot=gltf.scene;
      const box=new THREE.Box3().setFromObject(importedRoot), size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3());
      importedRoot.position.sub(center);
      const maxDim=Math.max(size.x,size.y,size.z)||1;importedRoot.scale.multiplyScalar(3/maxDim);importedRoot.position.y=1;
      scene.add(importedRoot);
      controls.target.set(0,1,0);controls.update();
      document.getElementById('studio3d-object-label').textContent=file.name;
      setStatus('تم تحميل المجسم بنجاح. ملاحظة: ملفات GLTF التي تعتمد على ملفات خارجية قد تحتاج إلى تحويلها إلى GLB.');
      URL.revokeObjectURL(url);
    } catch(err) {setStatus('تعذر تحميل الملف: '+(err?.message||'صيغة غير مدعومة'));} 
  });
  document.getElementById('studio3d-export-spec').addEventListener('click',()=>{
    if(!motion)buildMotion();
    const blob=new Blob([JSON.stringify(motion.spec,null,2)],{type:'application/json'});
    downloadBlob(blob,'content-factory-motion.json');
  });
  document.getElementById('studio3d-export').addEventListener('click',()=>{
    if(!renderer)initScene();
    setStatus('جارٍ تجهيز ملف GLB...');
    new GLTFExporter().parse(importedRoot||product,result=>{
      const blob=result instanceof ArrayBuffer?new Blob([result],{type:'model/gltf-binary'}):new Blob([JSON.stringify(result)],{type:'model/gltf+json'});
      downloadBlob(blob,'content-factory-scene.glb');
      setStatus('تم تصدير المجسم والخامات المدعومة. بيانات الحركة تُنزّل بشكل منفصل من زر JSON.');
    },err=>setStatus('تعذر التصدير: '+(err?.message||'حدث خطأ')), {binary:true,onlyVisible:true});
  });
  function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
})();
