import * as cron from 'node-cron';
import schedulerService from '../../../src/plugins/content-scheduler/server/services/scheduler';

jest.mock('node-cron');
const mockedCron = cron as jest.Mocked<typeof cron>;

describe('Scheduler Service', () => {
  let service: any;
  const mockStrapi = {
    log: {
      info: jest.fn(),
      error: jest.fn(),
    },
    entityService: {
      findOne: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    plugin: jest.fn((pluginName: string) => ({
      service: jest.fn((serviceName: string) => ({
        publishPost: jest.fn().mockResolvedValue({ success: true, postId: 'fb_123' }),
        uploadVideo: jest.fn().mockResolvedValue({ success: true, videoId: 'yt_123' }),
      })),
    })),
  };

  beforeEach(() => {
    service = schedulerService({ strapi: mockStrapi });
    mockedCron.validate.mockReturnValue(true);
    mockedCron.schedule.mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadScheduledPosts', () => {
    it('should load and schedule posts on initialization', async () => {
      const mockPosts = [
        {
          id: 1,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          timezone: 'UTC',
        },
        {
          id: 2,
          scheduledAt: new Date(Date.now() + 172800000).toISOString(), // 2 days later
          timezone: 'UTC',
        },
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockPosts);

      await service.loadScheduledPosts();

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::social-post.social-post',
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'scheduled',
          }),
        })
      );
      expect(mockedCron.schedule).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during loading', async () => {
      mockStrapi.entityService.findMany.mockRejectedValue(new Error('Database error'));

      await service.loadScheduledPosts();

      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });

  describe('schedulePost', () => {
    it('should schedule a post successfully', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const post = {
        id: 1,
        title: 'Test Post',
        content: 'Test content',
        platforms: ['facebook'],
        scheduledAt: futureDate,
        timezone: 'UTC',
      };

      const result = await service.schedulePost(post);

      expect(result.success).toBe(true);
      expect(result.postId).toBe(1);
      expect(mockedCron.schedule).toHaveBeenCalled();
      expect(service.jobs.size).toBe(1);
    });

    it('should publish immediately if scheduled time has passed', async () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const post = {
        id: 1,
        scheduledAt: pastDate,
        timezone: 'UTC',
        platforms: ['facebook'],
        content: 'Test',
      };

      mockStrapi.entityService.findOne.mockResolvedValue(post);

      await service.schedulePost(post);

      // Should not create a cron job
      expect(mockedCron.schedule).not.toHaveBeenCalled();
    });

    it('should handle different timezones', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const post = {
        id: 1,
        scheduledAt: futureDate,
        timezone: 'America/New_York',
        platforms: ['facebook'],
        content: 'Test',
      };

      const result = await service.schedulePost(post);

      expect(result.success).toBe(true);
      expect(mockedCron.schedule).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          timezone: 'America/New_York',
        })
      );
    });

    it('should handle invalid cron expressions', async () => {
      mockedCron.validate.mockReturnValue(false);

      const futureDate = new Date(Date.now() + 86400000);
      const post = {
        id: 1,
        scheduledAt: futureDate,
        timezone: 'UTC',
      };

      const result = await service.schedulePost(post);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid cron expression');
    });
  });

  describe('unschedulePost', () => {
    it('should unschedule an existing post', async () => {
      const mockTask = {
        stop: jest.fn(),
        start: jest.fn(),
      };

      service.jobs.set('1', {
        id: '1',
        task: mockTask,
        postId: 1,
        scheduledAt: new Date(),
      });

      const result = await service.unschedulePost(1);

      expect(result.success).toBe(true);
      expect(mockTask.stop).toHaveBeenCalled();
      expect(service.jobs.size).toBe(0);
    });

    it('should handle non-existent jobs', async () => {
      const result = await service.unschedulePost(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Job not found');
    });
  });

  describe('reschedulePost', () => {
    it('should reschedule a post successfully', async () => {
      const mockTask = {
        stop: jest.fn(),
        start: jest.fn(),
      };

      service.jobs.set('1', {
        id: '1',
        task: mockTask,
        postId: 1,
        scheduledAt: new Date(),
      });

      const newDate = new Date(Date.now() + 86400000);
      const post = {
        id: 1,
        scheduledAt: new Date(),
        timezone: 'UTC',
        platforms: ['facebook'],
        content: 'Test',
      };

      mockStrapi.entityService.findOne.mockResolvedValue(post);
      mockStrapi.entityService.update.mockResolvedValue({ ...post, scheduledAt: newDate });

      const result = await service.reschedulePost(1, newDate);

      expect(result.success).toBe(true);
      expect(mockTask.stop).toHaveBeenCalled();
      expect(mockStrapi.entityService.update).toHaveBeenCalled();
    });
  });

  describe('publishPost', () => {
    it('should publish to all configured platforms', async () => {
      const post = {
        id: 1,
        title: 'Test Post',
        content: 'Test content',
        platforms: ['facebook', 'twitter'],
        media: [],
        platformSpecific: {},
        externalIds: {},
      };

      mockStrapi.entityService.findOne.mockResolvedValue(post);
      mockStrapi.entityService.update.mockResolvedValue(post);

      const result = await service.publishPost(1);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(mockStrapi.entityService.update).toHaveBeenCalledWith(
        'api::social-post.social-post',
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'published',
          }),
        })
      );
    });

    it('should handle partial failures', async () => {
      const post = {
        id: 1,
        platforms: ['facebook', 'twitter'],
        content: 'Test',
        media: [],
        platformSpecific: {},
        externalIds: {},
      };

      mockStrapi.entityService.findOne.mockResolvedValue(post);
      
      // Mock one success and one failure
      mockStrapi.plugin.mockImplementation((pluginName: string) => ({
        service: jest.fn((serviceName: string) => {
          if (serviceName === 'facebook') {
            return {
              publishPost: jest.fn().mockResolvedValue({ success: true, postId: 'fb_123' }),
            };
          }
          return {
            publishPost: jest.fn().mockResolvedValue({ success: false, error: 'Twitter error' }),
          };
        }),
      }));

      const result = await service.publishPost(1);

      expect(result.results).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle post not found', async () => {
      mockStrapi.entityService.findOne.mockResolvedValue(null);

      const result = await service.publishPost(999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Post not found');
    });
  });

  describe('formatPostForPlatform', () => {
    it('should format post for Facebook', () => {
      const post = {
        content: 'Test content',
        media: [{ url: 'https://example.com/image.jpg' }],
        platformSpecific: {
          facebook: {
            pageId: 'page_123',
          },
        },
      };

      const formatted = service.formatPostForPlatform(post, 'facebook');

      expect(formatted).toEqual({
        message: 'Test content',
        media: ['https://example.com/image.jpg'],
        pageId: 'page_123',
      });
    });

    it('should format post for Twitter', () => {
      const post = {
        content: 'Test tweet',
        media: [{ url: 'https://example.com/image.jpg' }],
        platformSpecific: {
          twitter: {
            threadMode: true,
            threadPosts: ['Tweet 2', 'Tweet 3'],
          },
        },
      };

      const formatted = service.formatPostForPlatform(post, 'twitter');

      expect(formatted).toEqual({
        text: 'Test tweet',
        media: ['https://example.com/image.jpg'],
        threadMode: true,
        threadPosts: ['Tweet 2', 'Tweet 3'],
      });
    });

    it('should format post for YouTube', () => {
      const post = {
        title: 'Video Title',
        content: 'Video description',
        media: [{ url: 'https://example.com/video.mp4' }],
        hashtags: ['video', 'test'],
        platformSpecific: {
          youtube: {
            category: '22',
            privacy: 'public',
          },
        },
      };

      const formatted = service.formatPostForPlatform(post, 'youtube');

      expect(formatted.title).toBe('Video Title');
      expect(formatted.videoUrl).toBe('https://example.com/video.mp4');
      expect(formatted.tags).toEqual(['video', 'test']);
    });
  });

  describe('getScheduledJobs', () => {
    it('should return all scheduled jobs', () => {
      const date1 = new Date();
      const date2 = new Date(Date.now() + 86400000);

      service.jobs.set('1', {
        id: '1',
        task: {} as any,
        postId: 1,
        scheduledAt: date1,
      });

      service.jobs.set('2', {
        id: '2',
        task: {} as any,
        postId: 2,
        scheduledAt: date2,
      });

      const jobs = service.getScheduledJobs();

      expect(jobs).toHaveLength(2);
      expect(jobs[0].postId).toBe(1);
      expect(jobs[1].postId).toBe(2);
    });
  });

  describe('destroy', () => {
    it('should stop all jobs and clear map', () => {
      const mockTask1 = { stop: jest.fn() };
      const mockTask2 = { stop: jest.fn() };

      service.jobs.set('1', {
        id: '1',
        task: mockTask1,
        postId: 1,
        scheduledAt: new Date(),
      });

      service.jobs.set('2', {
        id: '2',
        task: mockTask2,
        postId: 2,
        scheduledAt: new Date(),
      });

      service.destroy();

      expect(mockTask1.stop).toHaveBeenCalled();
      expect(mockTask2.stop).toHaveBeenCalled();
      expect(service.jobs.size).toBe(0);
    });
  });
});
