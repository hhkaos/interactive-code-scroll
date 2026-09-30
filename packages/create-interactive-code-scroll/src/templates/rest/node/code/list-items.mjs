// #region config
const baseUrl = "https://api.example.com";
const apiKey = "YOUR_API_KEY"; // @var apiKey
// #endregion config

// #region run
const response = await fetch(`${baseUrl}/items?limit=2`, {
  headers: { Authorization: `Bearer ${apiKey}` },
});
console.log(JSON.stringify(await response.json(), null, 2));
// #endregion run
