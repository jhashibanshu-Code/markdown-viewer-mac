# Security Policy

Shibanshu Markdown Viewer is local-first software. Markdown rendering, graph mapping, context export, and static publishing are designed to run on the user's machine.

## Supported Versions

Security fixes target the latest released version.

## Reporting A Vulnerability

Report security issues privately to the project owner before publishing details. Include:

- App version and platform.
- Steps to reproduce.
- Whether the issue reads, writes, deletes, exports, or transmits local data.
- A minimal Markdown or vault fixture when possible.

## Security Boundaries

The app should not allow URL commands to read arbitrary local paths. File access must come from explicit file/folder selection, drag and drop, file-open events, or already trusted vault paths.

Static publishing and exports must sanitize rendered HTML, reject unsafe paths, and keep output inside the selected output folder.

## Public Release Requirement

Public macOS builds must pass release readiness in public mode:

```bash
npm run release:readiness -- --arch arm64 --public
```
