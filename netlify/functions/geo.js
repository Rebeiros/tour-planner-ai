export const handler = async () => {
  try {
    const r = await fetch("https://ipapi.co/json/");
    const data = await r.json();
    const country = data.country_name || "United States";
    const code = data.country || "US";
    return { statusCode: 200, body: JSON.stringify({ country, code }) };
  } catch {
    return { statusCode: 200, body: JSON.stringify({ country: "United States", code: "US" }) };
  }
};
