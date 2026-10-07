# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅        |

## Reporting a Vulnerability

If you discover a security vulnerability in Benue Farm Bridge, please report it responsibly:

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email the maintainer directly with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested fixes (optional)

We will acknowledge receipt within 48 hours and aim to release a patch within 7 days for critical issues.

---

## Security Architecture

### Authentication & Authorization

- **Supabase Auth** handles all user authentication with JWT tokens
- **Row Level Security (RLS)** is enforced at the database level on every table
- Users can only access data their role permits — enforced by PostgreSQL policies, not just application code
- Admin-only endpoints are protected by role checks in both frontend and database RLS

### Secret Key Management

| Key | Exposure | Storage |
|-----|----------|---------|
| `VITE_SUPABASE_URL` | Public (safe) | Vercel env / browser bundle |
| `VITE_SUPABASE_ANON_KEY` | Public (safe) | Vercel env / browser bundle |
| `SUPABASE_SERVICE_ROLE_KEY` | **Private** | Vercel server-side env only |
| `VITE_PAYSTACK_PUBLIC_KEY` | Public (safe) | Vercel env / browser bundle |
| `PAYSTACK_SECRET_KEY` | **Private** | Vercel server-side env only |
| `PAYSTACK_WEBHOOK_SECRET` | **Private** | Vercel server-side env only |

> ⚠️ **The service role key and Paystack secret key bypass all RLS policies.**  
> They are **never** loaded in the browser bundle and are only used in `api/` serverless functions.

### Payment Security

- All payment verification is performed **server-side** via Vercel serverless functions
- The Paystack secret key is never sent to or accessible from the browser
- **Paystack webhook signatures** are verified using HMAC-SHA512 before processing any event
- Payment amounts are validated server-side against expected plan prices — preventing price manipulation
- Duplicate transaction references are rejected via `upsert` with `onConflict: 'reference'`

### HTTP Security Headers

All API responses and the frontend include the following headers (configured in `vercel.json`):

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | Restricts scripts, styles, images, connections to known safe origins |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disables camera, microphone, geolocation APIs |

### Input Validation

- All API endpoints validate required fields before processing
- `vendorId` is validated against UUID regex before any database query
- `planId` is validated against known plans to prevent unknown plan injection
- Request body size is limited to 100KB to prevent denial-of-service via large payloads

### Build Security

- **Source maps are disabled** in production builds (`sourcemap: false`) to prevent source code leakage
- Environment variables not prefixed with `VITE_` are excluded from the client bundle by Vite
- No development-only code or debug endpoints are included in the production build

### Database Security

- All Supabase tables have **Row Level Security enabled**
- Service role operations are performed only in serverless functions, never in the browser
- Admin operations use a separate isolated Supabase client instance to prevent session contamination

---

## Known Security Considerations

1. **Supabase Anon Key**: The anon key is intentionally public and safe — it is scoped by RLS policies. Never confuse it with the service role key.
2. **Paystack Public Key**: The public key is intentionally exposed to the browser for the Paystack Inline payment popup. Only the secret key must remain private.
3. **Content Security Policy**: The CSP includes `'unsafe-inline'` for styles to support dynamic CSS-in-JS patterns. If you refactor to eliminate inline styles, tighten this policy.
