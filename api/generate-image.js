// Pollinations image generation proxy. Keep POLLINATIONS_API_KEY server-side.
module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  const hfToken = process.env.HF_TOKEN;
  const pollinationsKey = process.env.POLLINATIONS_API_KEY;
  const body = req.body || {};
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1800) : "";
  if (prompt.length < 3) return res.status(400).json({ error: "اكتب وصفًا واضحًا للصورة." });
  const ratio = ["1:1","16:9","9:16","4:5","3:2"].includes(body.ratio) ? body.ratio : "1:1";
  const models = {
    "Qwen/Qwen-Image": { family: "hf" },
    "black-forest-labs/FLUX.1-dev": { family: "hf" },
    "stabilityai/stable-diffusion-3.5-large": { family: "hf" },
    "Tongyi-MAI/Z-Image-Turbo": { family: "hf" },
    "black-forest-labs/FLUX.1-schnell": { family: "hf" },
    "stabilityai/stable-diffusion-xl-base-1.0": { family: "hf" },
    "PixArt-alpha/PixArt-Sigma-XL-2-1024-MS": { family: "hf" }
  };
  const model = typeof body.model === "string" && models[body.model] ? body.model : "Qwen/Qwen-Image";
  const dimensions = { "1:1":[1024,1024], "16:9":[1280,720], "9:16":[720,1280], "4:5":[896,1120], "3:2":[1152,768] };
  const [width,height] = dimensions[ratio];
  try {
    if (!hfToken) return res.status(503).json({ error: "مولّدات الصور المفتوحة تحتاج مفتاح Hugging Face. أضف HF_TOKEN في إعدادات Vercel ثم أعد النشر. المفتاح يظل على الخادم ولا يُرسل للمتصفح.", code: "HF_TOKEN_MISSING" });
    const upstream = await fetch("https://router.huggingface.co/hf-inference/models/" + model, {
      method: "POST",
      headers: { Authorization: "Bearer " + hfToken, "Content-Type": "application/json", Accept: "image/*" },
      body: JSON.stringify({ inputs: prompt, parameters: { width, height } })
    });
    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 350);
      const code = upstream.status === 401 || upstream.status === 403 ? "HF_TOKEN_INVALID" : upstream.status === 429 ? "RATE_LIMITED" : "HF_MODEL_UNAVAILABLE";
      const message = code === "HF_TOKEN_INVALID" ? "مفتاح Hugging Face غير صالح أو لا يملك صلاحية Inference." : code === "RATE_LIMITED" ? "وصلت إلى حد الطلبات أو الرصيد المتاح لدى Hugging Face." : "النموذج غير متاح حاليًا عبر الاستدلال السحابي. جرّب نموذجًا آخر. " + detail;
      return res.status(code === "RATE_LIMITED" ? 429 : 502).json({ error: message, code });
    }
    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      const detail = (await upstream.text()).slice(0, 200);
      return res.status(502).json({ error: "المزوّد لم يرجع صورة؛ قد لا يدعم هذا النموذج الاستدلال السحابي. " + detail, code: "HF_NOT_IMAGE" });
    }
    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) return res.status(502).json({ error: "الصورة أكبر من الحد المسموح." });
    return res.status(200).json({ image: "data:" + contentType + ";base64," + bytes.toString("base64"), model, provider: "Hugging Face Inference" });
  } catch (e) {
    return res.status(500).json({ error: "حصل خطأ أثناء توليد الصورة. حاول مرة أخرى.", code: "IMAGE_SERVER_ERROR" });
  }
};
