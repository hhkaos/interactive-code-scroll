// #region config
const clientId = "YOUR_CLIENT_ID"; // @var clientId
const portalUrl = "https://www.arcgis.com"; // @var portalUrl
// #endregion

// #region oauth
const [OAuthInfo, esriId] = await $arcgis.import([
  "@arcgis/core/identity/OAuthInfo.js",
  "@arcgis/core/identity/IdentityManager.js",
]);

const info = new OAuthInfo({
  appId: clientId,
  portalUrl,
  popup: true,
  popupCallbackUrl: "oauth-callback.html",
  authNamespace: "interactive-code-scroll-oauth-demo",
});
esriId.registerOAuthInfos([info]);
// #endregion

// #region sign-in
const signInButton = document.querySelector("#sign-in");
const userStatus = document.querySelector("#user-status");
let signedIn = false;

// Set visible text when the user is not signed in
function showSignedOut() {
  signedIn = false;
  signInButton.textContent = "Sign in";
  userStatus.textContent = "You are not signed in yet.";
}

function showSignedIn(userId) {
  signedIn = true;
  signInButton.textContent = "Sign out";
  userStatus.textContent = `Signed in as ${userId}.`;
}

signInButton.addEventListener("click", async () => {
  if (signedIn) {
    esriId.destroyCredentials();
    showSignedOut();
    return;
  }

  const credential = await esriId.getCredential(`${portalUrl}/sharing`);
  showSignedIn(credential.userId);
});
// #endregion
