# Content-Policy

## Quellenpolicy

Bei technischen, produktbezogenen und regulatorischen Aussagen werden
Primärquellen bevorzugt (Anbieterdokumentation, offizielle Spezifikationen,
Standards) statt SEO-Blogposts, wenn Primärquellen existieren. Siehe
`docs/QUELLEN.md` für die je Modul verwendeten Quellen dieser Ausbaustufe.

Keine dauerhaften Aussagen der Form "Modell X ist das beste Modell" –
Lerninhalt ist "Wie wähle ich ein Modell?" (Kriterien: Qualität, Latenz,
Kosten, Kontext, Werkzeugnutzung, strukturierte Ausgabe, Datenschutz,
Hosting, Verfügbarkeit, Anbieterrisiko), nicht eine feste Rangliste.

## Content-Freshness

Jede inhaltliche Einheit wird klassifiziert:

| Einstufung | Bedeutung                      | Beispiele in dieser Ausbaustufe                           |
| ---------- | ------------------------------ | --------------------------------------------------------- |
| `STABLE`   | ändert sich selten oder nie    | Terminal-Grundbefehle, HTTP-Grundlagen, was ein Token ist |
| `EVOLVING` | ändert sich über Monate/Jahre  | Transformer-Architekturdetails, Prompting-Praktiken       |
| `VOLATILE` | ändert sich über Wochen/Monate | konkrete Modellnamen, Preise, API-Parameter               |

Diese Ausbaustufe enthält bewusst **keine** `VOLATILE`-Inhalte (keine
konkreten Modellnamen, Preise oder API-Parameter werden als Lehrinhalt
behauptet) – das vermeidet das Freshness-Problem, bis ein
Content-Health-Adminbereich mit `verifiedAt`/`nextReviewAt`-Feldern gebaut
ist (siehe `docs/LEHRPLAN.md`, nächste Ausbauschritte). Wo ein Beispiel
unvermeidlich konkret wird (z. B. eine Beispiel-Tokenisierung), ist es als
illustratives Beispiel gekennzeichnet, nicht als aktuelle Tatsachenbehauptung
über ein bestimmtes Produkt.

## Keine Rechtsberatung

Governance-/Rechtsinhalte (EU AI Act, DSGVO usw.) sind nicht Teil dieser
Ausbaustufe. Sollten sie in einer späteren Ausbaustufe ergänzt werden, gilt
ab dann durchgehend: "Informations- und Lerninhalt, keine individuelle
Rechtsberatung."

## Keine Platzhalter als "fertig"

Kein "Coming soon" an Kernfunktionen, die als implementiert dargestellt
werden. Kein Platzhaltertext, keine Fake-Zahlen, keine simulierten
KI-Antworten außer ausdrücklich als Simulator/Lab gekennzeichnet (Terminal-
Simulator, Tokenizer, Context-Window, Prompt-Repair – alle vier sind
deterministisch und als Lab erkennbar beschriftet).

## Validierung

Jede Content-Einheit durchläuft `parseContent()`
(`src/domain/content/schema.ts`) vor dem Seeding. Geprüft werden unter
anderem: existierende Konzeptreferenzen, Zyklenfreiheit im Konzeptgraphen,
aufsteigende Hinweisstufen, Platzhaltertext, Lernziel-Formulierung
("kannst"/"erkennst"/"weißt", nie "kennenlernen"), mindestens eine Aufgabe
je Lektion mit Gerüst-Stufe ≥ 4.
