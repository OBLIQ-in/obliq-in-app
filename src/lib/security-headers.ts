type Options = {
  production: boolean;
  // Auth0 tenant domain (#10), e.g. "obliq.us.auth0.com". Login redirects and
  // posts go there, so it must be allowed once Auth0 is set up.
  auth0Domain?: string;
};

// Headers sent on every route. The app will hold client financial records,
// so start strict and allow only what Next.js, the font and Auth0 need.
export function securityHeaders({ production, auth0Domain }: Options) {
  const auth0 = auth0Domain ? [`https://${auth0Domain}`] : [];
  const csp = {
    "default-src": ["'self'"],
    // Next.js inlines its bootstrap scripts. Dev also needs eval for fast
    // refresh. Nonces would force every page to render per request.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(production ? [] : ["'unsafe-eval'"]),
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com"],
    "img-src": ["'self'", "data:", "blob:"],
    // Dev hot reload uses a websocket.
    "connect-src": ["'self'", ...auth0, ...(production ? [] : ["ws:"])],
    "form-action": ["'self'", ...auth0],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    ...(production ? { "upgrade-insecure-requests": [] } : {}),
  };
  const policy = Object.entries(csp)
    .map(([directive, sources]) => [directive, ...sources].join(" "))
    .join("; ");

  return [
    { key: "Content-Security-Policy", value: policy },
    // Older browsers ignore frame-ancestors.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    // Browsers remember HSTS, so only send it from the HTTPS deployments.
    ...(production
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ]
      : []),
  ];
}
