# Security Update: esbuild Vulnerability

## Summary
A security vulnerability in `esbuild` (<=0.24.2) allowed any website to send requests to the development server and read responses due to default CORS settings. This could expose source code to malicious actors.

## Actions Taken
- Upgraded `esbuild` to version `^0.25.0` as a devDependency.
- Ran `npm audit` to verify the vulnerability is resolved for direct dependencies.
- Noted that some transitive dependencies (via `@medusajs/*`) may still reference older `esbuild` versions. These require upstream fixes from MedusaJS.

## Next Steps
- Monitor MedusaJS for updates that resolve the transitive `esbuild` vulnerability.
- Review and update dependencies regularly.
- See [Dependabot alert #2](https://github.com/xoity/false/security/dependabot/2) for more details.

---
_Last updated: 2025-12-16_