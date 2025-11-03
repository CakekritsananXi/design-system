import axios from 'axios';

interface FacebookPost {
  message: string;
  media?: string[];
  scheduledTime?: Date;
  targeting?: any;
}

interface FacebookConfig {
  appId: string;
  appSecret: string;
  accessToken: string;
  pageId?: string;
}

export default ({ strapi }) => ({
  config: null as FacebookConfig | null,

  initialize() {
    this.config = {
      appId: process.env.FACEBOOK_APP_ID || '',
      appSecret: process.env.FACEBOOK_APP_SECRET || '',
      accessToken: process.env.FACEBOOK_ACCESS_TOKEN || '',
      pageId: process.env.FACEBOOK_PAGE_ID || '',
    };
    strapi.log.info('Facebook service initialized');
  },

  async publishPost(postData: FacebookPost) {
    try {
      if (!this.config?.accessToken || !this.config?.pageId) {
        throw new Error('Facebook credentials not configured');
      }

      const endpoint = `https://graph.facebook.com/v18.0/${this.config.pageId}/feed`;
      
      const params: any = {
        message: postData.message,
        access_token: this.config.accessToken,
      };

      // Handle media uploads
      if (postData.media && postData.media.length > 0) {
        if (postData.media.length === 1) {
          // Single image/video
          const mediaType = this.getMediaType(postData.media[0]);
          if (mediaType === 'photo') {
            params.url = postData.media[0];
          } else if (mediaType === 'video') {
            return await this.publishVideo(postData);
          }
        } else {
          // Multiple images
          return await this.publishAlbum(postData);
        }
      }

      // Handle scheduled posts
      if (postData.scheduledTime) {
        params.published = false;
        params.scheduled_publish_time = Math.floor(postData.scheduledTime.getTime() / 1000);
      }

      const response = await axios.post(endpoint, null, { params });

      return {
        success: true,
        postId: response.data.id,
        platform: 'facebook',
        data: response.data,
      };
    } catch (error: any) {
      strapi.log.error('Facebook publish error:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
        platform: 'facebook',
      };
    }
  },

  async publishVideo(postData: FacebookPost) {
    try {
      if (!this.config?.accessToken || !this.config?.pageId) {
        throw new Error('Facebook credentials not configured');
      }

      const endpoint = `https://graph.facebook.com/v18.0/${this.config.pageId}/videos`;
      
      const params = {
        description: postData.message,
        file_url: postData.media?.[0],
        access_token: this.config.accessToken,
      };

      const response = await axios.post(endpoint, null, { params });

      return {
        success: true,
        postId: response.data.id,
        platform: 'facebook',
        type: 'video',
        data: response.data,
      };
    } catch (error: any) {
      strapi.log.error('Facebook video publish error:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
        platform: 'facebook',
      };
    }
  },

  async publishAlbum(postData: FacebookPost) {
    try {
      if (!this.config?.accessToken || !this.config?.pageId) {
        throw new Error('Facebook credentials not configured');
      }

      // Step 1: Upload photos
      const uploadedPhotos = [];
      for (const media of postData.media || []) {
        const endpoint = `https://graph.facebook.com/v18.0/${this.config.pageId}/photos`;
        const params = {
          url: media,
          published: false,
          access_token: this.config.accessToken,
        };
        
        const response = await axios.post(endpoint, null, { params });
        uploadedPhotos.push({ media_fbid: response.data.id });
      }

      // Step 2: Create album post
      const endpoint = `https://graph.facebook.com/v18.0/${this.config.pageId}/feed`;
      const params = {
        message: postData.message,
        attached_media: JSON.stringify(uploadedPhotos),
        access_token: this.config.accessToken,
      };

      const response = await axios.post(endpoint, null, { params });

      return {
        success: true,
        postId: response.data.id,
        platform: 'facebook',
        type: 'album',
        data: response.data,
      };
    } catch (error: any) {
      strapi.log.error('Facebook album publish error:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
        platform: 'facebook',
      };
    }
  },

  async getPostAnalytics(postId: string) {
    try {
      if (!this.config?.accessToken) {
        throw new Error('Facebook credentials not configured');
      }

      const endpoint = `https://graph.facebook.com/v18.0/${postId}`;
      const params = {
        fields: 'insights.metric(post_impressions,post_engaged_users,post_reactions_by_type_total,post_clicks)',
        access_token: this.config.accessToken,
      };

      const response = await axios.get(endpoint, { params });

      const insights = response.data.insights?.data || [];
      const analytics: any = {
        platform: 'facebook',
        postId,
      };

      insights.forEach((metric: any) => {
        const value = metric.values?.[0]?.value || 0;
        switch (metric.name) {
          case 'post_impressions':
            analytics.impressions = value;
            break;
          case 'post_engaged_users':
            analytics.engagement = value;
            break;
          case 'post_clicks':
            analytics.clicks = value;
            break;
          case 'post_reactions_by_type_total':
            analytics.reactions = value;
            break;
        }
      });

      return {
        success: true,
        analytics,
      };
    } catch (error: any) {
      strapi.log.error('Facebook analytics error:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  async deletePost(postId: string) {
    try {
      if (!this.config?.accessToken) {
        throw new Error('Facebook credentials not configured');
      }

      const endpoint = `https://graph.facebook.com/v18.0/${postId}`;
      const params = {
        access_token: this.config.accessToken,
      };

      await axios.delete(endpoint, { params });

      return {
        success: true,
        platform: 'facebook',
      };
    } catch (error: any) {
      strapi.log.error('Facebook delete error:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  getMediaType(url: string): 'photo' | 'video' {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
    const urlLower = url.toLowerCase();
    return videoExtensions.some(ext => urlLower.includes(ext)) ? 'video' : 'photo';
  },

  async verifyCredentials() {
    try {
      if (!this.config?.accessToken) {
        return { valid: false, error: 'No access token configured' };
      }

      const endpoint = 'https://graph.facebook.com/v18.0/me';
      const params = {
        access_token: this.config.accessToken,
      };

      const response = await axios.get(endpoint, { params });

      return {
        valid: true,
        user: response.data,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data || error.message,
      };
    }
  },
});
