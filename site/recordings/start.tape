# "Start in 30 seconds" terminal recording.
# Regenerate with `pnpm record` (needs VHS: https://github.com/charmbracelet/vhs)
# whenever the wizard or the dev server output changes.
# Run it from the repository root: output paths are relative to it.

Output site/public/recordings/start.gif
Output site/public/recordings/start.webm
Output site/public/recordings/start.mp4

Require npm

Set Shell bash
Set FontSize 22
Set Width 1160
Set Height 800
Set Padding 28
Set Framerate 24
Set TypingSpeed 55ms
Set CursorBlink false
# Site palette (site/src/pages/index.astro, .terminal).
Set Theme { "name": "ics", "background": "#0a1120", "foreground": "#cbd5e1", "cursor": "#22d3ee", "selection": "#1f2c45", "black": "#0a1120", "red": "#f87171", "green": "#34d399", "yellow": "#fbbf24", "blue": "#60a5fa", "magenta": "#c084fc", "cyan": "#22d3ee", "white": "#cbd5e1", "brightBlack": "#64748b", "brightRed": "#fca5a5", "brightGreen": "#6ee7b7", "brightYellow": "#fde68a", "brightBlue": "#93c5fd", "brightMagenta": "#d8b4fe", "brightCyan": "#67e8f9", "brightWhite": "#f8fafc" }

# Fresh folder, plain prompt, no npm banners. Agent variables (when an AI
# agent runs this) make Astro start the dev server in the background.
Hide
Type "unset AI_AGENT $(compgen -e | grep -E '^CLAUDE|^CODEX')"
Enter
Type "cd $(mktemp -d /tmp/ics.XXXX) && export PS1='$ ' npm_config_loglevel=silent npm_config_fund=false npm_config_audit=false && clear"
Enter
Show

Sleep 600ms
Type "npm create interactive-code-scroll@latest my-talk"
Sleep 500ms
Enter

Wait+Screen@30s /What do you want to create/
Sleep 1s
Enter

# REST API with cURL, Python and Node.js (web app JavaScript is preselected).
Wait+Screen /What will the tutorial use/
Sleep 1s
Space
Sleep 300ms
Down@250ms 1
Space
Down@250ms 1
Space
Down@250ms 1
Space
Sleep 800ms
Enter

Wait+Screen /Package manager/
Sleep 800ms
Enter
Wait+Screen /GitHub Pages workflow/
Sleep 800ms
Enter
Wait+Screen /Initialize a git repository/
Sleep 600ms
Enter
Wait+Screen /Install dependencies now/
Sleep 600ms
Enter

# npm install prints nothing for ~20 s: skip the wait. Wait+Screen only sees
# the first rows once the output scrolls, so wait for the prompt line instead.
Sleep 1500ms
Hide
Wait@180s /^\$ *$/
Show
Sleep 3s

Type "cd my-talk && npm run dev"
Sleep 500ms
Enter
Sleep 8s
Screenshot site/public/recordings/start.png
# The screenshot is written with the next frame.
Sleep 2s
