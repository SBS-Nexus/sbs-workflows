"""Prueft jede hinterlegte Musterloesung gegen ihre eigenen Testfaelle.

Das Skript bildet die Semantik des Browser-Testgeruests
(src/lib/runner/harness-source.ts) exakt nach: frischer Namensraum je Testfall,
input() aus einer vorbereiteten Liste ohne Echo, Vergleich der normalisierten
Standardausgabe.

Aufruf:
    npx tsx scripts/dump-code-exercises.ts > /tmp/exercises.json
    python3 scripts/verify_solutions.py /tmp/exercises.json [referenzloesungen.json]

Der zweite, optionale Parameter enthaelt Referenzloesungen fuer Projekte, deren
Startdateien absichtlich unvollstaendig oder fehlerhaft sind.
"""

from __future__ import annotations

import builtins
import io
import json
import re
import sys
import traceback

USER_FILENAME = "<exec>"


class EingabeErschoepft(Exception):
    pass


def make_input(values, echo):
    queue = list(values)

    def _input(prompt=""):
        if echo and prompt:
            print(prompt, end="")
        if not queue:
            raise EingabeErschoepft("Mehr Eingaben abgefragt als vorgesehen.")
        value = queue.pop(0)
        if echo:
            print(value)
        return value

    return _input


def normalize(text):
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def execute(user_code, stdin_values, setup=None, assertion=None):
    namespace = {"__name__": "__main__", "__builtins__": builtins}
    buffer = io.StringIO()
    original_stdout, original_input = sys.stdout, builtins.input
    sys.stdout = buffer
    builtins.input = make_input(stdin_values or [], False)
    error = None
    try:
        if setup:
            exec(compile(setup, "<setup>", "exec"), namespace)
        exec(compile(user_code, USER_FILENAME, "exec"), namespace)
        if assertion:
            exec(compile(assertion, "<pruefung>", "exec"), namespace)
    except BaseException as exc:  # noqa: BLE001
        error = "".join(traceback.format_exception_only(type(exc), exc)).strip()
    finally:
        sys.stdout = original_stdout
        builtins.input = original_input
    return buffer.getvalue(), error


def check_source(solution, checks):
    problems = []
    for check in checks:
        must_match = check.get("mustMatch")
        must_not_match = check.get("mustNotMatch")
        if must_match and not re.search(must_match, solution, re.MULTILINE):
            problems.append(f"sourceCheck {check['id']}: mustMatch trifft nicht zu")
        if must_not_match and re.search(must_not_match, solution, re.MULTILINE):
            problems.append(f"sourceCheck {check['id']}: mustNotMatch trifft zu")
    return problems


def main() -> int:
    with open(sys.argv[1], encoding="utf-8") as handle:
        entries = json.load(handle)

    overrides = {}
    if len(sys.argv) > 2:
        with open(sys.argv[2], encoding="utf-8") as handle:
            overrides = json.load(handle)

    failures = 0
    checked = 0

    for entry in entries:
        solution = overrides.get(entry["slug"], entry["solution"])
        if not solution.strip():
            print(f"  ! {entry['slug']}: keine Loesung hinterlegt, uebersprungen")
            continue

        problems = check_source(solution, entry["sourceChecks"])

        for test in entry["tests"]:
            checked += 1
            stdout, error = execute(
                solution,
                test.get("stdin"),
                test.get("setup"),
                test.get("assertion"),
            )
            if error:
                problems.append(f"Test {test['id']} ({test['name']}): {error}")
                continue
            expected = test.get("expectedStdout")
            if expected is not None and normalize(stdout) != normalize(expected):
                problems.append(
                    f"Test {test['id']} ({test['name']}): Ausgabe weicht ab\n"
                    f"      erwartet: {normalize(expected)!r}\n"
                    f"      erhalten: {normalize(stdout)!r}"
                )

        if problems:
            failures += 1
            print(f"  X {entry['slug']}")
            for problem in problems:
                print(f"      {problem}")
        else:
            print(f"  OK {entry['slug']} ({len(entry['tests'])} Tests)")

    print(f"\n{checked} Testfaelle geprueft, {failures} Eintraege mit Problemen.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
