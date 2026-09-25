import "@esri/calcite-components/main.css";
import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-carousel";
import "@esri/calcite-components/components/calcite-carousel-item";
import "@esri/calcite-components/components/calcite-input";
import "@esri/calcite-components/components/calcite-label";
import "@esri/calcite-components/components/calcite-tab-nav";
import "@esri/calcite-components/components/calcite-tab-title";
import "./code-theme.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
