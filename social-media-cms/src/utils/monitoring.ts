import { Strapi } from '@strapi/strapi';
import os from 'os';
import logger from './logger';

interface SystemMetrics {
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  cpu: {
    cores: number;
    model: string;
    loadAverage: number[];
  };
  process: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
  timestamp: Date;
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: { status: string; responseTime?: number };
    redis?: { status: string; responseTime?: number };
    socialMedia: {
      facebook: boolean;
      twitter: boolean;
      linkedin: boolean;
      youtube: boolean;
      tiktok: boolean;
    };
  };
  metrics: SystemMetrics;
}

class MonitoringService {
  private strapi: Strapi;
  private metricsInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(strapi: Strapi) {
    this.strapi = strapi;
  }

  /**
   * Initialize monitoring service
   */
  initialize() {
    logger.info('Initializing monitoring service...');

    // Start collecting metrics every 60 seconds
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 60000);

    // Start health checks every 5 minutes
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 300000);

    // Initial health check
    this.performHealthCheck();

    logger.info('Monitoring service initialized');
  }

  /**
   * Collect system metrics
   */
  collectMetrics(): SystemMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const metrics: SystemMetrics = {
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: (usedMem / totalMem) * 100,
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        loadAverage: os.loadavg(),
      },
      process: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
      timestamp: new Date(),
    };

    // Log warning if memory usage is high
    if (metrics.memory.usagePercent > 85) {
      logger.warn(`High memory usage: ${metrics.memory.usagePercent.toFixed(2)}%`);
    }

    // Log warning if CPU load is high
    if (metrics.cpu.loadAverage[0] > metrics.cpu.cores * 0.8) {
      logger.warn(`High CPU load: ${metrics.cpu.loadAverage[0].toFixed(2)}`);
    }

    return metrics;
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheck> {
    logger.info('Performing health check...');

    const healthCheck: HealthCheck = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: { status: 'unknown' },
        socialMedia: {
          facebook: false,
          twitter: false,
          linkedin: false,
          youtube: false,
          tiktok: false,
        },
      },
      metrics: this.collectMetrics(),
    };

    try {
      // Check database connection
      const dbStart = Date.now();
      await this.strapi.db.connection.raw('SELECT 1');
      healthCheck.services.database = {
        status: 'connected',
        responseTime: Date.now() - dbStart,
      };
    } catch (error: any) {
      logger.error('Database health check failed:', error);
      healthCheck.services.database.status = 'disconnected';
      healthCheck.status = 'unhealthy';
    }

    // Check social media service connectivity
    try {
      const socialMediaConnector = this.strapi.plugin('social-media-connector');
      
      if (socialMediaConnector) {
        // Check Facebook
        try {
          const fbService = socialMediaConnector.service('facebook');
          const fbCheck = await fbService.verifyCredentials();
          healthCheck.services.socialMedia.facebook = fbCheck.valid || false;
        } catch (error) {
          logger.debug('Facebook credentials not configured or invalid');
        }

        // Check Twitter
        try {
          const twitterService = socialMediaConnector.service('twitter');
          const twitterCheck = await twitterService.verifyCredentials();
          healthCheck.services.socialMedia.twitter = twitterCheck.valid || false;
        } catch (error) {
          logger.debug('Twitter credentials not configured or invalid');
        }

        // Check LinkedIn
        try {
          const linkedinService = socialMediaConnector.service('linkedin');
          const linkedinCheck = await linkedinService.verifyCredentials();
          healthCheck.services.socialMedia.linkedin = linkedinCheck.valid || false;
        } catch (error) {
          logger.debug('LinkedIn credentials not configured or invalid');
        }

        // Check YouTube
        try {
          const youtubeService = socialMediaConnector.service('youtube');
          const youtubeCheck = await youtubeService.verifyCredentials();
          healthCheck.services.socialMedia.youtube = youtubeCheck.valid || false;
        } catch (error) {
          logger.debug('YouTube credentials not configured or invalid');
        }

        // Check TikTok
        try {
          const tiktokService = socialMediaConnector.service('tiktok');
          const tiktokCheck = await tiktokService.verifyCredentials();
          healthCheck.services.socialMedia.tiktok = tiktokCheck.valid || false;
        } catch (error) {
          logger.debug('TikTok credentials not configured or invalid');
        }
      }
    } catch (error: any) {
      logger.error('Social media health check error:', error);
      healthCheck.status = 'degraded';
    }

    // Determine overall status
    if (healthCheck.services.database.status === 'disconnected') {
      healthCheck.status = 'unhealthy';
    } else if (healthCheck.metrics.memory.usagePercent > 90) {
      healthCheck.status = 'degraded';
    }

    logger.info(`Health check complete - Status: ${healthCheck.status}`);

    return healthCheck;
  }

  /**
   * Get current metrics
   */
  getMetrics(): SystemMetrics {
    return this.collectMetrics();
  }

  /**
   * Track API request
   */
  trackApiRequest(endpoint: string, method: string, statusCode: number, duration: number) {
    logger.http(`${method} ${endpoint} - ${statusCode} - ${duration}ms`);
  }

  /**
   * Track social media API call
   */
  trackSocialMediaCall(platform: string, action: string, success: boolean, duration: number) {
    const message = `${platform} - ${action} - ${success ? 'SUCCESS' : 'FAILED'} - ${duration}ms`;
    logger.info(message);
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: any) {
    logger.error('Error tracked:', {
      message: error.message,
      stack: error.stack,
      context,
    });
  }

  /**
   * Shutdown monitoring service
   */
  shutdown() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    logger.info('Monitoring service shutdown');
  }
}

export default MonitoringService;
export { SystemMetrics, HealthCheck };
