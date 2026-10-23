(() => {
  const SUPABASE_URL = "https://qkkkxplviswvtlaazpin.supabase.co";
  const SUPABASE_KEY = "sb_publishable_OtTgAIM-HnBZYUDLCOBvQg_Rhgl4Iv6";
  const $ = id => document.getElementById(id);
  let client, user = null, restoring = false, syncTimer;
  const oldSetItem = Storage.prototype.setItem;
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  function status(text) { const el = $("cloud-status"); if (el) el.textContent = text; }
  function uuid() { return crypto.randomUUID(); }
  function normalizeProject(p) {
    if (!p.cloudId) p.cloudId = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(p.id || "") ? p.id : uuid();
    return p;
  }
  function addAuthCard() {
    const host = document.querySelector(".top");
    if (!host || $("cloud-auth")) return;
    const card = document.createElement("section");
    card.id = "cloud-auth"; card.className = "card"; card.style.marginBottom = "16px";
    card.innerHTML = '<div class="head"><h3>☁️ الذاكرة السحابية</h3><span id="cloud-status" class="status">جاري الاتصال...</span></div><p class="muted">سجّل دخولك عشان مشاريعك وتفضيلاتك تفضل معاك من أي جهاز.</p><div class="grid"><div class="field"><label>البريد الإلكتروني</label><input id="cloud-email" type="email" autocomplete="email" placeholder="you@example.com"></div><div class="field"><label>كلمة المرور</label><input id="cloud-password" type="password" autocomplete="current-password" minlength="6" placeholder="6 أحرف على الأقل"></div></div><div class="actions"><button class="btn primary" id="cloud-login">تسجيل الدخول</button><button class="btn" id="cloud-signup">إنشاء حساب مجاني</button><button class="btn" id="cloud-logout" hidden>تسجيل الخروج</button></div><p id="cloud-message" class="muted" aria-live="polite"></p>';
    host.insertAdjacentElement("afterend", card);
    $("cloud-login").onclick = () => auth("login");
    $("cloud-signup").onclick = () => auth("signup");
    $("cloud-logout").onclick = async () => { await client.auth.signOut(); user = null; status("تم تسجيل الخروج"); $("cloud-logout").hidden = true; $("cloud-login").hidden = false; $("cloud-signup").hidden = false; };
  }
  async function auth(mode) {
    const email = $("cloud-email").value.trim(), password = $("cloud-password").value;
    if (!email || password.length < 6) { $("cloud-message").textContent = "اكتب بريدًا صحيحًا وكلمة مرور من 6 أحرف على الأقل."; return; }
    $("cloud-message").textContent = "جاري التنفيذ...";
    const result = mode === "signup"
      ? await client.auth.signUp({ email, password })
      : await client.auth.signInWithPassword({ email, password });
    if (result.error) { $("cloud-message").textContent = result.error.message; return; }
    if (mode === "signup" && !result.data.session) {
      $("cloud-message").textContent = "الحساب اتعمل. افتح رسالة التأكيد في بريدك الإلكتروني، وبعدها سجّل الدخول.";
    } else {
      $("cloud-message").textContent = mode === "signup" ? "تم إنشاء الحساب." : "تم تسجيل الدخول.";
      if (result.data.user) await onUser(result.data.user);
    }
  }
  async function cloudRead() {
    const [pr, pf, fb] = await Promise.all([
      client.from("projects").select("*").order("updated_at", { ascending: false }),
      client.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      client.from("style_feedback").select("*").order("created_at", { ascending: true })
    ]);
    for (const r of [pr, pf, fb]) if (r.error) throw r.error;
    return { projects: pr.data || [], profile: pf.data, feedback: fb.data || [] };
  }
  async function cloudWrite() {
    if (!user || restoring) return;
    const ps = read("cf_v3_projects", []).map(normalizeProject);
    oldSetItem.call(localStorage, "cf_v3_projects", JSON.stringify(ps));
    const profile = read("cf_v3_profile", { voice: "مصري طبيعي وبسيط", audience: "", instructions: "", avoid: "", feedback: [] });
    const rows = ps.map(p => ({
      id: p.cloudId, user_id: user.id, name: p.name || "مشروع بدون اسم", platform: p.platform || "Instagram",
      kind: ["written","image","video"].includes(p.kind) ? p.kind : "written", topic: p.topic || "",
      tone: p.tone || "مصري طبيعي وبسيط", goal: p.goal || "زيادة التفاعل", ideas: p.ideas || [],
      selected_idea: p.selectedIdea || "", prompts: p.prompts || null, updated_at: new Date().toISOString()
    }));
    if (rows.length) { const up = await client.from("projects").upsert(rows); if (up.error) throw up.error; }
    const ids = rows.map(x => x.id);
    let existing = await client.from("projects").select("id");
    if (existing.error) throw existing.error;
    const obsolete = (existing.data || []).map(x => x.id).filter(id => !ids.includes(id));
    if (obsolete.length) { const del = await client.from("projects").delete().in("id", obsolete); if (del.error) throw del.error; }
    const saveProfile = await client.from("profiles").upsert({
      id: user.id, voice: profile.voice || "", audience: profile.audience || "",
      instructions: profile.instructions || "", avoid: profile.avoid || "", updated_at: new Date().toISOString()
    });
    if (saveProfile.error) throw saveProfile.error;
    const clear = await client.from("style_feedback").delete().eq("user_id", user.id);
    if (clear.error) throw clear.error;
    const feedback = (profile.feedback || []).map(f => ({
      user_id: user.id, kind: ["approved","positive","negative","revision"].includes(f.kind) ? f.kind : "revision",
      content: String(f.content || "").slice(0, 4000), note: String(f.note || "").slice(0, 2000),
      project_id: null, created_at: f.at || new Date().toISOString()
    }));
    if (feedback.length) { const ins = await client.from("style_feedback").insert(feedback); if (ins.error) throw ins.error; }
    status("متزامنة ✓");
  }
  function scheduleSync() {
    if (!user || restoring) return;
    status("جاري حفظ التغييرات...");
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => cloudWrite().catch(e => { status("تعذّر الحفظ"); console.error("Cloud sync failed", e); $("cloud-message").textContent = "تعذر حفظ التغييرات على السحابة: " + e.message; }), 700);
  }
  async function onUser(nextUser) {
    user = nextUser; $("cloud-logout").hidden = false; $("cloud-login").hidden = true; $("cloud-signup").hidden = true;
    status("جاري تحميل الذاكرة...");
    try {
      const cloud = await cloudRead();
      restoring = true;
      if (cloud.projects.length) {
        const ps = cloud.projects.map(p => ({ id: p.id, cloudId: p.id, name: p.name, platform: p.platform, kind: p.kind, topic: p.topic, tone: p.tone, goal: p.goal, ideas: p.ideas || [], selectedIdea: p.selected_idea || "", prompts: p.prompts || null }));
        oldSetItem.call(localStorage, "cf_v3_projects", JSON.stringify(ps));
      } else {
        const local = read("cf_v3_projects", []);
        local.forEach(normalizeProject);
        oldSetItem.call(localStorage, "cf_v3_projects", JSON.stringify(local));
      }
      const localProfile = read("cf_v3_profile", { voice: "مصري طبيعي وبسيط", audience: "", instructions: "", avoid: "", feedback: [] });
      if (cloud.profile) {
        localProfile.voice = cloud.profile.voice || ""; localProfile.audience = cloud.profile.audience || "";
        localProfile.instructions = cloud.profile.instructions || ""; localProfile.avoid = cloud.profile.avoid || "";
        localProfile.feedback = cloud.feedback.map(f => ({ kind: f.kind, content: f.content, note: f.note, at: f.created_at }));
        oldSetItem.call(localStorage, "cf_v3_profile", JSON.stringify(localProfile));
      }
      restoring = false;
      if (typeof drawProjects === "function") drawProjects();
      if (typeof drawProfile === "function") drawProfile();
      status("متصلة ✓"); $("cloud-message").textContent = "أهلًا! الذاكرة السحابية جاهزة.";
      if (typeof currentId !== "undefined" && currentId && typeof open === "function") open(currentId);
      if (!cloud.projects.length || !cloud.profile) await cloudWrite();
    } catch (e) { restoring = false; status("مشكلة اتصال"); $("cloud-message").textContent = "تعذّر تحميل الذاكرة: " + e.message; console.error(e); }
  }
  Storage.prototype.setItem = function(key, value) {
    oldSetItem.call(this, key, value);
    if (this === localStorage && (key === "cf_v3_projects" || key === "cf_v3_profile")) scheduleSync();
  };
  function loadSdk() {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = async () => {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data } = await client.auth.getSession();
      addAuthCard();
      if (data.session) await onUser(data.session.user); else status("سجّل الدخول");
      client.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session && (!user || user.id !== session.user.id)) setTimeout(() => onUser(session.user), 0);
        if (event === "SIGNED_OUT") { user = null; status("سجّل الدخول"); }
      });
    };
    script.onerror = () => { addAuthCard(); status("تعذّر تحميل المكتبة"); $("cloud-message").textContent = "تحقق من الاتصال بالإنترنت ثم حدّث الصفحة."; };
    document.head.appendChild(script);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadSdk); else loadSdk();
})();