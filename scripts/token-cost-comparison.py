#!/usr/bin/env python3
"""
Token cost comparison: raw file reading vs MCP context map.
Measures actual token counts using tiktoken and calculates cost per model.
"""

import os
import sys
import tiktoken

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHIBANSHU_DIR = os.path.join(ROOT, ".shibanshu")

# Files to skip (not source code, build artifacts, etc.)
IGNORED_DIRS = {
    "node_modules", ".git", ".shibanshu", ".athena", "release", "dist",
    ".DS_Store",
    "android/app/src/main/assets/public/assets",
    "android/app/build",
}
SOURCE_EXTENSIONS = {
    ".js", ".mjs", ".cjs", ".ts", ".jsx", ".tsx",
    ".json", ".md", ".css", ".html", ".yaml", ".yml",
}

# Model pricing per 1M tokens (input / output)
MODELS = {
    "Claude Opus 4": {"input": 15.00, "output": 75.00},
    "Claude Sonnet 4": {"input": 3.00, "output": 15.00},
    "GPT-4.1": {"input": 2.00, "output": 8.00},
    "GPT-4o": {"input": 2.50, "output": 10.00},
    "GPT-o3": {"input": 10.00, "output": 40.00},
}

# Typical session: Claude reads files to answer an architecture question
# Without MCP: reads ~30-80% of source files exploring
# With MCP: reads the navigation map + maybe 3-5 targeted files
TARGETED_FILES_WITH_MCP = 5
AVG_FILE_TOKENS = 800  # average source file when targeted


def walk_source_files(root):
    """Walk all source files, skipping ignored dirs."""
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        rel = os.path.relpath(dirpath, root)
        # Skip ignored directories
        dirnames[:] = [
            d for d in dirnames
            if not any(rel.startswith(ig) or d == ig for ig in IGNORED_DIRS)
        ]
        for f in filenames:
            ext = os.path.splitext(f)[1].lower()
            if ext in SOURCE_EXTENSIONS:
                files.append(os.path.join(dirpath, f))
    return files


def count_tokens(text, enc):
    """Count tokens using tiktoken."""
    return len(enc.encode(text, disallowed_special=()))


def read_file_safe(path):
    """Read file, return empty string on error."""
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception:
        return ""


def format_cost(cost):
    if cost < 0.01:
        return f"${cost:.4f}"
    return f"${cost:.2f}"


def main():
    enc = tiktoken.encoding_for_model("gpt-4o")  # cl100k_base, close enough for both

    # --- RAW: count all source file tokens ---
    source_files = walk_source_files(ROOT)
    raw_tokens = 0
    file_token_counts = []
    for f in source_files:
        content = read_file_safe(f)
        t = count_tokens(content, enc)
        raw_tokens += t
        file_token_counts.append((os.path.relpath(f, ROOT), t))

    file_token_counts.sort(key=lambda x: -x[1])

    # --- MCP: count context map tokens ---
    nav_content = read_file_safe(os.path.join(SHIBANSHU_DIR, "claude-context-navigation.md"))
    map_content = read_file_safe(os.path.join(SHIBANSHU_DIR, "claude-context-map.md"))

    nav_tokens = count_tokens(nav_content, enc)
    map_tokens = count_tokens(map_content, enc)

    # With MCP, Claude reads navigation + ~5 targeted files
    mcp_tokens = nav_tokens + (TARGETED_FILES_WITH_MCP * AVG_FILE_TOKENS)

    # Realistic "without MCP" — Claude typically reads 40-60% of files exploring
    explore_pct = 0.50
    explore_tokens = int(raw_tokens * explore_pct)

    print("=" * 70)
    print("TOKEN COST COMPARISON: Raw Reading vs MCP Context Map")
    print("=" * 70)
    print(f"\nRepo: {ROOT}")
    print(f"Source files found: {len(source_files)}")
    print(f"Total raw tokens (all files): {raw_tokens:,}")
    print()

    print("-" * 70)
    print("TOP 15 LARGEST FILES (token count)")
    print("-" * 70)
    for path, t in file_token_counts[:15]:
        print(f"  {t:>8,}  {path}")

    print()
    print("-" * 70)
    print("SCENARIO COMPARISON")
    print("-" * 70)

    scenarios = {
        "WITHOUT MCP (Claude explores ~50% of files)": explore_tokens,
        "WITHOUT MCP (Claude reads ALL files)": raw_tokens,
        "WITH MCP (navigation map only)": nav_tokens,
        "WITH MCP (navigation + 5 targeted files)": mcp_tokens,
        "WITH MCP (full map)": map_tokens,
    }

    for name, tokens in scenarios.items():
        print(f"\n  {name}")
        print(f"  Tokens: {tokens:,}")

    print()
    print("-" * 70)
    print("COST PER SESSION (input tokens only)")
    print("-" * 70)

    header = f"  {'Scenario':<45}"
    for model in MODELS:
        header += f" {model:>16}"
    print(header)
    print("  " + "-" * (45 + 17 * len(MODELS)))

    for name, tokens in scenarios.items():
        row = f"  {name:<45}"
        for model, pricing in MODELS.items():
            cost = (tokens / 1_000_000) * pricing["input"]
            row += f" {format_cost(cost):>16}"
        print(row)

    print()
    print("-" * 70)
    print("SAVINGS: MCP (nav + 5 files) vs Without MCP (50% explore)")
    print("-" * 70)

    saved_tokens = explore_tokens - mcp_tokens
    saved_pct = (saved_tokens / explore_tokens) * 100

    print(f"  Tokens saved per session: {saved_tokens:,} ({saved_pct:.1f}%)")
    print(f"  Compression ratio: {explore_tokens / mcp_tokens:.0f}:1")
    print()

    print(f"  {'Model':<20} {'Cost without':>14} {'Cost with':>14} {'Saved/session':>14} {'Saved/month*':>14}")
    print("  " + "-" * 76)

    for model, pricing in MODELS.items():
        cost_without = (explore_tokens / 1_000_000) * pricing["input"]
        cost_with = (mcp_tokens / 1_000_000) * pricing["input"]
        saved = cost_without - cost_with
        monthly = saved * 40  # ~40 sessions/month (2/day × 20 workdays)
        print(f"  {model:<20} {format_cost(cost_without):>14} {format_cost(cost_with):>14} {format_cost(saved):>14} {format_cost(monthly):>14}")

    print()
    print("  * Monthly estimate assumes 40 sessions/month (2 per workday)")
    print()

    print("-" * 70)
    print("CONTEXT WINDOW FIT")
    print("-" * 70)
    windows = {"Claude (200K)": 200_000, "GPT-4o (128K)": 128_000, "GPT-o3 (200K)": 200_000}
    for name, window in windows.items():
        raw_pct = (explore_tokens / window) * 100
        mcp_pct = (mcp_tokens / window) * 100
        print(f"  {name}: Without MCP uses {raw_pct:.0f}% of window | With MCP uses {mcp_pct:.0f}% of window")

    print()


if __name__ == "__main__":
    main()
