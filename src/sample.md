---
title: Shibanshu Markdown Viewer
---

# Shibanshu Markdown Viewer

Open a Markdown file from Finder, the app menu, the toolbar, or drag and drop.

## Rendering

- GitHub-Flavored Markdown
- Sanitized HTML preview
- Syntax highlighting
- Mermaid diagrams
- KaTeX math
- GitHub-style alerts
- Local HTML and PDF export

```javascript
function renderMarkdown(markdown) {
  return sanitize(parse(markdown));
}
```

> [!NOTE]
> The renderer is local-first. File access stays in the Electron main process.

```mermaid
flowchart LR
  A[Open file] --> B[Parse Markdown]
  B --> C[Sanitize HTML]
  C --> D[Render Preview]
```

Inline math uses `\(...\)`, for example \(E = mc^2\).

$$
\sum_{i=1}^{n} i^2 = \frac{n(n+1)(2n+1)}{6}
$$
