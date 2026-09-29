// #region config
const serviceUrl = "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";
const accessToken = "YOUR_ACCESS_TOKEN"; // @var accessToken
// #endregion config

// #region request
const params = new URLSearchParams({
  singleLine: "380 New York St, Redlands, CA",
  outFields: "Match_addr,Addr_type",
  f: "json",
  token: accessToken,
});
const response = await fetch(`${serviceUrl}/findAddressCandidates?${params}`);
const data = await response.json();
// #endregion request

// #region results
if (data.error) {
  throw new Error(`${data.error.code}: ${data.error.message}`);
}

for (const candidate of data.candidates) {
  console.log(candidate.address, candidate.score);
}
// #endregion results
