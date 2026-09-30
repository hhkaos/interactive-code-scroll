# Spike: technical base — findings

Branch `spike/base-framework`. The prototype code was removed once ported; it is in git history at commit `f265e61` (`git show f265e61:spike/...`). Two throwaway prototypes render the same mini tutorial
(`tutorial/`: ArcGIS Maps SDK 5.1 + OAuth, 3 files, regions, 2 `@var`s, 2 images) and share
the marker parser (`shared/markers.ts`) and preview helpers (`shared/preview.ts`).

| Prototype | Stack | Run |
|---|---|---|
| `codehike/` | Vite 8 + React 19 + `@mdx-js/rollup` + Code Hike 1.1 | `pnpm --filter ics-spike-codehike dev` → :5173 |
| `astro/` | Astro 7 + `@astrojs/mdx` + Shiki 4, vanilla TS client | `pnpm --filter ics-spike-astro dev` → :4321 (`astro dev stop` to stop) |

Historical smoke tests for both prototypes passed 10/10 from the original `spike/` workspace.

## Hard features

| Feature | Code Hike (Vite) | Astro + Shiki |
|---|---|---|
| Runtime `@var` → code | Client re-highlight of the whole file on each change (`highlight()` ~20 ms warm) | Build-time highlight; literal wrapped in `<span data-var>` via Shiki `decorations`; client only swaps `textContent` (no client highlighter) |
| Region focus + gray-out + auto-scroll | `Pre` + custom `focus` handler | Shiki `line` transformer adds `data-regions`; CSS `:has()` grays out |
| File switching | ✓ | ✓ |
| Image carousel | ✓ `calcite-carousel` | ✓ `calcite-carousel` (cloned from `<template>`) |
| Calcite light/dark | ✓ React 19 native custom elements, typed `oncalciteX` props | ✓ plain web components |
| Code theme light/dark | lighter `github-from-css` + 26 CSS vars | Shiki dual themes (`defaultColor: false`) |
| Preview iframe + new tab | ✓ | ✓ |
| Deep link / keyboard / progress | ✓ | ✓ |
| Strict validation | Runtime only (throws in the browser) | Build fails: `Step "sign-in": region "sign-inn" not found in main.js` (no MDX line yet) |
| Client JS (gzip) | ~393 KB | ~54 KB |
| First highlight | ~2.1 s (downloads grammar + theme from `lighter.codehike.org`) | 0 (pre-rendered HTML) |

## Code Hike: specific findings

- Client-side `highlight()` fetches grammars and themes from `https://lighter.codehike.org` at runtime:
  third-party dependency and a failure point on conference wifi / localhost fallback.
- `codehike/blocks` (the `!!steps` authoring syntax) imports `zod` without declaring it as a dependency.
  Its model also puts code *inside* the MDX, which conflicts with our "real files + regions" model.
- `utils/selection` is ~100 lines of IntersectionObserver; low value.
- Its strengths (RSC build-time highlighting, token transitions) do not apply: we need client updates for `@var` and have no incremental code.
- `@code-hike/lighter` is pinned at 1.0.1; `codehike` last release 2026-03.

## Astro: specific findings

- Astro 7 + pnpm: build failed resolving `cookie` (a stray CJS copy in `~/node_modules` was picked up because pnpm does not hoist it). Fixed with `vite.environments.prerender.resolve.noExternal: ["cookie"]`.
- `astro dev` daemonizes in v7 (`astro dev stop` / `astro dev logs`).
- Token substitution requires the `@var` literal to be a single string token. Values with quotes need escaping per language (JS vs HTML attribute). A non-string or multi-token var would need client re-highlighting (could lazy-load Shiki's web bundle only then).
- Client code is vanilla DOM; if state grows, an island (Lit/Preact) can be added later.

## Findings independent of the base

- **Preview must load from a real same-origin URL, not `srcdoc`/blob.** The SDK builds `redirect_uri` from `location` (`about://null/oauth-callback.html` in srcdoc; `<base href>` is ignored). Both prototypes now load `preview.html` (iframe and new tab) which `document.write`s the assembled HTML from `localStorage`.
- **`allow-same-origin` is required in the iframe sandbox**: the SDK's `oauth-callback.html` dispatches events on `window.opener`. Consequence: the preview can read the tutorial's `localStorage` (acceptable: the code is the author's; secrets are already in it).
- **Opaque-origin iframes send no Referer**: OSM tiles return 403, and referrer-restricted API keys would fail.
- `oauth-callback.html` must be published next to the preview page (Astro serves it at `/preview/`, so `redirect_uri` is `…/preview/oauth-callback.html`). The CLI must print these URIs.
- PKCE (`code_challenge_method=S256`) confirmed. The SDK shows its own "Please sign in" dialog before opening the popup (the popup needs a user gesture). **Full sign-in not verified**: needs a registered Client ID.
- When focus is inside the preview iframe, arrow keys go to the map, not step navigation. Mitigation: forward keys from the preview page (same origin).
- Deep links need `scroll-margin-top` on steps (native fragment scroll puts the step at the top, the trigger line is the center) and must wait for Calcite hydration (layout shift).
- React 19 sets Calcite props as properties, not attributes (e.g. `label`): E2E selectors must not rely on them.
- Calcite assets load from `js.arcgis.com` by default (no copy step). The SDK CDN brings its own Calcite (5.1.1) inside the preview document; no conflict.
- Calcite is licensed under the Esri MLA (not OSS); fine to depend on, worth noting next to our Apache-2.0.

## TutorialKit

- Built on Astro + WebContainers; requires cross-origin isolation (`COOP: same-origin`, `COEP: require-corp`).
  `COOP: same-origin` severs `window.opener` (breaks the OAuth popup flow), and GitHub Pages cannot set these headers.
- `@tutorialkit/astro` peer-depends on `astro ^4` (current: 7); last release 2025-09.
- IDE/lesson model (editor, terminal, solution files), not scroll-driven reading of final code.
- Verdict: not a base. Ideas worth borrowing: lesson metadata in frontmatter, "solve" toggle UX.

## Recommendation

**Astro + MDX + Shiki.** It covers every hard feature with less client JS, no runtime third-party
fetches, pre-rendered HTML, and build-time validation that matches the SPEC's "build fails on broken
references". Code Hike's distinctive features do not fit our model and its client-side path adds a
network dependency.
