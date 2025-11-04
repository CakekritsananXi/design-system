export default {
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: 'health.check',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/health/ready',
      handler: 'health.readiness',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/health/live',
      handler: 'health.liveness',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/metrics',
      handler: 'health.metrics',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
