/**
 * Python-Testgerüst.
 *
 * Läuft innerhalb von Pyodide und ist bewusst als Zeichenkette abgelegt: So
 * bleibt es zusammen mit dem Worker gebündelt und benötigt keinen zusätzlichen
 * Netzwerkabruf zur Laufzeit.
 *
 * Aufgaben des Gerüsts:
 *  - jeden Testfall in einem frischen Namensraum ausführen (keine Übertragung
 *    von Zuständen zwischen Tests)
 *  - `input()` durch eine vorbereitete Liste von Eingaben ersetzen
 *  - Standardausgabe je Testfall getrennt einsammeln
 *  - Tracebacks so kürzen, dass nur der Code der lernenden Person sichtbar ist
 */
export const HARNESS_SOURCE = String.raw`
import builtins
import io
import json
import sys
import traceback

USER_FILENAME = "<exec>"


class _EingabeErschoepft(Exception):
    """Wird ausgelöst, wenn input() öfter aufgerufen wird als Eingaben da sind."""


def _make_input(values, echo):
    """Ersetzt input() durch eine vorbereitete Liste von Eingaben.

    Beim freien Ausführen (echo=True) verhält sich das wie ein Terminal: Die
    Frage und die eingetippte Antwort erscheinen in der Ausgabe. Beim Prüfen
    (echo=False) bleibt beides unsichtbar – sonst hinge das Testergebnis davon
    ab, welchen Fragetext die lernende Person gewählt hat.
    """
    queue = list(values)

    def _input(prompt=""):
        if echo and prompt:
            print(prompt, end="")
        if not queue:
            raise _EingabeErschoepft(
                "Das Programm fragt mehr Eingaben ab, als für diesen Testfall vorgesehen sind."
            )
        value = queue.pop(0)
        if echo:
            print(value)
        return value

    return _input


def _clean_traceback(exc, user_source):
    """Erzeugt einen Traceback, der nur Zeilen aus dem Nutzercode zeigt."""
    lines = traceback.format_exception(type(exc), exc, exc.__traceback__)
    kept = []
    skip_next = False
    for line in lines:
        if line.startswith("Traceback (most recent call last)"):
            kept.append(line)
            continue
        if 'File "' in line and USER_FILENAME not in line:
            skip_next = True
            continue
        if skip_next and line.startswith("    "):
            skip_next = False
            continue
        skip_next = False
        kept.append(line)
    text = "".join(kept)
    if len(kept) <= 1:
        text = "".join(lines)
    return text.rstrip()


def _describe_error(exc, user_source):
    line = None
    tb = exc.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == USER_FILENAME:
            line = tb.tb_lineno
        tb = tb.tb_next
    if isinstance(exc, SyntaxError) and exc.lineno:
        line = exc.lineno
    return {
        "type": type(exc).__name__,
        "message": str(exc),
        "line": line,
        "traceback": _clean_traceback(exc, user_source),
    }


class _MitschreibenderPuffer(io.StringIO):
    """Sammelt die Ausgabe UND reicht sie sofort nach draußen weiter.

    Ohne das Weiterreichen ginge bei einem Abbruch (Zeitüberschreitung oder
    Stopp-Knopf) die gesamte bis dahin erzeugte Ausgabe verloren – gerade bei
    einer Endlosschleife ist sie aber der wichtigste Hinweis auf die Ursache.
    """

    def __init__(self, weiterleiten):
        super().__init__()
        self._weiterleiten = weiterleiten

    def write(self, text):
        if self._weiterleiten is not None:
            self._weiterleiten.write(text)
            self._weiterleiten.flush()
        return super().write(text)


def _normalize(text):
    lines = text.replace("\r\n", "\n").split("\n")
    lines = [l.rstrip() for l in lines]
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def _execute(user_code, stdin_values, setup=None, assertion=None, echo_input=False, stream=False):
    """Führt einen einzelnen Lauf aus und liefert (stdout, fehler-dict|None)."""
    namespace = {"__name__": "__main__", "__builtins__": builtins}

    original_stdout = sys.stdout
    # Beim freien Ausführen wird die Ausgabe fortlaufend weitergereicht. Bei
    # Testläufen nicht: Dort würde die Ausgabe aller Testfälle den
    # Ausgabebereich fluten.
    buffer = _MitschreibenderPuffer(original_stdout if stream else None)

    original_input = builtins.input
    sys.stdout = buffer
    builtins.input = _make_input(stdin_values or [], echo_input)

    error = None
    try:
        if setup:
            exec(compile(setup, "<setup>", "exec"), namespace)
        exec(compile(user_code, USER_FILENAME, "exec"), namespace)
        if assertion:
            exec(compile(assertion, "<pruefung>", "exec"), namespace)
    except BaseException as exc:  # noqa: BLE001 - alles melden, nichts verschlucken
        error = _describe_error(exc, user_code)
    finally:
        sys.stdout = original_stdout
        builtins.input = original_input

    return buffer.getvalue(), error


def run_plain(user_code, stdin_values):
    stdout, error = _execute(user_code, stdin_values, echo_input=True, stream=True)
    return json.dumps({"stdout": stdout, "error": error, "testResults": []})


def run_tests(user_code, cases):
    results = []
    first_error = None
    combined_stdout = []

    for case in cases:
        stdout, error = _execute(
            user_code,
            case.get("stdin") or [],
            case.get("setup"),
            case.get("assertion"),
        )
        combined_stdout.append(stdout)

        if error is not None:
            if first_error is None:
                first_error = error
            if error["type"] == "AssertionError":
                message = error["message"] or "Die Prüfung dieses Testfalls ist nicht erfüllt."
            elif error["type"] == "_EingabeErschoepft":
                message = error["message"]
            else:
                message = "Das Programm bricht mit " + error["type"] + " ab."
            results.append(
                {
                    "id": case["id"],
                    "name": case["name"],
                    "passed": False,
                    "message": message,
                    "actualStdout": stdout,
                }
            )
            continue

        expected = case.get("expectedStdout")
        if expected is None:
            results.append({"id": case["id"], "name": case["name"], "passed": True})
            continue

        actual_norm = _normalize(stdout)
        expected_norm = _normalize(expected)
        if actual_norm == expected_norm:
            results.append({"id": case["id"], "name": case["name"], "passed": True})
        else:
            results.append(
                {
                    "id": case["id"],
                    "name": case["name"],
                    "passed": False,
                    "message": "Die Ausgabe stimmt noch nicht mit der Erwartung überein.",
                    "actualStdout": stdout,
                    "expectedStdout": expected,
                }
            )

    return json.dumps(
        {
            "stdout": "".join(combined_stdout),
            "error": first_error,
            "testResults": results,
        }
    )
`;
