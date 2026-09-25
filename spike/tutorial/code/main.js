// #region config
const clientId = "YOUR_CLIENT_ID"; // @var clientId
const portalUrl = "https://www.arcgis.com"; // @var portalUrl
// #endregion

// #region oauth
const [OAuthInfo, esriId] = await $arcgis.import([
  "@arcgis/core/identity/OAuthInfo.js",
  "@arcgis/core/identity/IdentityManager.js",
]);

const info = new OAuthInfo({ appId: clientId, portalUrl, popup: true });
esriId.registerOAuthInfos([info]);
// #endregion

// #region sign-in
const signInButton = document.querySelector("#sign-in");
signInButton.addEventListener("click", async () => {
  const credential = await esriId.getCredential(`${portalUrl}/sharing`);
  signInButton.textContent = credential.userId;
});
// #endregion
