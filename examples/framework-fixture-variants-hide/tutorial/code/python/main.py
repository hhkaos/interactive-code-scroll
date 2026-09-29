# region config
TOKEN = "DEMO_TOKEN"  # @var fixtureToken
# endregion

# region install
import json
# endregion

# region request
print(json.dumps({"token": TOKEN}))
# endregion
