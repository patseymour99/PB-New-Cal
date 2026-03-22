export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });

  const { message, mode, context } = req.body || {};
  // mode: "chat" for concierge, "plandate" for date planner, "guestplan" for guest itinerary, "wrap" for monthly wrap

  const systemPrompts = {
    chat: `You are the AI concierge for a couple (both 26) living in Farringdon, London. They work in Finance and Consulting. They love fine dining, Afrohouse music, jazz, tech events, wellness (especially ARC contrast therapy), and big concerts. They have a shared calendar app. Be warm, specific, and give actionable London recommendations. Use web search to find current events, new restaurants, and things to do. Keep responses concise — 2-3 short paragraphs max. ${context ? "Their recent events and preferences: " + context : ""}`,

    plandate: `You are planning a date night for a couple (both 26) in Farringdon, London. They love fine dining, Afrohouse music, jazz, cocktail bars, and unique experiences. Search the web for what's available RIGHT NOW and create a specific plan with: 1) Pre-dinner drinks spot 2) Restaurant with cuisine type 3) After-dinner activity. Include real venue names, areas, and approximate costs. Format as a clear itinerary. ${context ? "They've already been to and rated: " + context : ""}`,

    guestplan: `You are creating a guest itinerary for visitors staying with a couple in Farringdon, London. Search the web for current things to do and create a day-by-day plan mixing culture, food, walks, and nightlife. Include specific venues and times. ${context ? "Guest details: " + context : ""}`,

    wrap: `You are creating a fun, warm monthly wrap-up summary for a couple's shared calendar. Be playful and celebratory. Include: highlight of the month, stats summary, best restaurant, busiest week, suggestion for next month. Keep it to 3-4 short paragraphs. ${context ? "This month's data: " + context : ""}`,
  };

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: systemPrompts[mode] || systemPrompts.chat,
        tools: (mode === "chat" || mode === "plandate" || mode === "guestplan") ? [{ type: "web_search_20250305", name: "web_search" }] : [],
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!r.ok) { const e = await r.text(); return res.status(500).json({ error: e }); }

    const data = await r.json();
    const text = data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
    return res.status(200).json({ reply: text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
