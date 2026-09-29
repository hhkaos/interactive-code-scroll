const serviceUrl = "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";
const accessToken = "YOUR_ACCESS_TOKEN"; // @var accessToken

// #region header-auth
const response = await fetch(`${serviceUrl}/findAddressCandidates`, {
  method: "POST",
  headers: { "X-Esri-Authorization": `Bearer ${accessToken}` },
  body: new URLSearchParams({
    singleLine: "380 New York St, Redlands, CA",
    outFields: "Match_addr,Addr_type",
    f: "json",
  }),
});
const data = await response.json();
// #endregion header-auth

if (data.error) {
  throw new Error(`${data.error.code}: ${data.error.message}`);
}

for (const candidate of data.candidates) {
  console.log(candidate.address, candidate.score);
}
