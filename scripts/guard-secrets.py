#!/usr/bin/env python3
"""Claude Code PreToolUse hook: refuse writes that would put a secret into the repository.

ADMIN_SETUP.md says the admin key and the Supabase secret key live only in
Cloudflare Pages secrets. This hook blocks a Write/Edit whose new content, or a
Bash command, contains an actual secret value:
  * a Supabase secret API key (sb_secret_...) or a service_role JWT,
  * an assignment of a value to ADMIN_KEY or SUPABASE_SECRET_KEY.
Mentioning the variable names in documentation (`ADMIN_KEY` — ключ админки) is fine.

Exit 2 blocks the tool call and shows the reason to Claude.
"""
import json
import re
import sys

PATTERNS = [
    (re.compile(r"sb_secret_[A-Za-z0-9_\-]{10,}"), "секретный ключ Supabase (sb_secret_…)"),
    (re.compile(r"eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]*cm9sZSI6InNlcnZpY2Vfcm9sZS[A-Za-z0-9_\-]*\.[A-Za-z0-9_\-]+"),
     "JWT с ролью service_role"),
    (re.compile(r"\b(ADMIN_KEY|SUPABASE_SECRET_KEY)\b\s*[:=]\s*['\"]?(?!\$|<|\{|process\.env|env\.)[^\s'\"`,;)]{6,}"),
     "значение ADMIN_KEY или SUPABASE_SECRET_KEY"),
]


def texts(tool_input):
    for key in ("content", "new_string", "command"):
        value = tool_input.get(key)
        if isinstance(value, str):
            yield value
    for edit in tool_input.get("edits") or []:
        if isinstance(edit, dict) and isinstance(edit.get("new_string"), str):
            yield edit["new_string"]


def main():
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    tool_input = event.get("tool_input") or {}
    for text in texts(tool_input):
        for pattern, label in PATTERNS:
            if pattern.search(text):
                target = tool_input.get("file_path") or "команда Bash"
                print(f"Заблокировано: {target} содержит {label}. Секреты хранятся только в "
                      "Cloudflare Pages → Settings → Variables and Secrets (см. ADMIN_SETUP.md), "
                      "не в файлах репозитория и не в командах.", file=sys.stderr)
                return 2
    return 0


if __name__ == "__main__":
    sys.stderr.reconfigure(encoding="utf-8")
    sys.exit(main())
