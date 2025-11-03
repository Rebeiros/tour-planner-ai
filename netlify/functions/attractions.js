export const handler = async (event) => {
  try {
    const q = Object.fromEntries(new URLSearchParams(event.queryStringParameters || {}));
    const { lat, lon, radius = 50000, kind = "interesting_places", limit = 20 } = q;
    if (!lat || !lon) return { statusCode: 400, body: "lat & lon required" };
    const key = process.env.OTM_API_KEY;
    const url = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&kinds=${kind}&limit=${limit}&apikey=${key}`;
    const r = await fetch(url);
    const data = await r.json();
    const items = (data.features || []).map(f => ({
      id: f.properties.xid,
      name: f.properties.name,
      kinds: f.properties.kinds,
      dist: f.properties.dist,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0]
    }));
    return { statusCode: 200, body: JSON.stringify({ items }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
