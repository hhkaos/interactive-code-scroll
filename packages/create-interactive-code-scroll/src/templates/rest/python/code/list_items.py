import json
import urllib.request

# region config
BASE_URL = "https://api.example.com"
API_KEY = "YOUR_API_KEY"  # @var apiKey
# endregion

# region request
request = urllib.request.Request(
    BASE_URL + "/items?limit=2",
    headers={"Authorization": "Bearer " + API_KEY},
)
with urllib.request.urlopen(request) as response:
    print(json.dumps(json.load(response), indent=2))
# endregion
