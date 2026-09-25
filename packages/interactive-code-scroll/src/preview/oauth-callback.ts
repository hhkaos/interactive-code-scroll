import type { APIRoute } from "astro";

export const prerender = true;

/**
 * ArcGIS Maps SDK OAuth popup callback, published next to the preview page so the
 * SDK's redirect_uri (`preview/oauth-callback.html`) resolves.
 * Source: https://github.com/Esri/jsapi-resources/blob/main/oauth/oauth-callback.html (Apache-2.0).
 */
const CALLBACK_HTML = `<!DOCTYPE html>
<html>
  <head>
    <script>
      function loadHandler() {
        if (opener) {
          if (location.hash) {
            try {
              var esriId = opener.require("esri/kernel").id;
            } catch (e) {}
            if (esriId) {
              esriId.setOAuthResponseHash(location.hash);
            } else {
              opener.dispatchEvent(new CustomEvent("arcgis:auth:hash", { detail: location.hash }));
            }
          } else if (location.search) {
            opener.dispatchEvent(new CustomEvent("arcgis:auth:location:search", { detail: location.search }));
          }
        }
        close();
      }
    </script>
  </head>
  <body onload="loadHandler();"></body>
</html>
`;

export const GET: APIRoute = () => new Response(CALLBACK_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
