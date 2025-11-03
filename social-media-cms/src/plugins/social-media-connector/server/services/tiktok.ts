import axios from 'axios';

interface TikTokVideo {
  videoUrl: string;
  caption: string;
  privacy: 'PUBLIC' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  allowComment?: boolean;
  allowDuet?: boolean;
  allowStitch?: boolean;
}

interface TikTokConfig {
  clientKey: string;
  clientSecret: string;
  accessToken: string;
}

export default ({ strapi }) => ({
  config: null as TikTokConfig | null,

  initialize() {
    this.config = {
      clientKey: process.env.TIKTOK_CLIENT_KEY || '',
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
      accessToken: process.env.TIKTOK_ACCESS_TOKEN || '',
    };
    strapi.log.info('TikTok service initialized');
  },

  async uploadVideo(videoData: TikTokVideo) {
    try {
      if (!this.config?.accessToken) {
        throw new Error('TikTok credentials not configured');
      }

      // Step 1: Initialize upload
      const initResponse = await axios.post(
        'https://open-api.tiktok.com/share/video/upload/',
        {
          video: {
            url: videoData.videoUrl,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const uploadToken = initResponse.data.data.upload_token;

      // Step 2: Publish video
      const publishResponse = await axios.post(
        'https://open-api.tiktok.com/share/video/publish/',
        {
          upload_token: uploadToken,
          video_title: videoData.caption,
          privacy_level: videoData.privacy || 'PUBLIC',
          disable_comment: !(videoData.allowComment ?? true),
          disable_duet: !(videoData.allowDuet ?? true),
          disable_stitch: !(videoData.allowStitch ?? true),
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        videoId: publishResponse.data.data.share_id,
        platform: 'tiktok',
        data: publishResponse.data.data,
      };
    } catch (error: any) {
      strapi.log.error('TikTok upload error:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
        platform: 'tiktok',
      };
    }
  },

  async getVideoInfo(videoId: string) {
    try {
      if (!this.config?.accessToken) {
        throw new Error('TikTok credentials not configured');
      }

      const response = await axios.get(
        `https://open-api.tiktok.com/video/query/`,
        {
          params: {
            video_id: videoId,
          },
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      return {
        success: true,
        video: response.data.data,
      };
    } catch (error: any) {
      strapi.log.error('TikTok get video error:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  async getVideoAnalytics(videoId: string) {
    try {
      if (!this.config?.accessToken) {
        throw new Error('TikTok credentials not configured');
      }

      const response = await axios.post(
        'https://open-api.tiktok.com/v2/research/video/query/',
        {
          filters: {
            video_id: {
              operation: 'IN',
              field_values: [videoId],
            },
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const video = response.data.data.videos?.[0];
      if (!video) {
        throw new Error('Video not found');
      }

      return {
        success: true,
        analytics: {
          platform: 'tiktok',
          videoId,
          views: video.video_view_count || 0,
          likes: video.like_count || 0,
          comments: video.comment_count || 0,
          shares: video.share_count || 0,
          engagement: (video.like_count || 0) + 
                     (video.comment_count || 0) + 
                     (video.share_count || 0),
        },
      };
    } catch (error: any) {
      strapi.log.error('TikTok analytics error:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  async deleteVideo(videoId: string) {
    try {
      if (!this.config?.accessToken) {
        throw new Error('TikTok credentials not configured');
      }

      await axios.post(
        'https://open-api.tiktok.com/video/delete/',
        {
          video_id: videoId,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        platform: 'tiktok',
      };
    } catch (error: any) {
      strapi.log.error('TikTok delete error:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  async verifyCredentials() {
    try {
      if (!this.config?.accessToken) {
        return { valid: false, error: 'No access token configured' };
      }

      const response = await axios.get(
        'https://open-api.tiktok.com/oauth/userinfo/',
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      return {
        valid: true,
        user: response.data.data.user,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data || error.message,
      };
    }
  },

  async getUserVideos(maxResults: number = 20) {
    try {
      if (!this.config?.accessToken) {
        throw new Error('TikTok credentials not configured');
      }

      const response = await axios.post(
        'https://open-api.tiktok.com/v2/video/list/',
        {
          max_count: maxResults,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        videos: response.data.data.videos,
      };
    } catch (error: any) {
      strapi.log.error('TikTok get user videos error:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },
});
