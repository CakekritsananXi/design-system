export default ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'toBeModified'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'toBeModified'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'toBeModified'),
    },
  },
  url: env('ADMIN_URL', '/admin'),
  autoOpen: false,
  watchIgnoreFiles: [
    '**/config/sync/**',
  ],
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  forgotPassword: {
    emailTemplate: {
      subject: 'Reset password',
      text: 'Your password reset link: <%= URL %>?code=<%= TOKEN %>',
      html: '<p>Your password reset link: <a href="<%= URL %>?code=<%= TOKEN %>">Reset Password</a></p>',
    },
  },
});
