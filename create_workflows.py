#!/usr/bin/env python3
import json
import os

# LinkedIn GTM Workflow (gekürzt für Übersichtlichkeit)
linkedin_workflow = {
    "name": "SBS Nexus - LinkedIn GTM Automation",
    "nodes": [],
    "connections": {},
    "active": False,
    "settings": {"executionOrder": "v1"}
}

# Contract Monitoring Workflow (gekürzt)
contract_workflow = {
    "name": "SBS Nexus - Contract Intelligence Monitoring", 
    "nodes": [],
    "connections": {},
    "active": False,
    "settings": {"executionOrder": "v1"}
}

# Speichern
with open('workflows/linkedin-gtm/linkedin-gtm-automation.json', 'w') as f:
    json.dump(linkedin_workflow, f, indent=2)

with open('workflows/contract-monitoring/contract-deadline-monitoring.json', 'w') as f:
    json.dump(contract_workflow, f, indent=2)

print("✅ Workflow-Dateien erstellt")
