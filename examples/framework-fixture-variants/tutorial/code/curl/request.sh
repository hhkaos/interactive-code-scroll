#!/bin/sh
# #region config
FIXTURE_TOKEN="DEMO_TOKEN" # @var fixtureToken
BASE_URL="https://api.fixture.test/v1"
# #endregion

# #region request
curl "$BASE_URL/items?token=$FIXTURE_TOKEN"
# #endregion

# #region flags
curl --silent --show-error "$BASE_URL/items?token=$FIXTURE_TOKEN"
# #endregion
