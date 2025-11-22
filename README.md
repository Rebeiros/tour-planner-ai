# 🌍 Tour Planner AI — Realtime Netlify Edition

AI-powered tour planner that guides users through dates, destinations, nearby attractions, stays, transport, and a sharable itinerary — with monetization via Pro features and affiliate integrations.

---

## 🚀 Features
✅ AI-assisted national & international trip planning  
✅ Serverless real-time data (OpenTripMap, IP geolocation)  
✅ Netlify Identity login/signup  
✅ Tailwind + Vite + React (optimized build)  
✅ Monetization: Ad slots, affiliate buttons, Pro export (Stripe-ready)  
✅ Deployable with **one click to Netlify**

---

## 🛠️ Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Netlify Functions
- **Auth:** Netlify Identity
- **Data APIs:** 
  - OpenTripMap (Tourist spots)
  - ipapi.co (Geo location)
- **Hosting:** Netlify

---

## ⚙️ Environment Variables
Set these in **Netlify → Site Settings → Environment**:

| Variable | Example Value | Description |
|-----------|---------------|-------------|
| `OTM_API_KEY` | `your-opentripmap-key` | Required for attractions data |

---

## 📁 Serverless Functions

| Function | Path | Purpose |
|-----------|------|---------|
| `geo.js` | `/.netlify/functions/geo` | Detects user's country by IP |
| `attractions.js` | `/.netlify/functions/attractions?lat=&lon=` | Returns nearby attractions |
| `hotels.js` | `/.netlify/functions/hotels?city=` | Returns hotels (stub for now) |
| `plan.js` | `/.netlify/functions/plan` | Creates a serverless itinerary draft with budgets |

---

## 🧩 Local Development

```bash
npm install
npm install -D netlify-cli
npx netlify dev
