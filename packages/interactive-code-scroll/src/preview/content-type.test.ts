import { expect, it } from "vitest";
import { contentType } from "./content-type.ts";

it.each([
  ["oauth-callback.html", "text/html; charset=utf-8"],
  ["js/main.MJS", "text/javascript; charset=utf-8"],
  ["style.css", "text/css; charset=utf-8"],
  ["LICENSE", "text/plain; charset=utf-8"],
  ["data.geojson", "application/geo+json; charset=utf-8"],
])("%s → %s", (path, type) => {
  expect(contentType(path)).toBe(type);
});

it.each([
  ["assets/logo.PNG", "image/png"],
  ["fonts/brand.woff2", "font/woff2"],
  ["gradle/wrapper/gradle-wrapper.jar", "application/octet-stream"],
])("binary %s → %s", (path, type) => {
  expect(contentType(path, true)).toBe(type);
});
