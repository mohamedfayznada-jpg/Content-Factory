module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({error:"Method not allowed"}); }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({error:"الذكاء الاصطناعي غير مفعّل. راجع GEMINI_API_KEY في Vercel."});
  const body = req.body || {};
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0,6000) : "";
  const refs = Array.isArray(body.references) ? body.references : [];
  if (prompt.length < 3) return res.status(400).json({error:"اكتب وصف الصورة أولًا."});
  if (refs.length > 0 && refs.some(x => !x || typeof x.data !== "string" || !/^data:image\/(png|jpeg|webp);base64,/i.test(x.data))) return res.status(400).json({error:"إحدى الصور المرجعية غير صالحة."});
  if (refs.some(x => x.data.length > 1200000)) return res.status(413).json({error:"حجم إحدى الصور المرجعية كبير. قلّل حجمها أو دقتها."});
  const parts = [{
    text: "أنت مهندس برومبتات صور وخبير إخراج بصري. حسّن وصف المستخدم لإنتاج صورة قوية، واعتبر الصور المرفقة مراجع بصرية. استخرج منها العناصر ذات الصلة مثل المنتج/الشخصية، الألوان، التكوين، الإضاءة، الخامات، زاوية الكاميرا والهوية البصرية. لا تفترض حقوقًا أو أسماء أشخاص، ولا تنسخ نصوصًا أو شعارات من المرجع إلا إذا طلب المستخدم ذلك صراحة. إذا تعارض المرجع مع طلب المستخدم فالأولوية للطلب. أخرج JSON صالحًا فقط بلا markdown بهذا الشكل: {\"enhanced_prompt\":string,\"negative_prompt\":string,\"visual_direction\":{\"subject\":string,\"composition\":string,\"lighting\":string,\"palette\":string,\"style\":string,\"camera\":string,\"details\":string[]},\"reference_usage\":[string],\"aspect_ratio\":string}. اجعل enhanced_prompt وصفًا نهائيًا مفصلًا باللغة الإنجليزية لأن مولّد الصور يستجيب له جيدًا، واحتفظ بأي نص مطلوب داخل الصورة كما حدده المستخدم. اكتب بقية JSON بالعربية عند الإمكان. نسبة الأبعاد: " + String(body.ratio || "1:1") + ". وصف المستخدم: " + prompt + ". عدد الصور المرجعية: " + refs.length + "."
  }];
  for (const ref of refs) {
    const match = ref.data.match(/^data:(image\/(?:png|jpeg|webp));base64,([\s\S]+)$/i);
    if (match) parts.push({inline_data:{mime_type:match[1],data:match[2]}});
  }
  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(key), {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:"أنت خبير محترف في صياغة برومبتات توليد الصور. افحص كل الصور المرجعية المرفقة بصريًا، وادمج ما يفيد منها في وصف نهائي واضح. لا تخترع تفاصيل غير مرئية. أعد JSON صالحًا فقط حسب المخطط المطلوب."}]},
        contents:[{role:"user",parts}],
        generationConfig:{temperature:0.45,maxOutputTokens:1800,responseMimeType:"application/json"}
      })
    });
    const data = await upstream.json().catch(()=>({}));
    if (!upstream.ok) return res.status(upstream.status === 429 ? 429 : 502).json({error:upstream.status === 429 ? "وصلت لحد استخدام الذكاء الاصطناعي حاليًا؛ جرّب لاحقًا." : "فشل تحسين البرومبت: " + (data.error?.message || "خطأ من المزوّد")});
    const text = (data.candidates || []).flatMap(c=>c.content?.parts || []).map(p=>p.text || "").join("\n").trim();
    let parsed;
    try { parsed = JSON.parse(text.replace(/^\s*```(?:json)?\s*/i,"").replace(/\s*```\s*$/,"")); }
    catch { return res.status(502).json({error:"الذكاء الاصطناعي رجّع JSON غير صالح. اضغط تحسين مرة أخرى."}); }
    if (!parsed || typeof parsed.enhanced_prompt !== "string") return res.status(502).json({error:"البرومبت المحسّن ناقص. جرّب مرة أخرى."});
    return res.status(200).json({items:parsed,model,provider:"Google Gemini",referencesAnalyzed:refs.length});
  } catch {
    return res.status(500).json({error:"حصل خطأ أثناء تحسين البرومبت. جرّب مرة أخرى."});
  }
};