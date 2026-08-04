"""Prueft die schrittweise Aufzeichnung des Testgeruests.

Anders als verify_solutions.py bildet dieses Skript das Geruest nicht nach,
sondern fuehrt genau den Quelltext aus, der auch im Browser laeuft: Es liest
HARNESS_SOURCE aus src/lib/runner/harness-source.ts und fuehrt ihn aus. Damit
kann die Aufzeichnung nicht auseinanderlaufen, ohne dass es hier auffaellt.

Aufruf:
    python3 scripts/verify_tracer.py
"""

from __future__ import annotations

import json
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
HARNESS_FILE = REPO / "src" / "lib" / "runner" / "harness-source.ts"


def load_harness() -> dict:
    """Liest HARNESS_SOURCE aus der TypeScript-Datei und fuehrt ihn aus."""
    text = HARNESS_FILE.read_text(encoding="utf-8")
    match = re.search(r"String\.raw`(.*)`;", text, re.DOTALL)
    if not match:
        raise SystemExit("HARNESS_SOURCE nicht gefunden.")

    source = match.group(1)
    if "${" in source:
        raise SystemExit(
            "Das Geruest enthaelt eine Template-Einsetzung. Dann stimmt der hier "
            "ausgefuehrte Quelltext nicht mehr mit dem im Browser ueberein."
        )

    namespace: dict = {}
    exec(compile(source, str(HARNESS_FILE), "exec"), namespace)
    return namespace


FAILURES: list[str] = []


def check(bedingung: bool, beschreibung: str) -> None:
    if bedingung:
        print(f"  ok   {beschreibung}")
    else:
        print(f"  FEHL {beschreibung}")
        FAILURES.append(beschreibung)


def main() -> int:
    harness = load_harness()
    run_traced = harness["run_traced"]

    # --- Fall 1: geradliniges Programm -------------------------------------
    print("Fall 1: Zuweisungen und print")
    code = 'name = "Yusuf"\ngruss = "Hallo, " + name\nprint(gruss)\n'
    trace = json.loads(run_traced(code, [], 1500))

    check(trace["error"] is None, "laeuft ohne Fehler")
    check(trace["truncated"] is False, "wird nicht abgeschnitten")
    check(trace["stdout"] == "Hallo, Yusuf\n", "erzeugt die erwartete Ausgabe")

    line_steps = [s for s in trace["steps"] if s["event"] == "line"]
    check([s["line"] for s in line_steps] == [1, 2, 3], "besucht die Zeilen 1, 2, 3 der Reihe nach")

    erster = line_steps[0]
    check(erster["variables"] == [], "kennt vor Zeile 1 noch keine Variable")

    zweiter = line_steps[1]
    check(
        [v["name"] for v in zweiter["variables"]] == ["name"],
        "kennt vor Zeile 2 genau die Variable name",
    )
    check(
        zweiter["variables"][0]["value"] == "'Yusuf'"
        and zweiter["variables"][0]["type"] == "str",
        "gibt Wert und Typ von name richtig an",
    )

    dritter = line_steps[2]
    check(
        [v["name"] for v in dritter["variables"]] == ["gruss", "name"],
        "hat vor Zeile 3 beide Variablen, alphabetisch sortiert",
    )
    check(
        dritter["stdoutLength"] == 0,
        "hat vor Zeile 3 noch nichts ausgegeben (der Zustand ist der VOR der Zeile)",
    )

    letzter = trace["steps"][-1]
    check(letzter["event"] == "return", "endet mit einem return-Schritt")
    check(letzter["stdoutLength"] == len("Hallo, Yusuf\n"), "kennt am Ende die volle Ausgabelaenge")

    # --- Fall 2: Schleife ---------------------------------------------------
    print("Fall 2: Schleife")
    code = "summe = 0\nfor zahl in [1, 2, 3]:\n    summe = summe + zahl\nprint(summe)\n"
    trace = json.loads(run_traced(code, [], 1500))

    check(trace["stdout"] == "6\n", "rechnet richtig")
    besuche = {}
    for s in trace["steps"]:
        if s["event"] == "line":
            besuche[s["line"]] = besuche.get(s["line"], 0) + 1
    check(besuche.get(3) == 3, "fuehrt den Schleifenrumpf dreimal aus")
    check(besuche.get(2) == 4, "prueft die Schleifenbedingung viermal (drei Werte plus Abbruch)")

    # --- Fall 3: Funktionsaufruf -------------------------------------------
    print("Fall 3: Funktion")
    code = "def verdopple(x):\n    return x * 2\n\nergebnis = verdopple(21)\nprint(ergebnis)\n"
    trace = json.loads(run_traced(code, [], 1500))

    check(trace["stdout"] == "42\n", "gibt 42 aus")
    tiefen = {s["depth"] for s in trace["steps"]}
    check(1 in tiefen, "erreicht Aufruftiefe 1")
    rueckgaben = [s for s in trace["steps"] if s["event"] == "return" and s["function"] == "verdopple"]
    check(len(rueckgaben) == 1, "verzeichnet genau eine Rueckkehr aus verdopple")
    check(rueckgaben[0].get("returnValue") == "42", "haelt den Rueckgabewert 42 fest")
    check(
        all(s["function"] != "verdopple" or s["depth"] == 1 for s in trace["steps"]),
        "ordnet die Schritte in verdopple der Tiefe 1 zu",
    )

    # Die Funktion selbst darf nicht als Variable in der Tabelle auftauchen.
    letzte_modulzeile = [
        s for s in trace["steps"] if s["event"] == "line" and s["function"] == "<module>"
    ][-1]
    check(
        all(v["name"] != "verdopple" for v in letzte_modulzeile["variables"]),
        "blendet die Funktion selbst aus der Variablentabelle aus",
    )

    # --- Fall 4: Fehler ------------------------------------------------------
    print("Fall 4: Programm mit Fehler")
    code = "a = 1\nb = 0\nprint(a / b)\n"
    trace = json.loads(run_traced(code, [], 1500))

    check(trace["error"] is not None, "meldet den Fehler")
    check(trace["error"]["type"] == "ZeroDivisionError", "benennt den Fehlertyp")
    check(trace["error"]["line"] == 3, "nennt die richtige Zeile")
    check(len(trace["steps"]) >= 3, "haelt die Schritte bis zum Fehler fest")

    # --- Fall 5: Deckelung ---------------------------------------------------
    print("Fall 5: Deckelung der Schrittzahl")
    code = "i = 0\nwhile i < 10000:\n    i = i + 1\n"
    trace = json.loads(run_traced(code, [], 50))

    check(trace["truncated"] is True, "meldet die Kuerzung")
    check(len(trace["steps"]) <= 50, "haelt die Obergrenze ein")

    # --- Fall 6: input() -----------------------------------------------------
    print("Fall 6: Eingaben")
    code = 'name = input("Wie heisst du? ")\nprint("Hallo", name)\n'
    trace = json.loads(run_traced(code, ["Mara"], 1500))

    check(trace["error"] is None, "laeuft ohne Fehler")
    check("Hallo Mara" in trace["stdout"], "verwendet die vorbereitete Eingabe")

    # --- Fall 7: kaputtes __repr__ ------------------------------------------
    print("Fall 7: Wert, der sich nicht darstellen laesst")
    code = (
        "class Kaputt:\n"
        "    def __repr__(self):\n"
        "        raise ValueError('nein')\n"
        "\n"
        "x = Kaputt()\n"
        "y = 1\n"
    )
    trace = json.loads(run_traced(code, [], 1500))
    check(trace["error"] is None, "bringt die Aufzeichnung nicht zum Absturz")
    werte = [v["value"] for s in trace["steps"] for v in s["variables"] if v["name"] == "x"]
    check(
        werte and all(v == "<nicht darstellbar>" for v in werte),
        "faengt das kaputte __repr__ ab",
    )

    print()
    if FAILURES:
        print(f"{len(FAILURES)} Pruefung(en) fehlgeschlagen.")
        return 1
    print("Alle Pruefungen der Aufzeichnung bestanden.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
