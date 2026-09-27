#!/usr/bin/env python3
"""Inline the CSS and JS into one self-contained HTML file (handy for sharing or hosting).

Usage: python3 tools/bundle.py [output-path]   (default: dist/nats-otter-raft.html)
"""
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / "dist" / "nats-otter-raft.html"
html = (root / "index.html").read_text()

html = re.sub(
    r'<link rel="stylesheet" href="(css/[^"]+)">',
    lambda m: "<style>\n" + (root / m.group(1)).read_text() + "</style>",
    html,
)
html = re.sub(
    r'<script src="(js/[^"]+)"></script>',
    lambda m: "<script>\n" + (root / m.group(1)).read_text() + "</script>",
    html,
)
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html)
print(f"wrote {out} ({len(html) // 1024} KB)")
