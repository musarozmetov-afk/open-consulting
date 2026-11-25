#!/usr/bin/env python3
"""Check that every Russian text on the site has EN and KZ translations in i18n.js.

i18n.js looks up translations by the exact Russian source text, so a text
that is missing from the dictionary (or edited by even one character) stays
Russian for English and Kazakh visitors without any error.

Checks the same strings the browser translates:
  * text nodes inside <body> of index.html,
  * the attributes aria-label, placeholder, alt, content, value, title,
  * the page <title>,
  * Russian string literals in script.js (passed to localize()/setFormStatus()),
  * the default hero subtitle the admin API returns (functions/_lib/site-content.js).

Usage:
  python scripts/check-i18n.py            # report, exit 1 if something is missing
  python scripts/check-i18n.py --hook     # Claude Code hook mode (reads hook JSON
                                          # from stdin, exit 2 so Claude sees it)
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WATCHED = ("index.html", "i18n.js", "script.js", "site-content.js")
ATTRIBUTES = {"aria-label", "placeholder", "alt", "content", "value", "title"}
CYRILLIC = re.compile(r"[А-Яа-яЁё]")
JS_STRING = r'"((?:[^"\\]|\\.)*)"'
ENTRY = re.compile(r"^\s*" + JS_STRING + r"\s*:\s*\{(.*)\}\s*,?\s*$")
LANG_VALUE = re.compile(r"\b(en|kk)\s*:\s*" + JS_STRING)


def load_dictionary():
    entries = {}
    for line in (ROOT / "i18n.js").read_text(encoding="utf-8").splitlines():
        match = ENTRY.match(line)
        if not match:
            continue
        key = json.loads(f'"{match.group(1)}"')
        values = {lang: json.loads(f'"{text}"') for lang, text in LANG_VALUE.findall(match.group(2))}
        entries[key] = values
    return entries


class PageTexts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.texts = []  # (text, where)
        self.in_body = False
        self.skip = 0
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        if tag == "body":
            self.in_body = True
        if tag in ("script", "style"):
            self.skip += 1
        if tag == "title":
            self.in_title = True
        for name, value in attrs:
            if name in ATTRIBUTES and value:
                self.texts.append((value, f"<{tag} {name}>"))

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip = max(0, self.skip - 1)
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.texts.append((data, "<title>"))
        elif self.in_body and not self.skip:
            self.texts.append((data, "text"))

    def located(self, text, where):
        return text, f"index.html:{self.getpos()[0]} {where}"


def collect_sources():
    parser = PageTexts()
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    parser.feed(html)
    sources = [(text, f"index.html {where}") for text, where in parser.texts]

    script = (ROOT / "script.js").read_text(encoding="utf-8")
    for literal in re.findall(r"'((?:[^'\\]|\\.)*)'", script):
        sources.append((literal, "script.js"))

    site_content = ROOT / "functions" / "_lib" / "site-content.js"
    if site_content.exists():
        match = re.search(r"heroLead:\s*'((?:[^'\\]|\\.)*)'", site_content.read_text(encoding="utf-8"))
        if match:
            sources.append((match.group(1), "functions/_lib/site-content.js (admin default)"))
    return sources


def find_problems():
    dictionary = load_dictionary()
    problems, seen = [], set()
    for raw, where in collect_sources():
        text = raw.strip()
        if not text or not CYRILLIC.search(text) or text in seen:
            continue
        seen.add(text)
        entry = dictionary.get(text)
        if entry is None:
            problems.append(f"нет перевода: «{text}» ({where})")
            continue
        missing = [lang for lang in ("en", "kk") if not entry.get(lang, "").strip()]
        if missing:
            problems.append(f"нет {'/'.join(missing)}: «{text}» ({where})")
    return problems, len(seen)


def hook_should_run():
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return True
    tool_input = event.get("tool_input") or {}
    target = " ".join(str(tool_input.get(key, "")) for key in ("file_path", "command"))
    return any(name in target for name in WATCHED)


def main():
    hook = "--hook" in sys.argv
    if hook and not hook_should_run():
        return 0
    problems, checked = find_problems()
    if not problems:
        if not hook:
            print(f"OK: все {checked} русских строк переведены на EN и KZ.")
        return 0
    stream = sys.stderr if hook else sys.stdout
    print(f"Переводы i18n.js: {len(problems)} строк без перевода на EN/KZ "
          "(добавьте их в словарь translations в i18n.js, ключ — точный русский текст):", file=stream)
    for problem in problems:
        print(f"  - {problem}", file=stream)
    return 2 if hook else 1


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    sys.exit(main())
