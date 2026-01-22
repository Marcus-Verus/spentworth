# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in SpentWorth, please report it to us at **support@spentworth.com**.

We take security seriously and will respond to reports promptly.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (if applicable)

We appreciate responsible disclosure and will work with you to address any issues.

## Security Measures

SpentWorth implements the following security measures:

- **Encryption in Transit**: All connections use HTTPS/TLS
- **Encryption at Rest**: Database encrypted with AES-256 (via Supabase)
- **Row-Level Security**: User data isolated using Supabase RLS policies
- **Password Hashing**: Passwords hashed using industry-standard algorithms (Supabase Auth)
- **MFA**: Multi-factor authentication enabled on infrastructure accounts
- **Secrets Management**: API keys stored as environment variables, not in source code
- **GDPR Compliance**: Cookie consent, data export, account deletion
- **Audit Logging**: User actions logged for security review

## Data Breach Response Plan

In the event of a security breach:

1. **Immediate Response** (within 1 hour)
   - Isolate affected systems
   - Assess scope and impact
   - Document incident details

2. **Investigation** (within 24 hours)
   - Identify root cause
   - Determine what data was accessed
   - Implement immediate fixes

3. **User Notification** (within 72 hours if required by law)
   - Email affected users with details
   - Explain what happened and what data was affected
   - Provide recommended actions
   - Offer support resources

4. **Regulatory Notification** (as required)
   - Notify relevant authorities (GDPR requires 72 hours)
   - Document all notifications

5. **Post-Incident** (within 2 weeks)
   - Conduct full security review
   - Implement additional safeguards
   - Update security documentation
   - Review and improve response plan

## Contact

For security inquiries: support@spentworth.com

## Infrastructure Providers

SpentWorth relies on the following security-certified providers:

- **Supabase** (Database & Auth): SOC 2 Type II
- **Netlify** (Hosting): SOC 2 Type II
- **Stripe** (Payments): PCI DSS Level 1
