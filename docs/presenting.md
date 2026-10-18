# Presenting a Tutorial

How to show a tutorial in a talk, a workshop or a screen share. For writing one, see [Authoring Reference](authoring.md).

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../site/public/screenshots/present-rest-curl-dark.png">
  <img alt="Presentation mode: the tutorial fills the screen with a compact toolbar, the current step on the left and the cURL request it explains highlighted on the right." src="../site/public/screenshots/present-rest-curl-light.png" width="900">
</picture>

## Before the talk

- **Link to the exact spot**: `#step-id` opens the tutorial at a step, and `?variant=curl#request` also picks the language. Keep one link per section of the talk.
- **Pick the theme for the room**: the header toggle switches light and dark, and the choice is remembered for the whole site. Light usually reads better on projectors.
- **Zoom until the back row can read the code** (CMD/Ctrl + "+"). The layout stays usable at high zoom: the Result pane header turns "Keep response", "Show captured" and then "Run request" into icons (their names show as tooltips), and a short Result pane scrolls as a whole: request line, notices and body. Long lines wrap when the author sets `codeWrap: true` ([Frontmatter](authoring.md#frontmatter)).
- **Plan for a bad network**: give request steps a captured `output=`. If the venue's network or CORS blocks a live request, the pane falls back to it and says so. Serve the site from your laptop with the CLI (`serve`, see [Commands](cli.md#commands)) when the network is unreliable.
- **Secrets on screen**: secret fields and the request line stay masked; "Show secrets" is off on every page load. Persisted fields keep what you typed in the browser, so present from a browser profile without your real credentials.

## During the talk

- **Presentation mode**: the header's presentation icon (or Alt+P, Option+P on a Mac) enters browser full screen with a compact toolbar; Alt+P again leaves it. The handle on the explanations splitter hides the explanations so the code gets the full width. Esc leaves.
- **Step index**: in presentation mode the header's "Step X of N" opens the list of steps, large and centered. Step keys keep moving the real step while it is open; a step in the list jumps to it.
- **Single-key shortcuts** (presentation mode only, never in fields): `O` opens and closes the step index (`b` and `.` too, which many clickers send from their "blank screen" button); `E` shows and hides the explanations.
- **Panel presets**: `1` collapses/restores the lower pane at its last size. `2` / `3` / `4` expand it to 35% / 50% / 75% of the right column and leave maximization, keeping the selected Preview / Console / Result view. Sizes animate over 180 ms (immediate with reduced motion) and are remembered like splitter changes. Author-defined settings apply when you enter a step. Commands have no effect without a lower pane; compact phones keep their existing header/maximized geometry.
- **Maximize by keyboard**: `5` toggles the lower panel; `0` toggles the code or media area. Repeat the key, or press Esc, to restore the layout.
- **Show the whole file**: `H` toggles region emphasis, keeping syntax colors and scroll position. Moving to another step or leaving presentation restores emphasis. These new single-key commands work only while presenting, never in fields or inside embedded apps.
- **Read aloud**: narration continues when entering presentation mode, with a single audio button beside **Keyboard shortcuts** in the header. That button toggles the full controls; **Hide** conceals the row without changing playback or position, while **Close** stops narration. When idle the audio button starts Listen; first use opens the listening-mode choice before playing. Alt+Shift+L starts, pauses, resumes or continues after a finished step outside editable fields, including with the controls or explanations hidden. A matching browser voice is required. See [Listen to a tutorial](authoring.md#listen-to-a-tutorial).
- **Forgot a key?** Press and release Alt (Option) on its own, outside fields: a strip at the bottom of the screen lists the keys of the current mode. The strip includes panel commands, PageUp/PageDown and narration. Any other key, an outside click or Alt again hides it; it also disappears after six seconds. Choose **All shortcuts** in the strip, or the header's **Keyboard shortcuts** action, for persistent help grouped into Navigation, Panels and Audio. While help is open, step and single-key commands are suspended; Esc closes help first.
- **Clickers and keys**: check your clicker before the talk. Its arrows usually send PageDown/PageUp; its "blank screen" button often sends `b` or `.`, which opens the step index here. PageDown/PageUp move steps wherever the focus is: a form field, the JSON tree, the Result pane's tabs and controls, or the Preview. Only multi-line text keeps them. Arrow keys also move steps, except inside fields and widgets that use them (JSON tree, Body/Headers tabs, "Run as", splitters).
- **Images**: on a step with images, step keys page through them before moving to the next step; clicking an image opens a full-screen viewer.
- **Splitters**: drag them to give the code or the Preview more room. Their sizes are remembered.
- **Closing slide**: past the last step, the clicker opens a full-screen slide with "You've completed …", the author's [`<Outro>`](authoring.md#outro) text, the next tutorial of the series and a large QR code of the tutorial's URL, so the room can open it. PageUp returns to the last step. The QR code points at [`presentationUrl`](authoring.md#page) when the tutorial (or the series' `index.mdx`) sets it, else at the public URL from Astro's `site` setting, else at the page itself: when you present from `localhost`, set one of the first two so the QR code opens the published copy. If the QR code cannot be drawn, the slide shows the URL alone (the browser console says why; reload to try again).

## Maximized panes

The code panel, the iframe Preview and the Result pane each have a maximize icon in their header. A maximized pane fills the browser window (the whole screen in presentation mode); its icon or Esc restores the layout with the same splitter sizes. One pane is maximized at a time, and step keys keep moving steps underneath. On a step with images, the maximized code area shows the carousel with a floating restore action. Maximizing a collapsed Preview or Result pane expands it; collapsing it restores the layout. The state is not remembered across reloads.

Authors can maximize a pane from a step (or from the intro), for example to show a big result and restore the layout on the next step: see [`maximize`](authoring.md#maximize-from-a-step).

## Leaving with Esc

Esc goes one level at a time: an open image viewer, then the step index, then the maximized pane, then presentation mode (from the closing slide too: the page stays on the closing panel). When narration settings are open, Esc closes them and returns focus to their gear before restoring a maximized pane or leaving presentation. In browser full screen this order holds in Chrome and Edge: the page locks Esc (Keyboard Lock API), and holding Esc for a moment leaves full screen, as the browser's banner says. Firefox and Safari do not support that lock: there the browser takes the first Esc to leave full screen (and presentation mode), closing an open step index with it; the pane stays maximized until the next Esc. Present from Chrome or Edge to keep Esc for the page.
