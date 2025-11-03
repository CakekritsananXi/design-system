import * as cron from 'node-cron';
import { format, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

interface ScheduledJob {
  id: string;
  task: cron.ScheduledTask;
  postId: number;
  scheduledAt: Date;
}

export default ({ strapi }) => ({
  jobs: new Map<string, ScheduledJob>(),

  async initialize() {
    // Load all scheduled posts on startup
    await this.loadScheduledPosts();
    strapi.log.info('Content Scheduler initialized');
  },

  async loadScheduledPosts() {
    try {
      const scheduledPosts = await strapi.entityService.findMany('api::social-post.social-post', {
        filters: {
          status: 'scheduled',
          scheduledAt: {
            $gte: new Date().toISOString(),
          },
        },
      });

      for (const post of scheduledPosts) {
        await this.schedulePost(post);
      }

      strapi.log.info(`Loaded ${scheduledPosts.length} scheduled posts`);
    } catch (error) {
      strapi.log.error('Error loading scheduled posts:', error);
    }
  },

  async schedulePost(post: any) {
    try {
      const scheduledAt = new Date(post.scheduledAt);
      const now = new Date();

      if (scheduledAt <= now) {
        // If scheduled time has passed, publish immediately
        await this.publishPost(post.id);
        return;
      }

      // Convert scheduled time to cron expression
      const timezone = post.timezone || 'UTC';
      const zonedTime = utcToZonedTime(scheduledAt, timezone);
      
      const minute = zonedTime.getMinutes();
      const hour = zonedTime.getHours();
      const day = zonedTime.getDate();
      const month = zonedTime.getMonth() + 1;
      
      // Cron expression: minute hour day month dayOfWeek
      const cronExpression = `${minute} ${hour} ${day} ${month} *`;

      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }

      // Create scheduled task
      const task = cron.schedule(cronExpression, async () => {
        await this.publishPost(post.id);
        this.jobs.delete(post.id.toString());
      }, {
        scheduled: true,
        timezone,
      });

      // Store job reference
      this.jobs.set(post.id.toString(), {
        id: post.id.toString(),
        task,
        postId: post.id,
        scheduledAt,
      });

      strapi.log.info(`Scheduled post ${post.id} for ${scheduledAt.toISOString()}`);

      return {
        success: true,
        postId: post.id,
        scheduledAt,
        cronExpression,
      };
    } catch (error: any) {
      strapi.log.error('Error scheduling post:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  async unschedulePost(postId: number) {
    try {
      const jobId = postId.toString();
      const job = this.jobs.get(jobId);

      if (job) {
        job.task.stop();
        this.jobs.delete(jobId);
        strapi.log.info(`Unscheduled post ${postId}`);
        return { success: true };
      }

      return {
        success: false,
        error: 'Job not found',
      };
    } catch (error: any) {
      strapi.log.error('Error unscheduling post:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  async reschedulePost(postId: number, newScheduledAt: Date) {
    try {
      // Unschedule existing job
      await this.unschedulePost(postId);

      // Get post and schedule with new time
      const post = await strapi.entityService.findOne('api::social-post.social-post', postId);
      
      if (!post) {
        throw new Error('Post not found');
      }

      // Update scheduled time
      await strapi.entityService.update('api::social-post.social-post', postId, {
        data: {
          scheduledAt: newScheduledAt.toISOString(),
        },
      });

      // Schedule with new time
      return await this.schedulePost({ ...post, scheduledAt: newScheduledAt });
    } catch (error: any) {
      strapi.log.error('Error rescheduling post:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  async publishPost(postId: number) {
    try {
      strapi.log.info(`Publishing scheduled post ${postId}`);

      // Get post details
      const post = await strapi.entityService.findOne('api::social-post.social-post', postId, {
        populate: ['media', 'campaign', 'template'],
      });

      if (!post) {
        throw new Error('Post not found');
      }

      const results: any[] = [];
      const errors: any[] = [];

      // Publish to each platform
      for (const platform of post.platforms) {
        try {
          let result;
          
          switch (platform) {
            case 'facebook':
              result = await strapi
                .plugin('social-media-connector')
                .service('facebook')
                .publishPost(this.formatPostForPlatform(post, 'facebook'));
              break;
            
            case 'instagram':
              // Instagram uses Facebook Graph API
              result = await strapi
                .plugin('social-media-connector')
                .service('facebook')
                .publishPost(this.formatPostForPlatform(post, 'instagram'));
              break;
            
            case 'twitter':
              result = await strapi
                .plugin('social-media-connector')
                .service('twitter')
                .publishPost(this.formatPostForPlatform(post, 'twitter'));
              break;
            
            case 'linkedin':
              result = await strapi
                .plugin('social-media-connector')
                .service('linkedin')
                .publishPost(this.formatPostForPlatform(post, 'linkedin'));
              break;
            
            case 'youtube':
              result = await strapi
                .plugin('social-media-connector')
                .service('youtube')
                .uploadVideo(this.formatPostForPlatform(post, 'youtube'));
              break;
            
            case 'tiktok':
              result = await strapi
                .plugin('social-media-connector')
                .service('tiktok')
                .uploadVideo(this.formatPostForPlatform(post, 'tiktok'));
              break;
          }

          if (result.success) {
            results.push(result);
            
            // Update external ID
            const externalIds = post.externalIds || {};
            externalIds[platform] = result.postId || result.videoId;
            
            await strapi.entityService.update('api::social-post.social-post', postId, {
              data: {
                externalIds,
              },
            });
          } else {
            errors.push({ platform, error: result.error });
          }
        } catch (error: any) {
          strapi.log.error(`Error publishing to ${platform}:`, error);
          errors.push({ platform, error: error.message });
        }
      }

      // Update post status
      const finalStatus = errors.length === 0 ? 'published' : 
                         results.length === 0 ? 'failed' : 'published';

      await strapi.entityService.update('api::social-post.social-post', postId, {
        data: {
          status: finalStatus,
          publishedAt: new Date().toISOString(),
          publishErrors: errors,
        },
      });

      return {
        success: errors.length === 0,
        results,
        errors,
        postId,
      };
    } catch (error: any) {
      strapi.log.error('Error publishing post:', error);
      
      // Update post status to failed
      await strapi.entityService.update('api::social-post.social-post', postId, {
        data: {
          status: 'failed',
          publishErrors: [{ error: error.message }],
        },
      });

      return {
        success: false,
        error: error.message,
        postId,
      };
    }
  },

  formatPostForPlatform(post: any, platform: string) {
    const platformSpecific = post.platformSpecific?.[platform] || {};
    
    switch (platform) {
      case 'facebook':
      case 'instagram':
        return {
          message: post.content,
          media: post.media?.map((m: any) => m.url) || [],
          ...platformSpecific,
        };
      
      case 'twitter':
        return {
          text: post.content,
          media: post.media?.map((m: any) => m.url) || [],
          threadMode: platformSpecific.threadMode || false,
          threadPosts: platformSpecific.threadPosts || [],
        };
      
      case 'linkedin':
        return {
          text: post.content,
          media: post.media?.map((m: any) => m.url) || [],
          visibility: platformSpecific.visibility || 'PUBLIC',
        };
      
      case 'youtube':
        return {
          title: platformSpecific.title || post.title,
          description: platformSpecific.description || post.content,
          videoUrl: post.media?.[0]?.url || '',
          category: platformSpecific.category,
          privacy: platformSpecific.privacy || 'public',
          tags: platformSpecific.tags || post.hashtags || [],
        };
      
      case 'tiktok':
        return {
          videoUrl: post.media?.[0]?.url || '',
          caption: post.content,
          privacy: platformSpecific.privacy || 'PUBLIC',
          allowComment: platformSpecific.allowComments ?? true,
          allowDuet: platformSpecific.allowDuet ?? true,
          allowStitch: platformSpecific.allowStitch ?? true,
        };
      
      default:
        return {};
    }
  },

  getScheduledJobs() {
    const jobs: any[] = [];
    
    this.jobs.forEach((job) => {
      jobs.push({
        postId: job.postId,
        scheduledAt: job.scheduledAt,
      });
    });

    return jobs;
  },

  async destroy() {
    // Stop all scheduled jobs
    this.jobs.forEach((job) => {
      job.task.stop();
    });
    this.jobs.clear();
    strapi.log.info('Content Scheduler destroyed');
  },
});
