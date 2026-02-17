# SBS Nexus - Enterprise n8n Workflows

Enterprise-grade n8n workflow automation für SBS Deutschland/Nexus KI-Automatisierungsplattform.

## 🚀 Workflow-Übersicht

### 1. Intelligent Document Processing Pipeline
**Datei:** `workflows/document-processing/intelligent-document-processing.json`

**Features:**
- Webhook-basierter Document Upload (Rechnungen & Verträge)
- KI-Verarbeitung mit 98.5% Genauigkeit
- Automatisches Quality Gate (85% Confidence-Threshold)
- Human-in-the-Loop Review-System
- DATEV-Integration für automatisches Buchen
- PostgreSQL Audit Trail
- Slack & Google Sheets Notifications

**API Endpoint:** `https://n8n.sbsnexus.de/webhook/document-upload`

### 2. LinkedIn GTM & Lead Generation Autopilot
**Datei:** `workflows/linkedin-gtm/linkedin-gtm-automation.json`

**Features:**
- GPT-4o Content-Generierung (werktags 9 Uhr)
- PhantomBuster LinkedIn Lead Scraping (alle 6h)
- Intelligente Lead-Qualifizierung (Score 0-100)
- Automatische HubSpot CRM-Integration
- Personalisierte E-Mail-Outreach (Score ≥70)
- Slack Sales-Alerts
- Google Sheets Content Calendar

**Zielgruppe:** CFOs, CTOs, IT-Leiter im deutschen Mittelstand (50-500 MA)

### 3. Smart Contract Deadline Management
**Datei:** `workflows/contract-monitoring/contract-deadline-monitoring.json`

**Features:**
- Tägliches Monitoring (6 Uhr morgens)
- 90-Tage-Vorschau auf Kündigungsfristen
- Urgency-Level Kategorisierung (Critical/High/Medium/Low)
- Auto-Renewal-Warning-System
- Multi-Channel-Alerting (Slack, E-Mail, Google Calendar)
- PostgreSQL-basiertes Tracking
- Interaktive Slack-Buttons (Kündigen/Verlängern)

## 📋 Voraussetzungen

### Erforderliche n8n Credentials
- OpenAI API (GPT-4o)
- SBS Nexus API (invoice.sbsnexus.de, contract.sbsnexus.de)
- DATEV API
- Slack OAuth2
- Google Workspace (Sheets, Calendar)
- HubSpot API
- PhantomBuster API
- PostgreSQL Database
- E-Mail (SMTP/Resend)

## 🔧 Installation

### n8n Import
1. n8n öffnen → Workflows → Import from File
2. JSON-Datei aus `workflows/` auswählen
3. Credentials konfigurieren
4. Umgebungsvariablen setzen (siehe `.env.template`)
5. Workflow aktivieren

### Via n8n API
\`\`\`bash
curl -X POST https://n8n.sbsnexus.de/api/v1/workflows \\
  -H "X-N8N-API-KEY: \${N8N_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d @workflows/document-processing/intelligent-document-processing.json
\`\`\`

## 📊 Database Schema

### PostgreSQL - processed_documents
\`\`\`sql
CREATE TABLE processed_documents (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    confidence DECIMAL(5,4),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exported_to_datev BOOLEAN DEFAULT FALSE,
    review_status VARCHAR(20) CHECK (review_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_processed_documents_date ON processed_documents(processed_at);
CREATE INDEX idx_processed_documents_status ON processed_documents(review_status);
\`\`\`

### PostgreSQL - contracts
\`\`\`sql
CREATE TABLE contracts (
    contract_id VARCHAR(255) PRIMARY KEY,
    contract_name VARCHAR(500) NOT NULL,
    client_name VARCHAR(500) NOT NULL,
    termination_date DATE NOT NULL,
    notice_period_days INTEGER DEFAULT 90,
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    payment_terms TEXT,
    auto_renewal BOOLEAN DEFAULT FALSE,
    contract_value DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'active',
    last_alert_sent TIMESTAMP,
    alert_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contracts_termination ON contracts(termination_date);
CREATE INDEX idx_contracts_status ON contracts(status);
\`\`\`

## 🔐 Security & Compliance

- **DSGVO-konform**: Alle Daten auf deutschen Servern (Frankfurt)
- **Audit Trail**: Vollständiges Logging aller Verarbeitungsschritte
- **Verschlüsselung**: TLS 1.3 für alle API-Kommunikationen
- **Access Control**: Credential-basierte Authentifizierung
- **Data Retention**: Konfigurierbare Aufbewahrungsfristen

## 📈 Monitoring & KPIs

### Document Processing
- Verarbeitungszeit: < 3 Sekunden (Target)
- KI-Genauigkeit: 98.5% (Benchmark)
- Review-Rate: < 15% (bei 85% Confidence-Threshold)
- DATEV-Export-Success: > 99%

### LinkedIn GTM
- Lead-Generierung: ~50-100 Leads/Tag
- Qualifikationsrate: ~30% (Score ≥70)
- E-Mail-Öffnungsrate: Target 40%+
- Demo-Conversion: Target 5%+

### Contract Management
- Alert-Response-Time: < 24h
- Missed-Deadlines: 0% (Target)
- Monitoring-Coverage: 100%
- Auto-Renewal-Prevention: 95%+

## 📞 Support

- **Technische Fragen:** dev@sbsnexus.de
- **Business Inquiries:** kontakt@sbsnexus.de
- **Dokumentation:** https://docs.sbsnexus.de

## 📄 Lizenz

Proprietary - SBS Deutschland GmbH © 2026

---

**SBS Deutschland GmbH**  
In der Dell 19  
69469 Weinheim  
https://www.sbsdeutschland.com
