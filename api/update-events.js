export default async function handler(req, res) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const FIREBASE_DB_URL = process.env.FIREBASE_DATABASE_URL;

  if (!ANTHROPIC_API_KEY || !FIREBASE_DB_URL) {
    return res.status(500).json({ error: "Missing env vars. Set ANTHROPIC_API_KEY and FIREBASE_DATABASE_URL in Vercel settings." });
  }

  try {
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [
          {
            role: "user",
            content: `Today is ${dateStr}. You are curating a weekly events guide for a couple (both 26) living in Farringdon, London. They work in Finance and Consulting. Their interests are:

1. FINE DINING — new restaurant openings, tasting menus, best date night spots
2. AFROHOUSE & MUSIC — Afrohouse nights, Amapiano events, big concerts, live music
3. JAZZ — jazz clubs, live jazz events, listening bars
4. WELLNESS & FITNESS — contrast therapy (like ARC), fitness events, recovery experiences
5. TECH — startup events, AI meetups, tech networking, conferences
6. CULTURE — exhibitions, theatre, immersive experiences, festivals

Search the web for what is happening in London THIS WEEK and the next 2-3 weeks. Use sources like Time Out London, DesignMyNight, Resident Advisor, Hot Dinners, Visit London, Londonist, DICE, Eventbrite.

Return ONLY a JSON array of 20-30 events. No other text, no markdown, no backticks. Just the raw JSON array.

Each event object must have exactly these fields:
{
  "id": "d1",
  "title": "Event name",
  "venue": "Venue name",
  "area": "London area",
  "date": "Date or date range",
  "cat": "dining|nightout|culture|fitness|work|other",
  "emoji": "single emoji",
  "desc": "2 sentence description. Why it is good for them specifically.",
  "tag": "Short tag like New Opening or This Week or Free",
  "src": "Source name"
}

Use sequential IDs: d1, d2, d3 etc. Mix categories well. Include specific dates where possible.`
          }
        ]
      })
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      return res.status(500).json({ error: "Claude API error", details: errText });
    }

    const claudeData = await claudeResponse.json();

    let fullText = "";
    for (const block of claudeData.content) {
      if (block.type === "text") {
        fullText += block.text;
      }
    }

    let cleaned = fullText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let discoverEvents;
    try {
      discoverEvents = JSON.parse(cleaned);
    } catch (parseErr) {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        discoverEvents = JSON.parse(match[0]);
      } else {
        return res.status(500).json({ error: "Failed to parse Claude response", raw: cleaned.slice(0, 500) });
      }
    }

    if (!Array.isArray(discoverEvents)) {
      return res.status(500).json({ error: "Response is not an array" });
    }

    const payload = {
      events: discoverEvents,
      updatedAt: new Date().toISOString(),
      week: `${today.getFullYear()}-W${String(Math.ceil((today - new Date(today.getFullYear(), 0, 1)) / 86400000 / 7)).padStart(2, "0")}`,
    };

    const fbResponse = await fetch(`${FIREBASE_DB_URL}/calendar/discover.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!fbResponse.ok) {
      const fbErr = await fbResponse.text();
      return res.status(500).json({ error: "Firebase write failed", details: fbErr });
    }

    return res.status(200).json({
      success: true,
      count: discoverEvents.length,
      updatedAt: payload.updatedAt,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
