import "dotenv/config";
import express from "express";

const app = express();

// #region listen
const port = 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
// #endregion
