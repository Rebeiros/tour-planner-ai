export const handler = async (event) => {
  const { city = "New York" } = Object.fromEntries(new URLSearchParams(event.queryStringParameters || {}));
  return {
    statusCode: 200,
    body: JSON.stringify({
      hotels: [
        { name: `${city} Grand Hotel`, rating: 4.6, blurb: "Central location, great reviews." },
        { name: `${city} City Suites`, rating: 4.4, blurb: "Good value, near transport." }
      ]
    })
  };
};
