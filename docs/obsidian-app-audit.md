# Obsidian 1.12.7 Reference Audit

Reference inspected:

- Local bundle: `/Volumes/Obsidian 1.12.7-universal/Obsidian.app`
- Official overview: https://obsidian.md/
- Official help index: https://obsidian.md/help/

The app could not be operated through Computer Use in this session because the local approval for `md.obsidian` was denied. This audit therefore uses bundle metadata, public Obsidian behavior, and official documentation. It must not copy proprietary implementation code or private assets.

## Bundle-Level Findings

- Product name: Obsidian.
- Version: 1.12.7.
- Bundle identifier: `md.obsidian`.
- Main executable: `Obsidian`.
- Extra executable: `obsidian-cli`.
- URL scheme: `obsidian://`.
- Document type handling: broad file viewer registration using public data/content types.
- Local-first positioning: notes are plain text Markdown files stored locally.
- App metadata includes iCloud container configuration, sealed code resources, app icon, usage descriptions for Apple Events, contacts, calendars, reminders, camera, microphone, audio, Bluetooth, and local networking.

## Feature Surface To Match

- Fast writing in Markdown with source/live reading views.
- Formatting commands, shortcuts, menus, and discoverable command actions.
- Vault-based folder workflow.
- Links, backlinks, tags, properties, and note discovery.
- Graph view that can render a large visual network and focus note neighborhoods.
- Canvas for visual note/media/webpage/PDF relationships.
- Command palette and keyboard-first navigation.
- Quick switcher and full-vault search.
- File explorer with create, rename, move, delete, and reveal workflows.
- Plugins, themes, CSS snippets, and API surface.
- CLI and URL scheme automation.
- Web clipper.
- Sync, version history, selective sync, and collaboration through user-owned or self-hosted equivalents in this app's free plan.
- Publish-style static website export with graph, backlinks, search, themes, and SEO.

## Applied Direction For Shibanshu Markdown Viewer

- Keep every feature local-first and free.
- Build graph and Claude/context maps from the same vault index.
- Add large-vault caps in the UI and provide a command-line context-map exporter for large repos.
- Treat editor commands as first-class app actions that are reachable by toolbar, keyboard, command palette, and native menus.
- Treat search as a first-class workspace action with snippets and click-through results, not only a sidebar filter.
- Build the first Canvas-equivalent slice as a local visual mind map from the same headings, links, backlinks, tags, and tasks used by the editor and AI map.
- Build version history locally first, with restore-as-unsaved behavior so recovery never silently overwrites disk content.
- Ship Publish locally first: export the open vault to a static folder with note pages, search data, backlinks, and graph data before adding hosted deployment options.
- Ship a local URL scheme for safe automation commands first, without allowing URLs to read arbitrary file paths.
- Ship a local CLI for context export, static publishing, reusable publish profiles, atomic note creation, URL commands, and OS file-open workflows; expand it later with deploy targets and trusted vault ids.
- Add signing/notarization before public distribution; local ad-hoc signing is only a developer convenience.
