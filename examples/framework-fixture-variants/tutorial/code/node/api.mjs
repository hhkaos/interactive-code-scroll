import { baseUrl, fixtureToken } from "./config.mjs";

// #region request
export async function listItems() {
  const response = await fetch(`${baseUrl}/items?token=${fixtureToken}`);
  return response.json();
}
// #endregion
