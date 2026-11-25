#!/usr/bin/env python3
"""Set a fresh ?v= cache-busting version on the site's CSS and JS links in index.html.

Browsers cache theme.css, i18n.js and script.js; without a new ?v= value
visitors can keep seeing the old design after a release.

Usage: python scripts/bump-version.py   (prints the new version)
"""
import re
import sys
from datetime import datetime
from pathlib import Path

INDEX = Path(__file__).resolve().parent.parent / "index.html"
ASSETS = ("theme.css", "i18n.js", "script.js")


def main():
    version = datetime.now().strftime("%Y%m%d-%H%M")
    html = INDEX.read_text(encoding="utf-8")
    total = 0
    for asset in ASSETS:
        html, count = re.subn(rf'(["\']){re.escape(asset)}(\?v=[^"\']*)?(["\'])',
                              rf"\g<1>{asset}?v={version}\g<3>", html)
        if count != 1:
            print(f"ОШИБКА: ссылка на {asset} найдена {count} раз(а), ожидалась 1 — index.html не изменён.")
            return 1
        total += count
    INDEX.write_text(html, encoding="utf-8")
    print(f"Версия файлов обновлена: ?v={version} ({total} ссылки)")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
