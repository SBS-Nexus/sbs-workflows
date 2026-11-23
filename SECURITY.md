# Security Policy — SBS Learning & Workflow Workspace

The current repository contains public learning-app code and historical workflow examples. This repository is not an authoritative statement of production security posture or legal compliance.

## Confidential reporting

Do not publish passwords, API keys, student records, workflow execution data, personal data or exploit details in GitHub issues or pull requests.

Use GitHub private vulnerability reporting if it is enabled for this repository. Otherwise contact SBS Deutschland through its official website, https://sbsdeutschland.com/, to request a confidential security contact before sharing details.

Include only sanitized reproduction steps, affected paths/commits and expected-versus-actual behaviour. Do not test users, course accounts, production services or third-party workflow endpoints without explicit permission.

## Scope and boundaries

- The `pythonpfad/` and `sqlpfad/` applications must protect account/session data, learning progress and data isolation according to their actual deployed environment.
- The `aipfad/` folder and `workflows/` examples are separate development scopes. Do not infer production status, permitted operations, or support commitments from this repository.
- Workflow imports must not auto-enable live integrations or outreach.
- Any secrets or personal data found in Git history require incident triage and secret rotation or history remediation as applicable; simply deleting a file in a new commit is insufficient.

No ISO certification, SLA, guaranteed response time, bug bounty or independent penetration test is claimed here.
