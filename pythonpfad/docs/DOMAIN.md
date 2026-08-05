# Eigene Domain: von der Bestellung bis zum ersten Aufruf

Diese Anleitung beschreibt den Weg von einer bei Strato bestellten Domain bis zu
einer erreichbaren, verschlüsselten Installation. Sie ergänzt
[DEPLOYMENT.md](./DEPLOYMENT.md), das den Betrieb selbst beschreibt.

---

## 1. Das Wichtigste zuerst: Strato-Webhosting reicht nicht

Das muss vor der Bestellung klar sein, weil es sonst zu einer teuren
Enttäuschung führt:

**Eine Domain bei Strato zu kaufen ist genau richtig. Ein Strato-Webhosting-Paket
kann diese Anwendung aber nicht betreiben.**

Die klassischen Webhosting-Pakete sind für PHP und statische Dateien gedacht.
PythonPfad braucht:

- einen dauerhaft laufenden **Node.js-Prozess** (Version 22 oder neuer),
- eine **PostgreSQL-Datenbank**,
- die Möglichkeit, eigene Prozesse zu starten und Ports zu belegen.

Nichts davon bietet Shared Hosting. Wer es trotzdem versucht, bekommt eine
Domain, die auf ein leeres Verzeichnis zeigt.

### Die drei gangbaren Wege

| Weg                                               | Aufwand                                   | Passt, wenn                        |
| ------------------------------------------------- | ----------------------------------------- | ---------------------------------- |
| **A. Strato V-Server / VPS**                      | Server selbst einrichten und pflegen      | alles aus einer Hand sein soll     |
| **B. Domain bei Strato, Betrieb woanders**        | Anbieter kümmert sich um Laufzeit und TLS | der Betrieb wenig Zeit kosten soll |
| **C. Eigener Server (Hetzner, Netcup, zu Hause)** | wie A                                     | ohnehin schon ein Server läuft     |

Die Domain wird in allen drei Fällen bei Strato bestellt. Unterschiedlich ist
nur, worauf sie zeigt.

---

## 2. Welche Domain

Empfohlen: **`pythonpfad.de`**

Begründung: Die Anwendung ist durchgehend deutschsprachig und richtet sich an
deutschsprachige Anfängerinnen und Anfänger. `.de` ist dafür die naheliegende
Endung, sie ist bei Strato am günstigsten, und sie signalisiert ohne Umweg, für
wen die Seite gemacht ist.

Zusätzlich sinnvoll, wenn das Budget es hergibt: `pythonpfad.com` mitbestellen
und dauerhaft auf `.de` weiterleiten. Das kostet wenige Euro im Jahr und
verhindert, dass jemand anders unter demselben Namen auftritt.

> Die Verfügbarkeit sagt verbindlich nur Stratos eigene Prüfung. Externe
> Abfragen sind bei `.de` nicht möglich – die DENIC gibt darüber keine
> öffentliche Auskunft.

---

## 3. DNS-Einträge bei Strato

Nach der Bestellung: Kundenlogin → _Domainverwaltung_ → Domain → _DNS-Einstellungen_.

### Weg A und C: eigener Server mit fester IP-Adresse

| Typ     | Name  | Wert             | Anmerkung                     |
| ------- | ----- | ---------------- | ----------------------------- |
| `A`     | `@`   | `203.0.113.10`   | IPv4-Adresse des Servers      |
| `AAAA`  | `@`   | `2001:db8::10`   | IPv6, falls vorhanden         |
| `CNAME` | `www` | `pythonpfad.de.` | Punkt am Ende nicht vergessen |

Die Beispieladressen durch die echten ersetzen. Ein `CNAME` auf `@` ist nicht
erlaubt – die Hauptdomain braucht immer einen `A`-Eintrag.

### Weg B: Betrieb bei einem Anbieter

Der Anbieter nennt die Zieladresse. Üblich ist:

| Typ     | Name  | Wert                              |
| ------- | ----- | --------------------------------- |
| `A`     | `@`   | die vom Anbieter genannte IP      |
| `CNAME` | `www` | die vom Anbieter genannte Adresse |

Dazu kommt meist ein `TXT`-Eintrag zur Bestätigung, dass die Domain einem
gehört. Den gibt der Anbieter vor.

### Was unangetastet bleibt

Wer die Domain auch für E-Mail nutzt: **`MX`-Einträge nicht anfassen.** Sie
haben mit der Webseite nichts zu tun. Wer sie versehentlich löscht, stellt die
Zustellung ein, und das fällt oft erst Tage später auf.

### Geduld einplanen

DNS-Änderungen brauchen Zeit – meist Minuten, im ungünstigen Fall bis zu 24
Stunden. Vor Ablauf dieser Zeit lohnt kein Fehlersuchen.

---

## 4. Verschlüsselung

Ohne HTTPS läuft diese Anwendung nicht sinnvoll: Die Sitzungscookies bekommen
dann kein `Secure`-Merkmal, und ein Anmeldevorgang ließe sich unterwegs
mitlesen.

- **Weg A und C:** Let's Encrypt über Caddy (macht es von selbst) oder
  Certbot mit nginx. Der Beispiel-Reverse-Proxy steht in
  [DEPLOYMENT.md, Abschnitt 4](./DEPLOYMENT.md).
- **Weg B:** Der Anbieter stellt das Zertifikat aus; nichts zu tun.

---

## 5. Die eine Zeile, die die Domain bekannt macht

In der Umgebungsdatei:

```bash
APP_URL="https://pythonpfad.de"
```

Das ist die **einzige** Stelle im ganzen Projekt, an der die Domain steht. Sie
wirkt auf:

| Wirkung                                | Wo                                        |
| -------------------------------------- | ----------------------------------------- |
| `sitemap.xml` und `robots.txt`         | `src/app/sitemap.ts`, `src/app/robots.ts` |
| kanonische Verweise und Vorschaubilder | `src/app/layout.tsx`                      |
| `Secure` auf den Sitzungscookies       | `src/server/auth/session.ts`              |
| `Strict-Transport-Security`            | `src/proxy.ts`                            |

Alle vier werden **zur Laufzeit** ausgewertet, nicht beim Übersetzen. Man kann
das Paket also einmal bauen und in verschiedenen Umgebungen betreiben, ohne neu
zu übersetzen.

Ohne `https://` am Anfang bleiben `Secure` und HSTS aus. Das ist Absicht und
für die lokale Entwicklung notwendig – aber im Betrieb ein Fehler, der leicht
übersehen wird, weil die Seite trotzdem funktioniert. Punkt 7 prüft genau das.

---

## 6. `www` und Hauptdomain zusammenführen

Beide Schreibweisen sollen auf dieselbe Seite führen, aber nur eine davon soll
die _offizielle_ sein. Sonst behandeln Suchmaschinen sie als zwei Seiten und
verteilen die Bewertung.

Die Anwendung setzt bereits kanonische Verweise auf die Adresse aus `APP_URL`.
Zusätzlich sollte der Reverse Proxy dauerhaft weiterleiten:

```nginx
server {
    listen 443 ssl;
    server_name www.pythonpfad.de;
    return 308 https://pythonpfad.de$request_uri;
}
```

Mit Caddy genügt:

```caddyfile
www.pythonpfad.de {
    redir https://pythonpfad.de{uri} permanent
}
```

`308` und nicht `301`: Damit bleibt die HTTP-Methode erhalten, ein abgeschicktes
Formular geht also nicht verloren.

---

## 7. Prüfliste nach dem Umschalten

Alles von einem fremden Netz aus prüfen, nicht vom Server selbst – sonst prüft
man an der Firewall vorbei.

```bash
# 1. Kommt überhaupt etwas an, und ist es verschlüsselt?
curl -sI https://pythonpfad.de | head -1

# 2. Zeigt die Weiterleitung von www auf die Hauptdomain?
curl -sI https://www.pythonpfad.de | grep -i location

# 3. Steht die richtige Domain im Seitenverzeichnis?
#    Erwartet: https://pythonpfad.de/... — steht dort localhost, ist APP_URL falsch.
curl -s https://pythonpfad.de/sitemap.xml | head -5

# 4. Sind die geschlossenen Bereiche ausgenommen?
curl -s https://pythonpfad.de/robots.txt

# 5. Ist HSTS gesetzt? (Erwartet: max-age=63072000; includeSubDomains)
curl -sI https://pythonpfad.de | grep -i strict-transport

# 6. Erzeugt das Vorschaubild? (Erwartet: HTTP 200, image/png)
curl -sI https://pythonpfad.de/opengraph-image | head -3

# 7. Bekommt das Sitzungscookie sein Secure-Merkmal?
#    Nach einer Anmeldung in den Entwicklerwerkzeugen des Browsers prüfen:
#    pythonpfad_session muss Secure, HttpOnly und SameSite=Lax tragen.

# 8. Laufen die Gesundheitsprüfungen?
curl -s https://pythonpfad.de/api/health
curl -s https://pythonpfad.de/api/ready
```

Zum Schluss den Link auf die Startseite einmal in einen Messenger schicken und
schauen, ob die Vorschau erscheint. Das prüft `metadataBase`, das Vorschaubild
und die Erreichbarkeit von außen in einem Schritt.

---

## 8. Was danach noch ansteht

- **Datenschutzerklärung und Impressum.** In Deutschland für eine öffentlich
  erreichbare Seite verpflichtend. Die inhaltlichen Grundlagen – welche Daten
  wozu erhoben werden – stehen in [DATENSCHUTZ.md](./DATENSCHUTZ.md); daraus
  lässt sich der Text ableiten. Die rechtliche Prüfung ersetzt dieses Dokument
  nicht.
- **Sicherungen.** Siehe DEPLOYMENT.md, Abschnitt 6. Eine Sicherung, die noch
  nie zurückgespielt wurde, ist keine Sicherung.
- **Aufbewahrungsfrist.** `ATTEMPT_RETENTION_DAYS` prüfen und den
  Aufräumlauf einrichten.
- **Demokonten.** `SEED_DEMO_USERS` muss im Betrieb `false` sein, sonst gibt es
  ein Konto mit bekanntem Passwort.
