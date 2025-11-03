export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'dl.airtable.com',
            'market-assets.strapi.io',
            'https:',
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'dl.airtable.com',
            'market-assets.strapi.io',
            'https:',
          ],
          upgradeInsecureRequests: null,
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
      frameguard: {
        action: 'deny',
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      origin: ['http://localhost:1337', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      formLimit: '256mb',
      jsonLimit: '256mb',
      textLimit: '256mb',
      formidable: {
        maxFileSize: 250 * 1024 * 1024, // 250MB
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
