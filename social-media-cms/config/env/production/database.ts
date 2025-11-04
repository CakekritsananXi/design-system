export default ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME'),
      user: env('DATABASE_USERNAME'),
      password: env('DATABASE_PASSWORD'),
      ssl: {
        rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        ca: env('DATABASE_CA_CERT'),
      },
    },
    pool: {
      min: env.int('DATABASE_POOL_MIN', 5),
      max: env.int('DATABASE_POOL_MAX', 20),
    },
    acquireConnectionTimeout: 60000,
  },
});
