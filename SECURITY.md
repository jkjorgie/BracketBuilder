# Security Implementation Guide

This document describes the security measures implemented in the BracketBuilder application.

## 🛡️ Rate Limiting

### Implementation

Rate limiting has been added to prevent abuse and brute-force attacks.

**Protected Endpoints:**

- `/api/auth/login` - 5 attempts per 15 minutes (per email + per IP)
- `/api/vote/submit` - 10 attempts per minute (per email + source)

### How It Works

1. **In-Memory Storage** (Development/Small Scale)
   - Current implementation uses in-memory Map
   - Suitable for single-server deployments
   - Auto-cleans expired entries every minute

2. **Rate Limit Headers**
   When rate limited, responses include:
   - `Retry-After` - Seconds until reset
   - `X-RateLimit-Limit` - Max requests allowed
   - `X-RateLimit-Remaining` - Requests remaining
   - `X-RateLimit-Reset` - When limit resets

### Configuration

Edit limits in `/src/lib/rateLimiter.ts`:

```typescript
export const RATE_LIMITS = {
  LOGIN: {
    maxRequests: 5, // Max attempts
    windowMs: 15 * 60 * 1000, // Time window (15 min)
    message: "Too many login attempts...",
  },
  VOTE: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many vote submissions...",
  },
};
```

### Testing Rate Limits

**Test Login Rate Limit:**

```bash
# Try logging in 6 times quickly with wrong password
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'
```

After 5 attempts, you'll get:

```json
{
  "error": "Too many login attempts. Please try again in 15 minutes.",
  "retryAfter": 900
}
```

### Scaling to Production

For production with multiple servers, replace in-memory storage with Redis:

```typescript
// Install: npm install ioredis
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

// Update rateLimiter to use Redis
```

---

## 🔒 HTTPS Enforcement

### Implementation

HTTPS enforcement is handled via Next.js middleware (`/src/middleware.ts`).

**What It Does:**

1. **Production Only** - Redirects HTTP → HTTPS (301 permanent)
2. **Development** - Allows HTTP for local testing
3. **Checks Headers** - Uses `x-forwarded-proto` for proxy/CDN detection

### How It Works

```typescript
// In middleware.ts
if (protocol === "http" && isProduction) {
  return NextResponse.redirect(`https://${host}${path}`, 301);
}
```

### Security Headers Added

| Header                      | Purpose                  | Value                                          |
| --------------------------- | ------------------------ | ---------------------------------------------- |
| `Strict-Transport-Security` | Force HTTPS for 1 year   | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy`   | Control resource loading | Restricts scripts, styles, images              |
| `X-Frame-Options`           | Prevent clickjacking     | `DENY`                                         |
| `X-Content-Type-Options`    | Prevent MIME sniffing    | `nosniff`                                      |
| `X-XSS-Protection`          | XSS filter (legacy)      | `1; mode=block`                                |
| `Referrer-Policy`           | Control referrer info    | `strict-origin-when-cross-origin`              |
| `Permissions-Policy`        | Disable unused features  | Blocks geolocation, camera, mic                |

### Cookie Security

All session cookies are configured securely:

```typescript
{
  httpOnly: true,                                // No JavaScript access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'lax',                               // CSRF protection
  path: '/',
}
```

### Testing HTTPS Enforcement

**Local Development:**

```bash
# HTTP is allowed
curl http://localhost:3000
# ✅ Works fine
```

**Production:**

```bash
# HTTP redirects to HTTPS
curl -I http://yourapp.com
# HTTP/1.1 301 Moved Permanently
# Location: https://yourapp.com
```

**Check Security Headers:**

```bash
curl -I https://yourapp.com
# Should see all security headers
```

### Verifying in Browser

1. Open DevTools → Network tab
2. Load your app over HTTP
3. Should see 301 redirect to HTTPS
4. Check Response Headers for security headers

---

## 🚀 Deployment Checklist

### Environment Variables Required

```bash
# .env.production
NODE_ENV=production
HTTPS=true
ENCRYPTION_KEY=your-key-here
AUTH_SECRET=your-secret-here
POSTGRES_PRISMA_URL=your-db-url
```

### Production Platform Configuration

**Vercel:**

```bash
# Vercel automatically handles HTTPS
# Just ensure environment variables are set
vercel env add ENCRYPTION_KEY production
vercel env add AUTH_SECRET production
```

**Heroku:**

```bash
# Enable automatic HTTPS redirect
heroku config:set HTTPS=true
```

**Cloudflare:**

```bash
# SSL/TLS → Full (strict)
# Automatic HTTPS Rewrites → On
```

### Testing Checklist

- [ ] Login fails after 5 wrong attempts
- [ ] Vote submission fails after 10 rapid attempts
- [ ] HTTP redirects to HTTPS (production only)
- [ ] All security headers present in response
- [ ] Cookies have `Secure` flag in production
- [ ] Session cookies are HttpOnly

---

## 📊 Monitoring Rate Limits

Add logging to track rate limit violations:

```typescript
// In rateLimiter.ts check() method
if (entry.count > maxRequests) {
  console.warn("Rate limit exceeded:", {
    identifier,
    count: entry.count,
    maxRequests,
  });
}
```

Consider integrating with monitoring tools:

- Sentry - Error tracking
- DataDog - APM and logging
- LogRocket - Session replay

---

## 🔧 Troubleshooting

### Rate Limit Not Working

1. Check if client IP is being detected: `console.log(rateLimiter.getClientIdentifier(request))`
2. Behind proxy? Ensure `x-forwarded-for` header is set
3. Clear rate limits: `rateLimiter.reset(identifier)`

### HTTPS Redirect Not Working

1. Check `x-forwarded-proto` header: `console.log(request.headers.get('x-forwarded-proto'))`
2. Verify NODE_ENV: `console.log(process.env.NODE_ENV)`
3. Some hosts (Vercel) handle HTTPS before middleware - check platform docs

### Security Headers Missing

1. Check middleware is running: Add console.log in middleware
2. Verify matcher config in middleware.ts
3. Check browser DevTools → Network → Response Headers

---

## 📚 Additional Resources

- [OWASP Rate Limiting Guide](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [HTTPS Best Practices](https://httpsiseasy.com/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
