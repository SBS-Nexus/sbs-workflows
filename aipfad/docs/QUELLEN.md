# Quellen

Quellenpolicy: siehe [`CONTENT-POLICY.md`](CONTENT-POLICY.md). Diese Datei
listet, worauf sich die Lerninhalte dieser Ausbaustufe stützen.

## Grundsatz dieser Ausbaustufe

Alle Inhalte in Stufe 0, 1, 4 und 5 sind **etabliertes, stabiles bis
langsam wandelndes Fachwissen** (Tokenisierung, Transformer-Architektur auf
konzeptioneller Ebene, Terminal-Grundlagen, Prompting-Prinzipien) — keine
`VOLATILE`-Behauptungen über konkrete Modelle, Preise oder API-Parameter
(siehe `CONTENT-POLICY.md`). Deshalb sind hier bewusst **keine
Primärquellen-Zitate mit Versionsstand** nötig, wie es bei Stufe 7
(AI-APIs) oder Stufe 17 (Governance) unvermeidlich wäre.

## Fachliche Grundlage je Modul

| Modul                           | Fachliche Basis                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orientierung                    | Produktentscheidungen dieser Anwendung selbst (Lernprinzip, Kompetenzmodell) — keine externe Quelle nötig.                                                                                                                                                                                                                                                                                                                                               |
| Technischer Arbeitsplatz        | POSIX-Terminalgrundlagen (`pwd`, `ls`, `cd`, `mkdir`, `cat`, `rm` — seit Jahrzehnten stabile Semantik), Umgebungsvariablen-Konvention (`.env`), Git-`.gitignore`-Mechanismus. Allgemein etabliertes Entwickler-Grundwissen, nicht anbieterspezifisch.                                                                                                                                                                                                    |
| LLM-Grundlagen                  | Konzeptionelle Beschreibung von Tokenisierung, Embeddings, Transformer-Aufmerksamkeit, Training/Inferenz, Kontextfenstern und Halluzination auf dem Niveau, wie es in der breiten Fachliteratur zu Transformer-Modellen (seit "Attention Is All You Need", Vaswani et al. 2017, als Grundlagenarbeit) und in gängigen Einführungen beschrieben wird — bewusst ohne Bezug auf ein konkretes, aktuelles Modell oder dessen genaue Parameterzahl.           |
| Prompting-Grundlagen            | Allgemein anerkannte Prompting-Prinzipien (Ziel/Kontext/Constraints/Beispiele/Zerlegung/Iteration), wie sie in Prompting-Leitfäden verschiedener AI-Anbieter übereinstimmend beschrieben werden — als Prinzip dargestellt, nicht als Zitat eines einzelnen Anbieters.                                                                                                                                                                                    |
| Embeddings & semantische Suche  | Lineare Algebra auf Schulniveau (Skalarprodukt, euklidische Norm, Kosinus des Winkels) und die Standardbegriffe des Information Retrieval (Ranking, Top-k, Precision, Recall), wie sie in jeder Einführung in Information Retrieval stehen. Chunking und die Grenzen von Embeddings (Verneinung, seltene Fachbegriffe, Modellwechsel) als allgemein beschriebene Eigenschaften, ohne Bezug auf ein bestimmtes Modell.                                    |
| RAG – Wissen mit Quellen nutzen | Das Grundprinzip von Retrieval-Augmented Generation (Lewis et al. 2020, „Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks") als allgemein beschriebener Ablauf: Abschnitte suchen, in den Kontext geben, nur daraus antworten. Chunking, Kontextbudget, Quellenbelege und die Trennung von Retrieval- und Antwortqualität als verbreitete, anbieterneutrale Praxis — ohne Bezug auf ein Modell, ein Framework oder eine Vektordatenbank. |

## Illustrative Beispiele (kein Faktenanspruch)

Die Tokenizer-Beispiele (Landing-Page-Hero, Tokenizer-Lab) sind
**redaktionell festgelegt, nicht von einem echten Tokenizer berechnet**.
Sie sind als "Beispielhafte Zerlegung" gekennzeichnet und zeigen das
Prinzip der Subwort-Tokenisierung, nicht die exakte Ausgabe eines
bestimmten Anbieters oder Modells zu einem bestimmten Zeitpunkt.

Die Vektoren des Labs „Semantische Suche verstehen" und die daraus
berechneten Scores in den Lektionen von Stufe 9 sind ebenfalls
**redaktionell festgelegte, didaktische Beispielvektoren** mit benannten
Dimensionen. Sie stammen nicht von einem Embedding-Modell; der
Konfigurationsvertrag verlangt dafür die Angabe `vektorHerkunft:
'didaktisch'`, und ein Unit-Test prüft, dass die in den Lektionen
zitierten Werte mit dem übereinstimmen, was das Lab berechnet.

Der Wissensbestand des RAG-Pipeline-Labs (HR-URLAUB, HR-KRANK, FIN-REISE,
IT-ZUGANG) ist **vollständig synthetisch**; die Regeln sind erfunden und
gelten für kein reales Unternehmen. Satzvektoren sind redaktionell
festgelegt, das Budget zählt Wörter, und die „Antworten" sind vorgegebene
Aussagen mit verknüpften Belegen — keine Modellausgabe. Die Konfiguration
verlangt dafür ausdrücklich `simulation: { vektoren: 'didaktisch',
einheiten: 'woerter', antwort: 'vorgegebene-bausteine' }`. Ein Unit-Test
prüft, dass die in den Lektionen zitierten Scores, Einheiten und Kennzahlen
mit dem übereinstimmen, was das Lab berechnet.

## Wenn spätere Ausbaustufen Primärquellen brauchen

Ab Stufe 7 (AI-APIs), Stufe 13 (AI-Coding) und Stufe 17 (Governance) wird
diese Datei um eine Tabelle mit Quelle, Abrufdatum und `nextReviewAt`
erweitert (siehe `CONTENT-POLICY.md#content-freshness`) — bevorzugt
Anbieterdokumentation und offizielle Rechtstexte, keine SEO-Blogposts, wo
Primärquellen existieren.
