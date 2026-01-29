# SBS Nexus – Workflows (n8n Templates)

> Zentrale Sammlung von n8n-Workflows für SBS Nexus – verbindet Finance, Contract und Technical Intelligence zu Ende-zu-Ende-Prozessen.

[![n8n](https://img.shields.io/badge/n8n-Workflow%20Automation-purple.svg)](https://n8n.io/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)

## 🎯 Zweck

Dieses Repository enthält **wiederverwendbare Workflow-Vorlagen** für die SBS Nexus Plattform, z.B.:

- E-Mail‑Postfach überwachen → Rechnungen extrahieren → Finance Modul triggern
- Vertrag hochgeladen → Risikoanalyse → Reminder im Kalender
- Technische Anfrage → HydraulikDoc → Antwort + Ticket in Service-System

Zielgruppe sind interne Teams und Kunden, die SBS Nexus Workflows anpassen wollen.

---

## 📚 Inhalt

Ordnerstruktur (Beispiel):

```text
workflows/
├── finance/
│   ├── email-inbox-monitor.json
│   ├── invoice-data-extraction.json
│   └── datev-export-notification.json
├── contracts/
│   ├── contract-upload-webhook.json
│   ├── risk-alert-slack.json
│   └── renewal-reminder.json
└── technical/
    ├── technical-doc-indexing.json
    └── service-query-routing.json
