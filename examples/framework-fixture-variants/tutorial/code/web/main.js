// #region config
const fixtureToken = "DEMO_TOKEN"; // @var fixtureToken
const baseUrl = "https://api.fixture.test/v1";
// #endregion

// #region request
document.querySelector("#output").textContent = `${baseUrl}/items?token=${fixtureToken}`;
// #endregion
