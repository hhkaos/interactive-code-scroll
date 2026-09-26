// #region config
const clientId = "YOUR_CLIENT_ID"; // @var clientId
const portalUrl = "https://fixture.example.test"; // @var portalUrl
// #endregion

// #region oauth
const fixtureState = {
  clientId,
  portalUrl,
  runs: 0,
};

function formatStatus() {
  return `Configured ${fixtureState.clientId} for ${fixtureState.portalUrl}`;
}
// #endregion

// #region sign-in
const signInButton = document.querySelector("#sign-in");
const userStatus = document.querySelector("#user-status");

signInButton.addEventListener("click", () => {
  fixtureState.runs += 1;
  signInButton.textContent = `Run ${fixtureState.runs}`;
  userStatus.textContent = formatStatus();
});
// #endregion
