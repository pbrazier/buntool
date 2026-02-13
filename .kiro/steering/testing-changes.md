# Testing Changes

After making code changes, always tell the user how to see them take effect.

## Rules

- If only frontend files changed (JS, CSS, HTML templates): tell the user to hard refresh the browser (`Cmd+Shift+R` on macOS, `Ctrl+Shift+R` on Windows/Linux). No server restart needed.
- If Python files changed (app.py, bundle.py, convert.py, or any backend module): tell the user to restart the server, then refresh the browser.
- If both changed: tell the user to restart the server and hard refresh.
- Keep it to one short sentence at the end of your response. Don't over-explain.
