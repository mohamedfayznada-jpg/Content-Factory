import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

(() => {
  const $ = id => document.getElementById(id);
  if ($('page-3d-studio')) return;
  const style=document.createElement('style');
  style.textContent=`
  .studio3d-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,1fr);gap:16px}
  .studio3d-stage{position:relative;height:490px;min-height:350px;border-radius:16px;overflow:hidden;background:#17151d;border:1px solid #49303a}
  .studio3d-stage canvas{display:block;width:100%;height:100%}
  .studio3d-hud{position:absolute;top:12px;left:12px;display:flex;gap:6px;flex-wrap:wrap;z-index:2}
  .studio3d-hud span{background:#1a0f12dd;color:#f9e6d1;border:1px solid #f5c45144;padding:5px 8px;border-radius:20px;font-size:11px}
  .studio3d-timeline{height:8px;background:#eee4df;border-radius:8px;overflow:hidden;margin:12px 0}.studio3d-timeline>div{height:100%;width:0;background:linear-gradient(90deg,#881e3f,#f5c451)}
  .studio3d-field{display:grid;gap:6px;margin:11px 0}.studio3d-field label{font-weight:800;font-size:12px}
  .studio3d-field textarea,.studio3d-field input,.studio3d-field select{width:100%;border:1px solid #ded3cc;border-radius:10px;padding:10px;background:#fffdfb;font:inherit;box-sizing:border-box}
  .studio3d-field textarea{min-height:78px}.studio3d-note,.studio3d-status{font-size:12px;line-height:1.8;color:#6f7785}
  .studio3d-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.studio3d-actions .btn{flex:1}
  .studio3d-object-list{display:grid;gap:6px;margin:10px 0}.studio3d-object-item{display:flex;align-items:center;gap:7px;padding:8px;border:1px solid #e8ded7;border-radius:10px;background:#fffaf6}.studio3d-object-item.active{border-color:#881e3f;background:#fbeef1}.studio3d-object-item button{border:0;border-radius:8px;padding:6px 9px;cursor:pointer}.studio3d-object-item .pick{flex:1;text-align:right;background:transparent}.studio3d-object-item .remove{background:#fbe3e7;color:#881e3f}
  .studio3d-spec{direction:ltr;text-align:left;white-space:pre-wrap;overflow:auto;max-height:230px;background:#1a0f12;color:#f9e6d1;border-radius:10px;padding:12px;font:12px/1.6 ui-monospace,monospace}
  @media(max-width:850px){.studio3d-grid{grid-template-columns:1fr}.studio3d-stage{height:350px}}
  `;
  document.head.appendChild(style);
  const nav=document.querySelector('.brand-nav'),main=document.querySelector('.app-main');
  if(!nav||!main)return;
  const navButton=document.createElement('button');navButton.dataset.page='3d-studio';navButton.innerHTML='<span>⬡</span><b class="nav-label">3D والتحريك</b>';
  const after=nav.querySelector('[data-page="image-studio"]');after?after.insertAdjacentElement('afterend',navButton):nav.append(navButton);
  const page=document.createElement('div');page.id='page-3d-studio';page.className='page-view';
  page.innerHTML=`
  <section class="hero"><small>MF CREATIVE STUDIO / 3D WORKSPACE</small><h1>ابنِ بيئة <em>ثلاثية الأبعاد</em></h1><p>أنشئ أشكالًا ثلاثية الأبعاد محليًا، اجمع أكثر من جسم في مشهد واحد، واكتب حركة مستقلة لكل جسم. لا يحتاج إنشاء الأشكال الأساسية إلى API مدفوع.</p></section>
  <div class="studio3d-grid"><div>
   <section class="card"><div class="head"><h2>المشهد ثلاثي الأبعاد</h2><span class="pill">Three.js · WebGL</span></div>
    <div class="studio3d-stage" id="studio3d-stage"><div class="studio3d-hud"><span id="studio3d-count">0 أجسام</span><span id="studio3d-state">جاهز</span></div></div>
    <div class="studio3d-timeline"><div id="studio3d-progress"></div></div>
    <div class="studio3d-actions"><button class="btn primary" id="studio3d-play">▶ تشغيل كل الحركات</button><button class="btn" id="studio3d-stop">إيقاف</button><button class="btn" id="studio3d-home">إظهار المشهد كاملًا</button></div>
    <p class="studio3d-status" id="studio3d-status" role="status">حمّل المشهد أو أضف جسمًا من لوحة إنشاء الأجسام. اسحب بالماوس للدوران، واستخدم عجلة الماوس للتقريب.</p>
   </section>
   <section class="card"><div class="head"><h2>الأجسام داخل المشهد</h2><span class="pill" id="studio3d-selected-label">لا يوجد تحديد</span></div><div id="studio3d-objects" class="studio3d-object-list"></div>
    <div class="studio3d-actions"><button class="btn" id="studio3d-duplicate">نسخ الجسم المحدد</button><button class="btn" id="studio3d-delete">حذف المحدد</button></div>
   </section>
   <section class="card"><div class="head"><h2>استيراد وتصدير</h2></div><div class="studio3d-field"><label for="studio3d-file">استيراد جسم GLB / GLTF</label><input id="studio3d-file" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json"></div>
    <p class="studio3d-note">لأفضل توافق استخدم GLB مدمجًا. ملفات GLTF التي تعتمد على صور أو ملفات خارجية قد لا تعمل عند اختيار ملف واحد فقط.</p>
    <div class="studio3d-actions"><button class="btn" id="studio3d-export">تصدير المشهد GLB</button><button class="btn" id="studio3d-export-json">تصدير الحركات JSON</button></div>
   </section>
  </div><div>
   <section class="card"><div class="head"><h2>إنشاء جسم جديد</h2></div>
    <div class="studio3d-field"><label for="studio3d-object-prompt">وصف الجسم</label><textarea id="studio3d-object-prompt" placeholder="مثال: زجاجة طويلة زرقاء، كرة ذهبية، صندوق أحمر">زجاجة مياه زرقاء</textarea></div>
    <div class="studio3d-field"><label for="studio3d-shape">نوع الشكل الأساسي</label><select id="studio3d-shape"><option value="auto">استنتاج من الوصف</option><option value="bottle">زجاجة</option><option value="sphere">كرة</option><option value="box">صندوق</option><option value="cone">مخروط</option><option value="cylinder">أسطوانة</option><option value="torus">حلقة</option><option value="capsule">كبسولة</option></select></div>
    <div class="studio3d-field"><label for="studio3d-color">اللون</label><input id="studio3d-color" type="color" value="#48b9d0"></div>
    <div class="studio3d-actions"><button class="btn primary" id="studio3d-create">＋ توليد وإضافة الجسم</button><button class="btn" id="studio3d-add-demo">إضافة مثال جاهز</button></div>
    <p class="studio3d-note">التوليد الحالي ينشئ مجسمات إجرائية من الوصف واللون داخل المتصفح؛ ليس تحويلًا بالذكاء الاصطناعي من صورة إلى Mesh واقعي.</p>
   </section>
   <section class="card"><div class="head"><h2>حركة الجسم المحدد</h2></div><p class="studio3d-note">اختَر جسمًا من قائمة المشهد، ثم عيّن وصف الحركة الخاص به. كل جسم يحتفظ بحركته المستقلة.</p>
    <div class="studio3d-field"><label for="studio3d-motion-prompt">وصف الحركة</label><textarea id="studio3d-motion-prompt" placeholder="مثال: لف الجسم 360 درجة خلال 4 ثوانٍ">لف الجسم 180 درجة خلال 3 ثوانٍ</textarea></div>
    <div class="studio3d-field"><label for="studio3d-motion-type">نوع الحركة</label><select id="studio3d-motion-type"><option value="rotate">دوران الجسم</option><option value="float">طفو لأعلى وأسفل</option><option value="orbit">دوران في مسار دائري</option><option value="move">تحرك من مكانه</option><option value="pulse">تكبير وتصغير</option></select></div>
    <div class="studio3d-field"><label for="studio3d-motion-duration">المدة بالثواني</label><input id="studio3d-motion-duration" type="number" min="0.5" max="60" step="0.5" value="3"></div>
    <div class="studio3d-field"><label for="studio3d-motion-degrees">زاوية الدوران (درجة)</label><input id="studio3d-motion-degrees" type="number" min="-1440" max="1440" step="15" value="180"></div>
    <div class="studio3d-actions"><button class="btn primary" id="studio3d-save-motion">حفظ حركة الجسم</button><button class="btn" id="studio3d-clear-motion">مسح الحركة</button></div>
    <div class="studio3d-note" id="studio3d-motion-status">لا توجد حركة محفوظة للجسم المحدد.</div>
   </section>
   <section class="card"><div class="head"><h2>ملخص المشهد</h2></div><pre class="studio3d-spec" id="studio3d-spec">أضف جسمًا لإنشاء مخطط المشهد.</pre></section>
  </div></div>`;
  main.appendChild(page);
  const sceneTitle=$('page-title');
  function openPage(){document.querySelectorAll('.page-view').forEach(p=>p.classList.toggle('active',p===page));document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b===navButton));if(sceneTitle)sceneTitle.textContent='3D والتحريك';if(!renderer)initScene();resize();window.scrollTo({top:0,behavior:'smooth'});}
  navButton.addEventListener('click',openPage);
  document.addEventListener('click',e=>{if(e.target.closest('[data-go="3d-studio"]'))openPage();});

  let renderer,scene,camera,controls,raf=0,playing=false,startAt=0,duration=3,selectedId=null,objects=[],nextId=1;
  const clock=new THREE.Clock();
  const status=t=>{$('studio3d-status').textContent=t;};
  const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.32,metalness:.18});
  function initScene(){
    if(renderer)return;
    scene=new THREE.Scene();scene.background=new THREE.Color('#17151d');
    camera=new THREE.PerspectiveCamera(45,1,.1,500);camera.position.set(7,5.5,9);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    $('studio3d-stage').appendChild(renderer.domElement);
    controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.target.set(0,1,0);controls.minDistance=2;controls.maxDistance=60;
    scene.add(new THREE.HemisphereLight(0xffffff,0x353044,2.1));
    const key=new THREE.DirectionalLight(0xffe0b2,3.2);key.position.set(5,9,6);scene.add(key);
    const rim=new THREE.DirectionalLight(0x8c7bff,2);rim.position.set(-5,5,-6);scene.add(rim);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#29252f',roughness:.82}));floor.rotation.x=-Math.PI/2;floor.position.y=-.035;scene.add(floor);
    const grid=new THREE.GridHelper(30,30,'#675765','#39333f');grid.position.y=-.02;scene.add(grid);
    resize();window.addEventListener('resize',resize);animate();
  }
  function resize(){if(!renderer)return;const el=$('studio3d-stage');const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
  function createGeometry(shape,color){
    const material=mat(color);
    const group=new THREE.Group();
    if(shape==='auto')shape='sphere';
    if(shape==='bottle'){
      const glass=new THREE.MeshPhysicalMaterial({color,roughness:.2,metalness:.1,clearcoat:1,transmission:.05});
      const body=new THREE.Mesh(new THREE.CylinderGeometry(.48,.42,1.65,40),glass);body.position.y=.95;group.add(body);
      const shoulder=new THREE.Mesh(new THREE.SphereGeometry(.42,32,16),glass);shoulder.scale.y=.42;shoulder.position.y=1.78;group.add(shoulder);
      const neck=new THREE.Mesh(new THREE.CylinderGeometry(.17,.2,.28,32),glass);neck.position.y=2.03;group.add(neck);
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.22,32),mat('#f5c451'));cap.position.y=2.28;group.add(cap);
    } else {
      let mesh;
      if(shape==='sphere')mesh=new THREE.Mesh(new THREE.SphereGeometry(.72,40,28),material);
      else if(shape==='box')mesh=new THREE.Mesh(new THREE.BoxGeometry(1.25,1.25,1.25),material);
      else if(shape==='cone')mesh=new THREE.Mesh(new THREE.ConeGeometry(.72,1.6,40),material);
      else if(shape==='cylinder')mesh=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,1.5,40),material);
      else if(shape==='torus')mesh=new THREE.Mesh(new THREE.TorusGeometry(.62,.22,18,48),material);
      else if(shape==='capsule')mesh=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.8,8,24),material);
      else mesh=new THREE.Mesh(new THREE.SphereGeometry(.72,40,28),material);
      mesh.position.y=shape==='torus'?.85:(shape==='box'?.7:(shape==='cone'?.8:(shape==='cylinder'?.75:(shape==='capsule'?.85:.72))));group.add(mesh);
    }
    return group;
  }
  function inferShape(text,chosen){
    if(chosen!=='auto')return chosen;
    const p=text.toLowerCase();
    if(/زجاجة|قارورة|bottle|water/.test(p))return 'bottle';
    if(/صندوق|مكعب|box|cube/.test(p))return 'box';
    if(/مخروط|cone/.test(p))return 'cone';
    if(/اسطوانة|أسطوانة|cylinder/.test(p))return 'cylinder';
    if(/حلقة|دونات|torus|ring|donut/.test(p))return 'torus';
    if(/كبسولة|capsule/.test(p))return 'capsule';
    return 'sphere';
  }
  function addObject({name,shape='sphere',color='#48b9d0',x=0,z=0,root=null}={}){
    if(objects.length>=30){status('الحد الأقصى 30 جسمًا في المشهد.');return null;}
    const id=nextId++,objectRoot=root||createGeometry(shape,color);
    objectRoot.position.set(x,0,z);objectRoot.userData.objectId=id;scene.add(objectRoot);
    const item={id,name:name||('جسم '+id),shape,color,root:objectRoot,motion:{type:'rotate',duration:3,degrees:180,prompt:'لف الجسم 180 درجة خلال 3 ثوانٍ'}};
    objects.push(item);selectedId=id;renderObjectList();loadSelected();updateSpec();focusObject(item);return item;
  }
  function focusObject(item){if(!item||!camera)return;controls.target.set(item.root.position.x,1,item.root.position.z);controls.update();}
  function dispose(root){root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))m.dispose();});}
  function renderObjectList(){
    const host=$('studio3d-objects');host.innerHTML='';
    objects.forEach(item=>{
      const row=document.createElement('div');row.className='studio3d-object-item'+(item.id===selectedId?' active':'');
      const pick=document.createElement('button');pick.className='pick';pick.textContent=item.name+' · '+item.shape;pick.onclick=()=>{selectedId=item.id;renderObjectList();loadSelected();focusObject(item);};
      const del=document.createElement('button');del.className='remove';del.textContent='×';del.title='حذف الجسم';del.onclick=()=>removeObject(item.id);
      row.append(pick,del);host.appendChild(row);
    });
    $('studio3d-count').textContent=objects.length+' أجسام';const item=objects.find(o=>o.id===selectedId);$('studio3d-selected-label').textContent=item?item.name:'لا يوجد تحديد';
  }
  function removeObject(id){const item=objects.find(o=>o.id===id);if(!item)return;scene.remove(item.root);dispose(item.root);objects=objects.filter(o=>o.id!==id);selectedId=objects[0]?.id??null;renderObjectList();loadSelected();updateSpec();}
  function loadSelected(){
    const item=objects.find(o=>o.id===selectedId),enabled=!!item;
    ['studio3d-motion-prompt','studio3d-motion-type','studio3d-motion-duration','studio3d-motion-degrees','studio3d-save-motion','studio3d-clear-motion','studio3d-duplicate','studio3d-delete'].forEach(id=>$(id).disabled=!enabled);
    if(!item){$('studio3d-motion-status').textContent='أضف أو اختَر جسمًا أولًا.';return;}
    $('studio3d-motion-prompt').value=item.motion.prompt||'';$('studio3d-motion-type').value=item.motion.type;$('studio3d-motion-duration').value=item.motion.duration;$('studio3d-motion-degrees').value=item.motion.degrees;
    $('studio3d-motion-status').textContent='الحركة المحفوظة: '+item.motion.type+' · '+item.motion.duration+' ث';
  }
  function saveSelectedMotion(){
    const item=objects.find(o=>o.id===selectedId);if(!item)return;
    const prompt=$('studio3d-motion-prompt').value.trim(),p=prompt.toLowerCase();
    let type=$('studio3d-motion-type').value,duration=Math.max(.5,Math.min(60,Number($('studio3d-motion-duration').value)||3)),degrees=Math.max(-1440,Math.min(1440,Number($('studio3d-motion-degrees').value)||180));
    const tm=p.match(/(\d+(?:[.,]\d+)?)\s*(?:ثانية|ثواني|ثانيه|second|seconds|sec)/i);if(tm)duration=Math.max(.5,Math.min(60,Number(tm[1].replace(',','.'))));
    const dm=p.match(/(-?\d{1,4})\s*(?:درجة|درجات|degrees?)/i);if(dm)degrees=Math.max(-1440,Math.min(1440,Number(dm[1])));
    if(/طفو|يطفو|يرتفع|ينخفض|float|hover/.test(p))type='float';
    else if(/مدار|دائرة|orbit|circle/.test(p))type='orbit';
    else if(/تحرك|انتقل|move|slide/.test(p))type='move';
    else if(/نبض|تكبير وتصغير|pulse|scale/.test(p))type='pulse';
    else if(/لف|دوران|rotate|spin|turn/.test(p))type='rotate';
    item.motion={type,duration,degrees,prompt:prompt||type};
    $('studio3d-motion-type').value=type;$('studio3d-motion-duration').value=duration;$('studio3d-motion-degrees').value=degrees;
    $('studio3d-motion-status').textContent='تم حفظ الحركة لهذا الجسم فقط.';updateSpec();status('حُفظت حركة '+item.name+'. اضغط تشغيل لمعاينة كل حركات المشهد.');
  }
  function applySceneTime(seconds){
    for(const item of objects){
      const m=item.motion||{},t=Math.min(1,seconds/Math.max(.1,m.duration||3)),ease=t*t*(3-2*t),root=item.root;
      root.rotation.set(0,0,0);root.position.x=item.baseX??root.position.x;root.position.z=item.baseZ??root.position.z;root.scale.setScalar(1);
      if(m.type==='rotate')root.rotation.y=(Number(m.degrees)||180)*Math.PI/180*ease;
      if(m.type==='float')root.position.y=Math.sin(t*Math.PI*2)*.35;
      if(m.type==='orbit'){const a=ease*Math.PI*2;root.position.x=(item.baseX||0)+Math.cos(a)*1.2;root.position.z=(item.baseZ||0)+Math.sin(a)*1.2;root.rotation.y=a;}
      if(m.type==='move')root.position.x=(item.baseX||0)+Math.sin(ease*Math.PI)*2;
      if(m.type==='pulse')root.scale.setScalar(1+.25*Math.sin(t*Math.PI*4));
    }
  }
  function animate(){
    raf=requestAnimationFrame(animate);
    if(playing){
      const elapsed=(performance.now()-startAt)/1000;applySceneTime(elapsed);
      $('studio3d-progress').style.width=(Math.min(1,elapsed/duration)*100)+'%';$('studio3d-state').textContent=elapsed.toFixed(1)+' / '+duration+'s';
      if(elapsed>=duration){playing=false;$('studio3d-state').textContent='اكتملت الحركة';status('اكتملت حركات المشهد.');}
    }
    controls?.update();renderer?.render(scene,camera);
  }
  function updateSpec(){
    const spec={schema_version:'1.1',engine:'three.js',scene:{object_count:objects.length,objects:objects.map(o=>({id:o.id,name:o.name,shape:o.shape,color:o.color,position:{x:Number(o.root.position.x.toFixed(3)),y:Number(o.root.position.y.toFixed(3)),z:Number(o.root.position.z.toFixed(3))},motion:o.motion}))}};
    $('studio3d-spec').textContent=JSON.stringify(spec,null,2);
  }
  $('studio3d-create').addEventListener('click',()=>{
    if(!renderer)initScene();const prompt=$('studio3d-object-prompt').value.trim()||'جسم جديد',shape=inferShape(prompt,$('studio3d-shape').value),color=$('studio3d-color').value;
    const item=addObject({name:prompt.slice(0,32),shape,color,x:(objects.length%4-1.5)*2,z:Math.floor(objects.length/4)*2});
    if(item)status('تم إنشاء '+item.name+' داخل المشهد. اختر الجسم لتخصيص حركته.');
  });
  $('studio3d-add-demo').addEventListener('click',()=>{if(!renderer)initScene();const i=objects.length;addObject({name:'كرة ذهبية '+(i+1),shape:'sphere',color:'#f5c451',x:(i%4-1.5)*2,z:Math.floor(i/4)*2});status('تمت إضافة جسم تجريبي جديد.');});
  $('studio3d-save-motion').addEventListener('click',saveSelectedMotion);
  $('studio3d-clear-motion').addEventListener('click',()=>{const item=objects.find(o=>o.id===selectedId);if(!item)return;item.motion={type:'rotate',duration:3,degrees:0,prompt:'بدون حركة'};$('studio3d-motion-degrees').value=0;updateSpec();loadSelected();status('تمت إزالة الحركة الفعلية للجسم.');});
  $('studio3d-duplicate').addEventListener('click',()=>{const item=objects.find(o=>o.id===selectedId);if(!item)return;const clone=item.root.clone(true);clone.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();if(o.material)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}});addObject({name:item.name+' نسخة',shape:item.shape,color:item.color,x:item.root.position.x+1.5,z:item.root.position.z+1.5,root:clone});});
  $('studio3d-delete').addEventListener('click',()=>removeObject(selectedId));
  $('studio3d-play').addEventListener('click',()=>{if(!renderer)initScene();if(!objects.length){status('أضف جسمًا واحدًا على الأقل أولًا.');return;}objects.forEach(o=>{o.baseX=o.root.position.x;o.baseZ=o.root.position.z;});duration=Math.max(...objects.map(o=>Number(o.motion.duration)||3),1);playing=true;startAt=performance.now();$('studio3d-state').textContent='يعمل';status('تشغيل الحركات المستقلة لكل الأجسام.');});
  $('studio3d-stop').addEventListener('click',()=>{playing=false;objects.forEach(o=>{o.root.rotation.set(0,0,0);o.root.position.y=0;o.root.scale.setScalar(1);if(o.baseX!==undefined)o.root.position.x=o.baseX;if(o.baseZ!==undefined)o.root.position.z=o.baseZ;});$('studio3d-state').textContent='متوقف';});
  $('studio3d-home').addEventListener('click',()=>{if(!renderer)initScene();if(!objects.length){controls.target.set(0,1,0);camera.position.set(7,5.5,9);}else{const box=new THREE.Box3();objects.forEach(o=>box.expandByObject(o.root));const center=box.getCenter(new THREE.Vector3());controls.target.copy(center);camera.position.set(center.x+7,center.y+5,center.z+9);}controls.update();});
  $('studio3d-file').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;if(!renderer)initScene();
    if(file.size>100*1024*1024){status('حجم الملف أكبر من 100MB.');e.target.value='';return;}
    const url=URL.createObjectURL(file);status('جارٍ تحميل المجسم...');
    try{const gltf=await new GLTFLoader().loadAsync(url),root=gltf.scene;const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());root.position.sub(center);const scale=2.5/(Math.max(size.x,size.y,size.z)||1);root.scale.multiplyScalar(scale);addObject({name:file.name,shape:'imported',color:'#b0b0b0',x:(objects.length%4-1.5)*2,z:Math.floor(objects.length/4)*2,root});status('تم استيراد المجسم كجسم مستقل.');}
    catch(err){status('تعذر تحميل الملف. جرّب GLB مدمجًا. '+(err?.message||''));}finally{URL.revokeObjectURL(url);e.target.value='';}
  });
  $('studio3d-export-json').addEventListener('click',()=>{updateSpec();download(new Blob([JSON.stringify(JSON.parse($('studio3d-spec').textContent),null,2)],{type:'application/json'}),'content-factory-scene.json');});
  $('studio3d-export').addEventListener('click',()=>{if(!renderer)initScene();if(!objects.length){status('أضف أجسامًا قبل التصدير.');return;}status('جارٍ تصدير المشهد...');new GLTFExporter().parse(scene,result=>{const blob=result instanceof ArrayBuffer?new Blob([result],{type:'model/gltf-binary'}):new Blob([JSON.stringify(result)],{type:'model/gltf+json'});download(blob,'content-factory-scene.glb');status('تم تصدير المشهد. الحركات تُحفظ في ملف JSON منفصل.');},err=>status('فشل التصدير: '+(err?.message||'خطأ غير معروف')),{binary:true,onlyVisible:true});});
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);}
  // Start with a visible object so the first visit is never an empty preview.
  initScene();addObject({name:'زجاجة تجريبية',shape:'bottle',color:'#48b9d0',x:0,z:0});addObject({name:'كرة ذهبية',shape:'sphere',color:'#f5c451',x:2.2,z:0});selectedId=objects[0].id;renderObjectList();loadSelected();updateSpec();
})();