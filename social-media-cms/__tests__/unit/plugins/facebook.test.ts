import axios from 'axios';
import facebookService from '../../../src/plugins/social-media-connector/server/services/facebook';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Facebook Service', () => {
  let service: any;
  const mockStrapi = {
    log: {
      info: jest.fn(),
      error: jest.fn(),
    },
  };

  beforeEach(() => {
    service = facebookService({ strapi: mockStrapi });
    process.env.FACEBOOK_APP_ID = 'test_app_id';
    process.env.FACEBOOK_APP_SECRET = 'test_app_secret';
    process.env.FACEBOOK_ACCESS_TOKEN = 'test_access_token';
    process.env.FACEBOOK_PAGE_ID = 'test_page_id';
    service.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with correct configuration', () => {
      expect(service.config).toBeDefined();
      expect(service.config.appId).toBe('test_app_id');
      expect(service.config.accessToken).toBe('test_access_token');
    });
  });

  describe('publishPost', () => {
    it('should successfully publish a text post', async () => {
      const mockResponse = {
        data: {
          id: 'post_123',
        },
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const postData = {
        message: 'Test post message',
      };

      const result = await service.publishPost(postData);

      expect(result.success).toBe(true);
      expect(result.postId).toBe('post_123');
      expect(result.platform).toBe('facebook');
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should successfully publish a post with image', async () => {
      const mockResponse = {
        data: {
          id: 'post_with_image_123',
        },
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const postData = {
        message: 'Test post with image',
        media: ['https://example.com/image.jpg'],
      };

      const result = await service.publishPost(postData);

      expect(result.success).toBe(true);
      expect(result.postId).toBe('post_with_image_123');
    });

    it('should handle publish errors', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Invalid access token',
            },
          },
        },
      };
      mockedAxios.post.mockRejectedValue(mockError);

      const postData = {
        message: 'Test post',
      };

      const result = await service.publishPost(postData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.platform).toBe('facebook');
    });

    it('should handle scheduled posts', async () => {
      const mockResponse = {
        data: {
          id: 'scheduled_post_123',
        },
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const scheduledTime = new Date('2024-12-31T12:00:00Z');
      const postData = {
        message: 'Scheduled post',
        scheduledTime,
      };

      const result = await service.publishPost(postData);

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            published: false,
            scheduled_publish_time: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('getPostAnalytics', () => {
    it('should successfully fetch post analytics', async () => {
      const mockResponse = {
        data: {
          insights: {
            data: [
              {
                name: 'post_impressions',
                values: [{ value: 1000 }],
              },
              {
                name: 'post_engaged_users',
                values: [{ value: 50 }],
              },
              {
                name: 'post_clicks',
                values: [{ value: 25 }],
              },
            ],
          },
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.getPostAnalytics('post_123');

      expect(result.success).toBe(true);
      expect(result.analytics.impressions).toBe(1000);
      expect(result.analytics.engagement).toBe(50);
      expect(result.analytics.clicks).toBe(25);
    });

    it('should handle analytics fetch errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.getPostAnalytics('post_123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('deletePost', () => {
    it('should successfully delete a post', async () => {
      mockedAxios.delete.mockResolvedValue({ data: { success: true } });

      const result = await service.deletePost('post_123');

      expect(result.success).toBe(true);
      expect(result.platform).toBe('facebook');
      expect(mockedAxios.delete).toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      mockedAxios.delete.mockRejectedValue(new Error('Post not found'));

      const result = await service.deletePost('post_123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyCredentials', () => {
    it('should verify valid credentials', async () => {
      const mockResponse = {
        data: {
          id: 'user_123',
          name: 'Test User',
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.verifyCredentials();

      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe('user_123');
    });

    it('should handle invalid credentials', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Invalid token'));

      const result = await service.verifyCredentials();

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getMediaType', () => {
    it('should identify video files', () => {
      expect(service.getMediaType('https://example.com/video.mp4')).toBe('video');
      expect(service.getMediaType('https://example.com/video.mov')).toBe('video');
      expect(service.getMediaType('https://example.com/video.avi')).toBe('video');
    });

    it('should identify photo files', () => {
      expect(service.getMediaType('https://example.com/image.jpg')).toBe('photo');
      expect(service.getMediaType('https://example.com/image.png')).toBe('photo');
      expect(service.getMediaType('https://example.com/image.gif')).toBe('photo');
    });
  });
});
