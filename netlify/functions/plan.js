export const handler = async (event = {}) => {
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON payload" }) };
  }

  const {
    mainCity = "Your destination",
    duration = 3,
    startDate,
    endDate,
    tourType = "national",
    homeCountry = "",
    budgetTier = "mid",
    party = "couple",
    nearby = [],
    transport = "public",
    multiSpot = false,
  } = payload;

  if (!mainCity || typeof mainCity !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "mainCity is required" }) };
  }

  const safeDuration = Math.max(1, parseInt(duration, 10) || 1);

  const partySizeMap = { solo: 1, couple: 2, family: 3.5, group: 5 };
  const perDayMap = { low: 80, mid: 140, high: 240 };

  const travellerCount = partySizeMap[party] || 2;
  const perDay = perDayMap[budgetTier] || perDayMap.mid;
  const totalBudget = Math.round(perDay * safeDuration * travellerCount);

  const budgetBreakdown = [
    { label: "Stay", amount: Math.round(totalBudget * 0.42) },
    { label: "Food", amount: Math.round(totalBudget * 0.25) },
    { label: "Sightseeing", amount: Math.round(totalBudget * 0.18) },
    { label: "Transport", amount: Math.round(totalBudget * 0.15) },
  ];

  const baseDay = (index) => {
    if (index === 0) {
      return {
        title: `Arrive in ${mainCity}`,
        summary: `Land in ${mainCity}, settle into your stay, and take an easy walk to a nearby cafe.`,
      };
    }

    const nearbySpot = nearby[index - 1]?.name;
    if (nearbySpot) {
      return {
        title: `Explore ${nearbySpot}`,
        summary: `Spend the day at ${nearbySpot}, plan a lunch stop, and leave room for golden-hour photos.`,
      };
    }

    return {
      title: "Local discoveries",
      summary: "Ask locals for a neighborhood walk or market—keep it flexible and photo-friendly.",
    };
  };

  const days = Array.from({ length: safeDuration }).map((_, i) => ({
    day: i + 1,
    focus: baseDay(i).title,
    summary: baseDay(i).summary,
    dinner: i === 0 ? "Try a relaxed dinner near your stay" : "Book dinner near the last activity to reduce travel",
  }));

  const highlights = [
    `${safeDuration}-day ${tourType === "international" ? "international" : "local"} outline centered on ${mainCity}`,
    multiSpot ? "Multi-spot hop enabled—mix city cores and day trips" : "Single hub makes daily travel light",
    `Budget tuned to a ${budgetTier} traveler profile for ~${travellerCount} people`,
  ];

  const transportTips = transport === "flight"
    ? "Arrive a day early to buffer flight delays; keep airport transfers pre-booked."
    : transport === "public"
      ? "Grab a day-pass for buses/metro—fewer tickets, faster boarding."
      : "Enable offline maps and save your parking/ride drop points.";

  const summary = `Serverless plan for ${mainCity}: ${safeDuration} days with ${nearby.length || "a few"} add-ons, tailored for ${party}.`;

  return {
    statusCode: 200,
    body: JSON.stringify({
      title: `${mainCity} • ${safeDuration}-day`,
      summary,
      startDate: startDate || null,
      endDate: endDate || null,
      highlights,
      budget: {
        total: totalBudget,
        perDay,
        travellerCount,
        breakdown: budgetBreakdown,
      },
      days,
      transport,
      transportTips,
    }),
  };
};
