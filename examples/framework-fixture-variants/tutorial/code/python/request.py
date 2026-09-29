import urllib.request

# region config
FIXTURE_TOKEN = "DEMO_TOKEN"  # @var fixtureToken
BASE_URL = "https://api.fixture.test/v1"
# endregion


# region client
def get(path):
    url = BASE_URL + path + "?token=" + FIXTURE_TOKEN
    return urllib.request.urlopen(url).read()
# endregion


# region request
print(get("/items"))
# endregion
