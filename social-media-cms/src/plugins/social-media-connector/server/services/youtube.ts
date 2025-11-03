import { google, youtube_v3 } from 'googleapis';
import axios from 'axios';

interface YouTubeVideo {
  title: string;
  description: string;
  videoUrl: string;
  category?: string;
  privacy?: 'public' | 'private' | 'unlisted';
  tags?: string[];
  thumbnail?: string;
}

interface YouTubeConfig {
  apiKey: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export default ({ strapi }) => ({
  youtube: null as youtube_v3.Youtube | null,
  oauth2Client: null as any,
  config: null as YouTubeConfig | null,

  initialize() {
    this.config = {
      apiKey: process.env.YOUTUBE_API_KEY || '',
      clientId: process.env.YOUTUBE_CLIENT_ID || '',
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
      refreshToken: process.env.YOUTUBE_REFRESH_TOKEN || '',
    };

    if (this.config.clientId && this.config.clientSecret && this.config.refreshToken) {
      this.oauth2Client = new google.auth.OAuth2(
        this.config.clientId,
        this.config.clientSecret,
        'http://localhost'
      );

      this.oauth2Client.setCredentials({
        refresh_token: this.config.refreshToken,
      });

      this.youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client,
      });

      strapi.log.info('YouTube service initialized');
    } else {
      strapi.log.warn('YouTube credentials not fully configured');
    }
  },

  async uploadVideo(videoData: YouTubeVideo) {
    try {
      if (!this.youtube) {
        throw new Error('YouTube client not initialized');
      }

      // Download video file
      const videoResponse = await axios.get(videoData.videoUrl, {
        responseType: 'stream',
      });

      const requestBody = {
        snippet: {
          title: videoData.title,
          description: videoData.description,
          tags: videoData.tags || [],
          categoryId: videoData.category || '22', // Default: People & Blogs
        },
        status: {
          privacyStatus: videoData.privacy || 'public',
        },
      };

      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody,
        media: {
          body: videoResponse.data,
        },
      });

      // Set custom thumbnail if provided
      if (videoData.thumbnail && response.data.id) {
        await this.setThumbnail(response.data.id, videoData.thumbnail);
      }

      return {
        success: true,
        videoId: response.data.id,
        platform: 'youtube',
        data: response.data,
      };
    } catch (error: any) {
      strapi.log.error('YouTube upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload video',
        platform: 'youtube',
      };
    }
  },

  async setThumbnail(videoId: string, thumbnailUrl: string) {
    try {
      if (!this.youtube) {
        throw new Error('YouTube client not initialized');
      }

      // Download thumbnail
      const thumbnailResponse = await axios.get(thumbnailUrl, {
        responseType: 'stream',
      });

      await this.youtube.thumbnails.set({
        videoId,
        media: {
          body: thumbnailResponse.data,
        },
      });

      return { success: true };
    } catch (error: any) {
      strapi.log.error('YouTube thumbnail error:', error);
      return {
        success: false,
        error: error.message || 'Failed to set thumbnail',
      };
    }
  },

  async updateVideo(videoId: string, updates: Partial<YouTubeVideo>) {
    try {
      if (!this.youtube) {
        throw new Error('YouTube client not initialized');
      }

      const requestBody: any = {
        id: videoId,
      };

      if (updates.title || updates.description || updates.tags) {
        requestBody.snippet = {};
        if (updates.title) requestBody.snippet.title = updates.title;
        if (updates.description) requestBody.snippet.description = updates.description;
        if (updates.tags) requestBody.snippet.tags = updates.tags;
      }

      if (updates.privacy) {
        requestBody.status = {
          privacyStatus: updates.privacy,
        };
      }

      const response = await this.youtube.videos.update({
        part: ['snippet', 'status'],
        requestBody,
      });

      return {
        success: true,
        videoId: response.data.id,
        platform: 'youtube',
        data: response.data,
      };
    } catch (error: any) {
      strapi.log.error('YouTube update error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update video',
      };
    }
  },

  async getVideoAnalytics(videoId: string) {
    try {
      if (!this.youtube) {
        throw new Error('YouTube client not initialized');
      }

      const response = await this.youtube.videos.list({
        part: ['statistics', 'snippet'],
        id: [videoId],
      });

      const video = response.data.items?.[0];
      if (!video) {
        throw new Error('Video not found');
      }

      const stats = video.statistics;

      return {
        success: true,
        analytics: {
          platform: 'youtube',
          videoId,
          views: parseInt(stats?.viewCount || '0'),
          likes: parseInt(stats?.likeCount || '0'),
          dislikes: parseInt(stats?.dislikeCount || '0'),
          comments: parseInt(stats?.commentCount || '0'),
          favorites: parseInt(stats?.favoriteCount || '0'),
          engagement: parseInt(stats?.likeCount || '0') + 
                     parseInt(stats?.commentCount || '0'),
        },
      };
    } catch (error: any) {
      strapi.log.error('YouTube analytics error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch analytics',
      };
    }
  },

  async deleteVideo(videoId: string) {
    try {
      if (!this.youtube) {
        throw new Error('YouTube client not initialized');
      }

      await this.youtube.videos.delete({
        id: videoId,
      });

      return {
        success: true,
        platform: 'youtube',
      };
    } catch (error: any) {
      strapi.log.error('YouTube delete error:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete video',
      };
    }
  },

  async verifyCredentials() {
    try {
      if (!this.youtube) {
        return { valid: false, error: 'Client not initialized' };
      }

      const response = await this.youtube.channels.list({
        part: ['snippet'],
        mine: true,
      });

      return {
        valid: true,
        channel: response.data.items?.[0],
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Failed to verify credentials',
      };
    }
  },

  async searchVideos(query: string, maxResults: number = 10) {
    try {
      if (!this.youtube) {
        throw new Error('YouTube client not initialized');
      }

      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        type: ['video'],
        maxResults,
      });

      return {
        success: true,
        videos: response.data.items,
      };
    } catch (error: any) {
      strapi.log.error('YouTube search error:', error);
      return {
        success: false,
        error: error.message || 'Failed to search videos',
      };
    }
  },
});
