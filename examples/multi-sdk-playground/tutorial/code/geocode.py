import requests

# region config
SERVICE_URL = "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer"
ACCESS_TOKEN = "YOUR_ACCESS_TOKEN"  # @var accessToken
# endregion config

# region request
response = requests.get(
    f"{SERVICE_URL}/findAddressCandidates",
    params={
        "singleLine": "380 New York St, Redlands, CA",
        "outFields": "Match_addr,Addr_type",
        "f": "json",
        "token": ACCESS_TOKEN,
    },
)
# endregion request

# region results
for candidate in response.json()["candidates"]:
    print(candidate["address"], candidate["score"])
# endregion results
