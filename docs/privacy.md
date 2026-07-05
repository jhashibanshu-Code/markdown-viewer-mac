# Privacy

Shibanshu Markdown Viewer is designed to be local-first.

## Local Processing

Markdown rendering, editing, graph mapping, mind maps, AI context exports, static publishing, autosave recovery, and local history are processed on the user's machine.

The app does not require an account, hosted service, or subscription.

## Files

The app reads files only through explicit user actions such as opening a file, opening a folder, dragging files into the app, file-open events from macOS, or paths already trusted as part of an opened vault.

Generated context files, static sites, HTML exports, PDFs, autosave drafts, and history snapshots are saved locally.

Recent file and vault entries are also stored locally in app data so quick-open can reopen user-approved locations. The renderer receives recent-item ids from the native process; it does not receive a general-purpose filesystem API.

## Network

The core app works offline. External links may open in the system browser when the user clicks them. Release downloads and updates, if added later, should be documented separately.

## AI Context Exports

Claude/ChatGPT context exports are local Markdown and JSON files. The app does not send those exports to an AI provider. A user or agent may choose to upload or paste generated files elsewhere.
