# Release Readiness

Shibanshu Markdown Viewer has two release states:

- Development release: local build, ad-hoc signature, ZIP artifact, checksum, and local verification. This is useful for testing.
- Public release: Developer ID signed, notarized, stapled, Gatekeeper-approved, checksum-listed, and backed by trust documents.

## Commands

```bash
npm run dist:mac:arm64
npm run release:readiness -- --arch arm64
npm run release:readiness -- --arch arm64 --public
```

The normal readiness command writes `release/release-readiness.json` and exits successfully if the build is structurally valid. The `--public` mode exits non-zero while public release blockers remain.

## Public Release Blockers

A public macOS release is blocked until all of these pass:

- Developer ID Application signing, not ad-hoc signing.
- Apple Team ID present in the code signature.
- `spctl --assess --type execute` passes.
- `xcrun stapler validate` passes after notarization.
- Downloadable artifacts are indexed in `release/release-manifest.json`.
- `release/SHA256SUMS` includes every downloadable artifact.
- Download page includes release readiness status.
- Trust documents exist: `LICENSE`, `THIRD_PARTY_NOTICES.md`, `SECURITY.md`, `CHANGELOG.md`, `docs/privacy.md`, and `docs/uninstall.md`.

## Manual Desktop Smoke Test

Automated launch from some terminal or CI contexts can fail because macOS LaunchServices, Spotlight, or the WindowServer are unavailable to that process. That does not prove the app is launchable.

In the Codex terminal session, `open` can also report `kLSNoExecutableErr` or `kLSExecutableIncorrectFormat` for otherwise valid `.app` bundles or even installed browsers. When `npm run verify:mac:app` proves `CFBundleExecutable` exists, is executable, is arm64 Mach-O, and passes deep code-sign verification, treat that `open` result as a LaunchServices/session failure rather than proof that the bundle is missing its executable.

When a crash dialog appears after a Terminal/Codex launch, classify it with:

```bash
npm run diagnose:mac:launch
```

If the report says `RegisterApplication crash: yes`, the process died before Shibanshu Markdown Viewer's JavaScript or renderer loaded. Treat that as a launch-environment failure and still complete the normal desktop smoke test below.

For live UI testing inside a restricted terminal session, use the local browser runner:

```bash
npm run local:web
```

This serves the built renderer at a printed `http://127.0.0.1:<port>/` URL and avoids LaunchServices entirely. It is a preview/test route, not a replacement for the packaged `.app` smoke test.

Before a public release, run this on a normal macOS desktop session:

1. Unzip the Mac artifact.
2. Drag the app into `/Applications`.
3. Double-click the app.
4. Open a `.md`, `.markdown`, `.mdown`, `.mkd`, and `.txt` file.
5. Open a folder as a vault.
6. Use split, editor, preview, graph, mind map, search, export HTML, export PDF, and static publish.
7. Quit and reopen the app.

The app is not public-ready until the manual smoke test and `npm run release:readiness -- --arch arm64 --public` both pass.
