// Vercel serverless function. Keep GEMINI_API_KEY in Vercel Environment Variables.
const ALLOWED_TYPES = new Set(["post", "video", "ideas", "plan", "project_ideas", "json_prompts"]);
const PLATFORM_GUIDANCE = {
  Instagram: "caption optimized for Instagram, readable line breaks, relevant hashtags, visual suggestion",
  Facebook: "conversational Facebook post with a clear opening and a natural engagement prompt",
  TikTok: "short vertical-video concept with a fast hook, beat-by-beat script, on-screen text and CTA",
  YouTube: "YouTube video/Short script with title, hook, structure and CTA",
  LinkedIn: "professional LinkedIn post with a useful insight and credible tone",
  X: "concise X post or thread with a strong first line"
};

function buildPrompt({ type, topic, platform, tone, goal, audience, language, projectType, selectedIdea, styleProfile }) {
  const typeNames = { post: "social post", video: "short-form video script", ideas: "a list of distinct content ideas", plan: "a practical 7-day content plan", project_ideas: "project-specific content idea generation", json_prompts: "structured JSON prompts for a selected idea" };
  return [
    "You are Content Factory, an expert social media strategist and AI-content producer.",
    "Return useful, specific, editable content. Avoid generic filler, fabricated facts, fake trend claims, guaranteed virality, and unsupported statistics.",
    "Write in the requested language. If Arabic is requested, use natural Egyptian Arabic unless the brief asks otherwise.",
    "Output type: " + typeNames[type],
    "Project media type: " + (projectType || "written") + " (written, image, or video)",
    "Selected idea (when generating prompts): " + (selectedIdea || "not provided"),
    "User style profile (follow this when relevant): " + JSON.stringify(styleProfile || {}),
    "Treat user feedback as durable preferences: positive/approved feedback indicates what to repeat; negative/revision feedback describes what to avoid or change. Prioritize explicit instructions over inferred feedback.",
    type === "project_ideas" ? "Return ONLY valid JSON array of 8 objects with keys title, description, hook, angle, format. Ideas must match project media type and platform. No markdown fences." : "",
    type === "json_prompts" ? "Return ONLY valid JSON object, no markdown fences. Schema: {\"project_type\":\"written|image|video\",\"platform\":string,\"selected_idea\":string,\"prompts\":[{\"purpose\":string,\"prompt\":string,\"negative_prompt\":string,\"parameters\":{}}],\"notes\":string}. For written content prompt, provide a structured generation instruction; image prompt should describe subject, composition, lighting, style, aspect ratio and text policy; video prompt should include scenes, camera movement, duration, motion, audio and transitions. Keep every prompt value useful and detailed. JSON must parse." : "",
    "Topic/brief: " + topic,
    "Platform: " + platform + " — " + (PLATFORM_GUIDANCE[platform] || "adapt the format to the platform"),
    "Tone: " + (tone || "clear and engaging"),
    "Goal: " + (goal || "engagement"),
    "Audience: " + (audience || "not specified; state any assumptions briefly"),
    "Language: " + (language || "Arabic"),
    "For video, include a hook, timed scenes, spoken script, on-screen text, visual direction, and CTA.",
    "For ideas, make each idea distinct and include a hook and suggested format.",
    "For a plan, include day, format, angle, hook, CTA, and purpose.",
    "Return the content directly with useful headings. Do not claim that anything was published."
  ].join("\n");
}

function extractJson(text) {
  const clean = String(text || "").replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(clean); } catch (_) {}
  const starts = [clean.indexOf("["), clean.indexOf("{")].filter(n => n >= 0);
  if (!starts.length) throw new Error("No JSON found");
  const start = Math.min(...starts);
  const end = clean[start] === "[" ? clean.lastIndexOf("]") : clean.lastIndexOf("}");
  if (end <= start) throw new Error("Incomplete JSON");
  return JSON.parse(clean.slice(start, end + 1));
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(503).json({
      error: "AI غير مفعّل بعد. أضف GEMINI_API_KEY في إعدادات Environment Variables على Vercel ثم أعد النشر.",
      code: "AI_NOT_CONFIGURED"
    });
  }
  const body = req.body || {};
  const type = ALLOWED_TYPES.has(body.type) ? body.type : "post";
  const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 6000) : "";
  const platform = typeof body.platform === "string" ? body.platform.slice(0, 40) : "Instagram";
  if (topic.length < 3) return res.status(400).json({ error: "اكتب وصفًا أو فكرة أوضح قبل التوليد." });
  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are an expert, honest social media content producer. Produce actionable, platform-aware content in the requested language." }] },
        contents: [{ role: "user", parts: [{ text: buildPrompt({ ...body, type, topic, platform }) }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: type === "json_prompts" ? 3000 : 2400, responseMimeType: (type === "json_prompts" || type === "project_ideas") ? "application/json" : "text/plain" }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data && data.error && data.error.message ? data.error.message : "تعذر الاتصال بمزوّد الذكاء الاصطناعي.";
      return res.status(response.status === 429 ? 429 : 502).json({
        error: response.status === 429 ? "وصلنا إلى حد الاستخدام الحالي للمزوّد. جرّب لاحقًا أو راجع حدود حسابك." : "فشل طلب الذكاء الاصطناعي: " + message,
        code: response.status === 429 ? "RATE_LIMITED" : "PROVIDER_ERROR"
      });
    }
    const text = (data.candidates || []).flatMap(c => c.content && c.content.parts ? c.content.parts : []).map(p => p.text || "").join("\n").trim();
    if (!text) return res.status(502).json({ error: "لم يرجع النموذج محتوى نصيًا. جرّب صياغة الطلب من جديد." });
    if (type === "project_ideas" || type === "json_prompts") {\n      let parsed;\n      try { parsed = extractJson(text); } catch (_) {\n        console.error("Structured response JSON parse failed", { type, model, responseLength: text.length });\n        return res.status(502).json({ error: "الذكاء الاصطناعي رجّع تنسيق JSON غير صالح. جرّب مرة أخرى.", code: "INVALID_MODEL_JSON" });\n      }\n      if (type === "project_ideas" && !Array.isArray(parsed)) return res.status(502).json({ error: "استجابة الأفكار ليست قائمة. جرّب مرة أخرى.", code: "INVALID_IDEAS_SHAPE" });\n      if (type === "json_prompts" && (!parsed || !Array.isArray(parsed.prompts))) return res.status(502).json({ error: "استجابة الـ prompts لا تحتوي على قائمة prompts صالحة.", code: "INVALID_PROMPTS_SHAPE" });\n      return res.status(200).json({ items: parsed, text: JSON.stringify(parsed, null, 2), model, provider: "Google Gemini" });\n    }\n    return res.status(200).json({ text, model, provider: "Google Gemini" });
  } catch (error) {
    return res.status(500).json({ error: "حصل خطأ أثناء الاتصال. جرّب مرة أخرى.", code: "SERVER_ERROR" });
  }
};
