import { Strapi } from '@strapi/strapi';

export default ({ strapi }: { strapi: Strapi }) => ({
  /**
   * Comprehensive health check
   */
  async check(ctx) {
    try {
      const monitoring = strapi.monitoring;
      
      if (!monitoring) {
        ctx.status = 503;
        ctx.body = {
          status: 'unhealthy',
          message: 'Monitoring service not available',
        };
        return;
      }

      const healthCheck = await monitoring.performHealthCheck();

      ctx.status = healthCheck.status === 'healthy' ? 200 : 
                   healthCheck.status === 'degraded' ? 200 : 503;
      
      ctx.body = healthCheck;
    } catch (error: any) {
      strapi.log.error('Health check error:', error);
      ctx.status = 503;
      ctx.body = {
        status: 'unhealthy',
        error: error.message,
      };
    }
  },

  /**
   * Readiness probe for Kubernetes
   */
  async readiness(ctx) {
    try {
      // Check database connection
      await strapi.db.connection.raw('SELECT 1');

      ctx.status = 200;
      ctx.body = {
        status: 'ready',
        timestamp: new Date(),
      };
    } catch (error: any) {
      strapi.log.error('Readiness check failed:', error);
      ctx.status = 503;
      ctx.body = {
        status: 'not ready',
        error: error.message,
      };
    }
  },

  /**
   * Liveness probe for Kubernetes
   */
  async liveness(ctx) {
    ctx.status = 200;
    ctx.body = {
      status: 'alive',
      timestamp: new Date(),
      uptime: process.uptime(),
    };
  },

  /**
   * Get system metrics
   */
  async metrics(ctx) {
    try {
      const monitoring = strapi.monitoring;
      
      if (!monitoring) {
        ctx.status = 503;
        ctx.body = {
          error: 'Monitoring service not available',
        };
        return;
      }

      const metrics = monitoring.getMetrics();

      ctx.status = 200;
      ctx.body = {
        metrics,
        timestamp: new Date(),
      };
    } catch (error: any) {
      strapi.log.error('Metrics error:', error);
      ctx.status = 500;
      ctx.body = {
        error: error.message,
      };
    }
  },
});
