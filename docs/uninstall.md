# Uninstall

## macOS

1. Quit Shibanshu Markdown Viewer.
2. Remove `Shibanshu Markdown Viewer.app` from `/Applications` or wherever it was installed.
3. Optionally remove local app data:

```bash
rm -rf "$HOME/Library/Application Support/Shibanshu Markdown Viewer"
rm -rf "$HOME/Library/Saved Application State/com.shibanshujha.shibanshumarkdownviewer.savedState"
```

4. Optionally remove generated release or export files that you created manually, such as static publish folders, HTML/PDF exports, or Claude context maps.

## Notes

Removing the app does not delete Markdown files or vault folders. Those are ordinary local files and remain where the user saved them.
