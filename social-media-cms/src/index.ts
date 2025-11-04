export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    // Register custom functionality
    strapi.log.info('Registering Social Media CMS...');

    // Initialize custom plugins
    const plugins = ['social-media-connector', 'analytics-dashboard', 'content-scheduler', 'workflow-management'];
    
    plugins.forEach(plugin => {
      try {
        if (strapi.plugin(plugin)) {
          strapi.log.info(`Plugin ${plugin} registered successfully`);
        }
      } catch (error) {
        strapi.log.warn(`Plugin ${plugin} not found or failed to register`);
      }
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    strapi.log.info('Bootstrapping Social Media CMS...');

    // Initialize monitoring service
    try {
      const MonitoringService = require('./utils/monitoring').default;
      strapi.monitoring = new MonitoringService(strapi);
      strapi.monitoring.initialize();
      strapi.log.info('Monitoring service initialized');
    } catch (error) {
      strapi.log.error('Failed to initialize monitoring service:', error);
    }

    // Initialize content scheduler
    try {
      const scheduler = strapi.plugin('content-scheduler')?.service('scheduler');
      if (scheduler) {
        await scheduler.initialize();
        strapi.log.info('Content scheduler initialized');
      }
    } catch (error) {
      strapi.log.error('Failed to initialize content scheduler:', error);
    }

    // Set up cron jobs for analytics sync
    if (process.env.CRON_ENABLED === 'true') {
      strapi.cron.add({
        // Sync analytics every hour
        syncAnalytics: {
          task: async ({ strapi }) => {
            strapi.log.info('Running scheduled analytics sync...');
            try {
              const posts = await strapi.entityService.findMany('api::social-post.social-post', {
                filters: {
                  status: 'published',
                },
                limit: 100,
              });

              for (const post of posts) {
                // Sync analytics for each platform
                for (const platform of post.platforms) {
                  try {
                    const service = strapi.plugin('social-media-connector')?.service(platform);
                    const externalId = post.externalIds?.[platform];
                    
                    if (service && externalId) {
                      const analytics = await service.getPostAnalytics(externalId);
                      
                      if (analytics.success) {
                        // Update or create analytics record
                        const existingAnalytics = await strapi.entityService.findMany(
                          'api::analytics.analytics',
                          {
                            filters: {
                              post: { id: post.id },
                              platform,
                            },
                          }
                        );

                        if (existingAnalytics.length > 0) {
                          await strapi.entityService.update(
                            'api::analytics.analytics',
                            existingAnalytics[0].id,
                            {
                              data: {
                                ...analytics.analytics,
                                lastSyncedAt: new Date().toISOString(),
                              },
                            }
                          );
                        } else {
                          await strapi.entityService.create('api::analytics.analytics', {
                            data: {
                              post: post.id,
                              ...analytics.analytics,
                              lastSyncedAt: new Date().toISOString(),
                            },
                          });
                        }
                      }
                    }
                  } catch (error) {
                    strapi.log.error(`Failed to sync analytics for post ${post.id} on ${platform}:`, error);
                  }
                }
              }

              strapi.log.info('Analytics sync completed');
            } catch (error) {
              strapi.log.error('Analytics sync failed:', error);
            }
          },
          options: {
            rule: '0 * * * *', // Every hour at minute 0
            tz: process.env.SCHEDULER_TIMEZONE || 'UTC',
          },
        },
      });
    }

    // Log system status
    strapi.log.info('Social Media CMS bootstrap completed');
    strapi.log.info(`Environment: ${process.env.NODE_ENV}`);
    strapi.log.info(`Database: ${process.env.DATABASE_CLIENT}`);
    strapi.log.info(`Cron jobs: ${process.env.CRON_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
  },
};
