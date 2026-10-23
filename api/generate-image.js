// Pollinations image generation proxy. Keep POLLINATIONS_API_KEY server-side.
module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  const key = process.env.POLLINATIONS_API_KEY;
  if (!key) return res.status(503).json({ error: "مولّد الصور غير مفعّل. أضف POLLINATIONS_API_KEY في إعدادات Vercel بعد إنشاء مفتاح بميزانية مجانية/محدودة.", code: "IMAGE_NOT_CONFIGURED" });
  const body = req.body || {};
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1800) : "";
  if (prompt.length < 3) return res.status(400).json({ error: "اكتب وصفًا واضحًا للصورة." });
  const ratio = ["1:1","16:9","9:16","4:5","3:2"].includes(body.ratio) ? body.ratio : "1:1";
  const dimensions = { "1:1":[1024,1024], "16:9":[1280,720], "9:16":[720,1280], "4:5":[896,1120], "3:2":[1152,768] };
  const [width,height] = dimensions[ratio];
  try {
    const url = new URL("https://gen.pollinations.ai/image/" + encodeURIComponent(prompt));
    url.searchParams.set("model", "zimage");
    url.searchParams.set("width", String(width));
    url.searchParams.set("height", String(height));
    url.searchParams.set("nologo", "true");
    const upstream = await fetch(url.toString(), { headers: { Authorization: "Bearer " + key, Accept: "image/*" } });
    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 500);
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: upstream.status === 429 ? "وصلنا لحد الاستخدام المجاني. جرّب لاحقًا." : "تعذّر توليد الصورة من المزوّد. راجع صلاحية المفتاح وحدوده. " + detail, code: upstream.status === 429 ? "RATE_LIMITED" : "IMAGE_PROVIDER_ERROR" });
    }
    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return res.status(502).json({ error: "المزوّد لم يرجع ملف صورة صالحًا." });
    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) return res.status(502).json({ error: "الصورة أكبر من الحد المسموح." });
    return res.status(200).json({ image: "data:" + contentType + ";base64," + bytes.toString("base64"), model: "zimage", provider: "Pollinations" });
  } catch (e) {
    return res.status(500).json({ error: "حصل خطأ أثناء توليد الصورة. حاول مرة أخرى.", code: "IMAGE_SERVER_ERROR" });
  }
};
