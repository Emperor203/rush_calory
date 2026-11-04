import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * ==============================================================================
 * RUSH CALORY ADVANCED DDOS & DOS EDGE PROTECTION MIDDLEWARE
 * ==============================================================================
 * Provides multi-layer defense against:
 * 1. HTTP Flooding / Layer 7 DDoS & Slowloris
 * 2. Automated Vulnerability Scanners (SQLMap, Nikto, DirBuster, Masscan)
 * 3. Path Traversal & Sensitive File Probing (.env, .git, wp-admin, phpmyadmin)
 * 4. API Request Flooding (Sliding Window Rate Limiting per IP)
 * 5. Large Payload / Buffer Exhaustion Attacks (Body Size Caps)
 * 6. Clickjacking, MIME Sniffing & XSS via Secure WAF Headers
 * ==============================================================================
 */

// In-memory sliding window rate-limiting stores (Edge memory)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipRequestMap = new Map<string, RateLimitEntry>();
const ipSensitiveMap = new Map<string, RateLimitEntry>();

// Periodic cleanup of stale IP records (runs every 60s)
let lastCleanup = Date.now();
function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < 60000) return;
  lastCleanup = now;

  ipRequestMap.forEach((entry, ip) => {
    if (now > entry.resetAt) ipRequestMap.delete(ip);
  });
  ipSensitiveMap.forEach((entry, ip) => {
    if (now > entry.resetAt) ipSensitiveMap.delete(ip);
  });
}

// Rate limit configurations
const LIMITS = {
  // Sensitive endpoints (Telegram invoicing, Admin mutations, Auth)
  SENSITIVE_API: { max: 15, windowMs: 60 * 1000 },
  // General API endpoints
  GENERAL_API: { max: 70, windowMs: 60 * 1000 },
  // HTML / Page requests (Prevents hammer reloading / bot flood)
  PAGE_REQUESTS: { max: 150, windowMs: 60 * 1000 },
  // Maximum allowed POST/PUT body size (512 KB)
  MAX_BODY_SIZE_BYTES: 512 * 1024,
};

// Automated vulnerability scanners & malicious bot User-Agents
const MALICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /acunetix/i,
  /masscan/i,
  /nmap/i,
  /dirbuster/i,
  /gobuster/i,
  /zgrab/i,
  /censys/i,
  /wprecon/i,
  /havij/i,
  /fuzz/i,
  /python-urllib/i,
];

// Blocked scanner paths & exploit attempts
const BLOCKED_PATH_PATTERNS = [
  /\.env($|\/)/i,
  /\.git($|\/)/i,
  /\.svn/i,
  /\/\.\./, // Path traversal
  /wp-admin/i,
  /wp-login/i,
  /xmlrpc\.php/i,
  /phpmyadmin/i,
  /pma/i,
  /adminer/i,
  /\.php($|\?)/i,
  /\.asp($|\?)/i,
  /\.aspx($|\?)/i,
  /\.jsp($|\?)/i,
  /\.cgi($|\?)/i,
  /\.sh($|\?)/i,
  /\.bash/i,
  /etc\/passwd/i,
  /proc\/self/i,
  /composer\.(json|lock)/i,
  /package-lock\.json/i,
  /\.aws/i,
  /\.config($|\/)/i,
  /eval-stdin/i,
];

/**
 * Extracts real client IP address through standard headers
 */
function getClientIp(req: NextRequest): string {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  return '127.0.0.1';
}

/**
 * Checks sliding-window rate limit for a specific IP and bucket
 */
function checkRateLimit(
  map: Map<string, RateLimitEntry>,
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetInSec: Math.ceil(windowMs / 1000) };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetInSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetInSec: Math.ceil((entry.resetAt - now) / 1000),
  };
}

export function middleware(req: NextRequest) {
  cleanupExpiredEntries();

  const { pathname } = req.nextUrl;
  const clientIp = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || '';

  // 1. FAST-PATH: Static assets are cached with immutable 1-year browser & CDN cache
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/sounds/') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.mp3') ||
    pathname.endsWith('.ico') ||
    pathname === '/favicon.ico'
  ) {
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return res;
  }

  // 2. LAYER 7 WAF: Block Vulnerability Scanners & Probing Bots
  for (const pattern of BLOCKED_PATH_PATTERNS) {
    if (pattern.test(pathname)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Forbidden: Security filter matched.',
          status: 403,
          code: 'WAF_PATH_BLOCKED',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'X-Protection-System': 'Rush-Calory-WAF',
          },
        }
      );
    }
  }

  for (const botPattern of MALICIOUS_USER_AGENTS) {
    if (botPattern.test(userAgent)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Forbidden: Automated tool blocked.',
          status: 403,
          code: 'WAF_BOT_BLOCKED',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'X-Protection-System': 'Rush-Calory-WAF',
          },
        }
      );
    }
  }

  // 3. SLOWLIRIS & PAYLOAD BOMB DEFENSE: Cap incoming body sizes
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > LIMITS.MAX_BODY_SIZE_BYTES) {
    return new NextResponse(
      JSON.stringify({
        error: 'Payload Too Large: Maximum allowed body size is 512KB.',
        status: 413,
        code: 'PAYLOAD_OVERFLOW',
      }),
      {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 4. RATE-LIMITING: Sensitive Endpoints (Telegram Invoicing, Admin mutations, Auth)
  const isSensitive =
    pathname.startsWith('/api/telegram/invoice') ||
    pathname.startsWith('/api/auth/') ||
    (pathname.startsWith('/api/admin/') && req.method !== 'GET');

  if (isSensitive) {
    const sensitiveKey = `sens:${clientIp}`;
    const limitResult = checkRateLimit(
      ipSensitiveMap,
      sensitiveKey,
      LIMITS.SENSITIVE_API.max,
      LIMITS.SENSITIVE_API.windowMs
    );

    if (!limitResult.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Слишком много запросов. Включена защита от DoS-атак.',
          message: 'Too many requests to protected endpoint. Rate limit exceeded.',
          retryAfterSeconds: limitResult.resetInSec,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Retry-After': String(limitResult.resetInSec),
            'X-RateLimit-Limit': String(LIMITS.SENSITIVE_API.max),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(limitResult.resetInSec),
          },
        }
      );
    }
  }

  // 5. RATE-LIMITING: General API & Page Requests
  const isApi = pathname.startsWith('/api/');
  const maxLimit = isApi ? LIMITS.GENERAL_API.max : LIMITS.PAGE_REQUESTS.max;
  const windowMs = isApi ? LIMITS.GENERAL_API.windowMs : LIMITS.PAGE_REQUESTS.windowMs;
  const generalKey = `${isApi ? 'api' : 'page'}:${clientIp}`;

  const generalLimit = checkRateLimit(ipRequestMap, generalKey, maxLimit, windowMs);
  if (!generalLimit.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Превышен лимит запросов (DDoS Protection). Попробуйте позже.',
        message: 'Rate limit exceeded. Please wait before refreshing.',
        retryAfterSeconds: generalLimit.resetInSec,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Retry-After': String(generalLimit.resetInSec),
          'X-RateLimit-Limit': String(maxLimit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(generalLimit.resetInSec),
        },
      }
    );
  }

  // 6. RESPONSE HEADERS: Add strict WAF & security headers
  const res = NextResponse.next();

  // Rate-limit tracking headers
  res.headers.set('X-RateLimit-Limit', String(maxLimit));
  res.headers.set('X-RateLimit-Remaining', String(generalLimit.remaining));
  res.headers.set('X-Protection-System', 'Rush-Calory-Active-Shield');

  // Security Headers (MIME sniffing, XSS, Referrer)
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CSP frame-ancestors: Allows Telegram WebApp while preventing malicious clickjacking
  res.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://*.t.me;"
  );

  return res;
}

// Run middleware on all dynamic routes and APIs
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
