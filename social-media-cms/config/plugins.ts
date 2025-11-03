export default ({ env }) => ({
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET', 'toBeModified'),
      jwt: {
        expiresIn: '7d',
      },
    },
  },
  graphql: {
    enabled: true,
    config: {
      endpoint: '/graphql',
      shadowCRUD: true,
      playgroundAlways: env('NODE_ENV') === 'development',
      depthLimit: 10,
      amountLimit: 100,
      apolloServer: {
        tracing: env('NODE_ENV') === 'development',
        introspection: true,
      },
    },
  },
  i18n: {
    enabled: true,
    config: {
      locales: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'],
      defaultLocale: 'en',
    },
  },
  upload: {
    config: {
      provider: env('UPLOAD_PROVIDER', 'local'),
      providerOptions: {
        localServer: {
          maxage: 300000,
        },
        cloudinary: {
          cloud_name: env('CLOUDINARY_CLOUD_NAME'),
          api_key: env('CLOUDINARY_API_KEY'),
          api_secret: env('CLOUDINARY_API_SECRET'),
        },
        aws: {
          accessKeyId: env('AWS_ACCESS_KEY_ID'),
          secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
          region: env('AWS_REGION'),
          params: {
            Bucket: env('AWS_S3_BUCKET'),
          },
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
  email: {
    config: {
      provider: env('EMAIL_PROVIDER', 'sendgrid'),
      providerOptions: {
        apiKey: env('EMAIL_PROVIDER_API_KEY'),
      },
      settings: {
        defaultFrom: env('EMAIL_DEFAULT_FROM', 'noreply@example.com'),
        defaultReplyTo: env('EMAIL_DEFAULT_REPLY_TO', 'support@example.com'),
      },
    },
  },
  'social-media-connector': {
    enabled: true,
    resolve: './src/plugins/social-media-connector',
  },
  'analytics-dashboard': {
    enabled: true,
    resolve: './src/plugins/analytics-dashboard',
  },
  'content-scheduler': {
    enabled: true,
    resolve: './src/plugins/content-scheduler',
  },
  'workflow-management': {
    enabled: true,
    resolve: './src/plugins/workflow-management',
  },
});
