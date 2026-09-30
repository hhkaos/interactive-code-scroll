# #region config
TOKEN="DEMO_TOKEN" # @var fixtureToken
# #endregion

# #region flags
FLAGS="--silent"
# #endregion

# #region request
curl $FLAGS "https://api.fixture.test/v1/items?token=$TOKEN"
# #endregion
