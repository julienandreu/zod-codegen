# Security Policy

## Supported Versions

We actively support the following versions of zod-codegen:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

The zod-codegen team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings, and will make every effort to acknowledge your contributions.

### How to Report Security Issues

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: [julienandreu@me.com](mailto:julienandreu@me.com)

Please include the following information in your report:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

### Response Timeline

- **Initial Response**: We will acknowledge receipt of your vulnerability report within 48 hours.
- **Progress Updates**: We will send you regular updates about our progress, at least every 7 days.
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days of the initial report.

### Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine the affected versions
2. Audit code to find any potential similar problems
3. Prepare fixes for all supported versions
4. Release new versions as soon as possible
5. Prominently announce the issue in the release notes

### Bug Bounty Program

Currently, we do not offer a paid bug bounty program. We express our gratitude to security researchers through:

- Public acknowledgment in our security advisories (if desired)
- Recognition in our project documentation
- Direct communication and thanks from our team

## Security Best Practices

When using zod-codegen, please follow these security best practices:

### Input Validation

- Always validate OpenAPI specifications from untrusted sources
- Be cautious when processing large or complex OpenAPI files
- Consider file size limits and timeout mechanisms

### Output Security

- Review generated code before using in production
- Ensure generated validation schemas are appropriate for your use case
- Test generated code thoroughly

### Dependencies

- Keep zod-codegen and its dependencies up to date
- Regularly audit your dependency tree for known vulnerabilities
- Use tools like `yarn audit` or `npm audit` to check for security issues

## Known Security Considerations

### OpenAPI Processing

- **File Size**: Very large OpenAPI files may consume significant memory
- **Circular References**: Complex schemas with circular references are handled but may impact performance
- **Remote Files**: When fetching OpenAPI specs from URLs, ensure the sources are trusted

### Generated Code

- **Validation Logic**: Generated Zod schemas provide runtime validation but should be part of a broader security strategy
- **Type Safety**: While generated TypeScript types provide compile-time safety, always validate runtime data

## Security Updates

Security updates will be clearly marked in our release notes and will be given priority in our release schedule. We recommend:

- Subscribing to release notifications
- Keeping your installation up to date
- Testing updates in a development environment before production deployment

## Contact

For questions about this security policy, please contact:

- Email: [julienandreu@me.com](mailto:julienandreu@me.com)
- GitHub: [@julienandreu](https://github.com/julienandreu)

Thank you for helping keep zod-codegen and our users safe!
