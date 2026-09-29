import { listItems } from "./api.mjs";

// #region client
const items = await listItems();
// #endregion

console.log(items);
