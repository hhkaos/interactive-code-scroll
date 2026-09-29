import requests

SERVICE_URL = "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer"
ACCESS_TOKEN = "YOUR_ACCESS_TOKEN"  # @var accessToken

# region header-auth
response = requests.post(
    f"{SERVICE_URL}/findAddressCandidates",
    headers={"X-Esri-Authorization": f"Bearer {ACCESS_TOKEN}"},
    data={
        "singleLine": "380 New York St, Redlands, CA",
        "outFields": "Match_addr,Addr_type",
        "f": "json",
    },
)
data = response.json()
# endregion header-auth

if "error" in data:
    raise SystemExit(f"{data['error']['code']}: {data['error']['message']}")

for candidate in data["candidates"]:
    print(candidate["address"], candidate["score"])
