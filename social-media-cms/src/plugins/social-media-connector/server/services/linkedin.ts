import axios from 'axios';

interface LinkedInPost {
  text: string;
  media?: string[];
  visibility?: 'PUBLIC' | 'CONNECTIONS';
  shareUrl?: string;
}

interface LinkedInConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  organizationId?: string;
}

export default ({ strapi }) => ({
  config: null as LinkedInConfig | null,

  initialize() {
    this.config = {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
      organizationId: process.env.LINKEDIN_ORGANIZATION_ID || '',
    };
    strapi.log.info('LinkedIn service initialized');
  },

  async publishPost(postData: LinkedInPost, isOrganization: boolean = false) {
    try {
      if (!this.config?.accessToken) {
        throw new Error('LinkedIn credentials not configured');
      }

      const endpoint = 'https://api.linkedin.com/v2/ugcPosts';
      
      // Get author URN
      const authorUrn = isOrganization && this.config.organizationId
        ? `urn:li:organization:${this.config.organizationId}`
        : await this.getPersonUrn();

      const postBody: any = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: postData.text,
            },
            shareMediaCategory: postData.media && postData.media.length > 0 ? 'IMAGE' : 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': postData.visibility || 'PUBLIC',
        },
      };

      // Handle media
      if (postData.media && postData.media.length > 0) {
        const mediaAssets = await this.uploadMedia(postData.media, authorUrn);
        postBody.specificContent['com.linkedin.ugc.ShareContent'].media = mediaAssets;
      }

      // Handle link sharing
      if (postData.shareUrl) {
        postBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
        postBody.specificContent['com.linkedin.ugc.ShareContent'].media = [{
          status: 'READY',
          originalUrl: postData.shareUrl,
        }];
      }

      const response = await axios.post(endpoint, postBody, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });

      const postId = response.headers['x-restli-id'] || response.data.id;

      return {
        success: true,
        postId,
        platform: 'linkedin',
        data: response.data,
      };
    } catch (error: any) {
      strapi.log.error('LinkedIn publish error:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
        platform: 'linkedin',
      };
    }
  },

  async uploadMedia(mediaUrls: string[], authorUrn: string) {
    try {
      const mediaAssets = [];

      for (const mediaUrl of mediaUrls) {
        // Step 1: Register upload
        const registerResponse = await axios.post(
          'https://api.linkedin.com/v2/assets?action=registerUpload',
          {
            registerUploadRequest: {
              recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
              owner: authorUrn,
              serviceRelationships: [{
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              }],
            },
          },
          {
            headers: {
              'Authorization': `Bearer ${this.config!.accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const uploadUrl = registerResponse.data.value.uploadMechanism[
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
        ].uploadUrl;
        const asset = registerResponse.data.value.asset;

        // Step 2: Upload image
        const imageResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);

        await axios.put(uploadUrl, imageBuffer, {
          headers: {
            'Authorization': `Bearer ${this.config!.accessToken}`,
            'Content-Type': imageResponse.headers['content-type'] || 'image/jpeg',
          },
        });

        mediaAssets.push({
          status: 'READY',
          description: {
            text: 'Image',
          },
          media: asset,
          title: {
            text: 'Image',
          },
        });
      }

      return mediaAssets;
    } catch (error: any) {
      strapi.log.error('LinkedIn media upload error:', error);
      throw error;
    }
  },

  async getPersonUrn(): Promise<string> {
    try {
      const response = await axios.get('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
        },
      });

      return `urn:li:person:${response.data.id}`;
    } catch (error: any) {
      strapi.log.error('LinkedIn get person URN error:', error);
      throw error;
    }
  },

  async getPostAnalytics(postUrn: string) {
    try {
      if (!this.config?.accessToken) {
        throw new Error('LinkedIn credentials not configured');
      }

      const endpoint = `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}`;
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      });

      const analytics = {
        platform: 'linkedin',
        postId: postUrn,
        likes: response.data.likesSummary?.totalLikes || 0,
        comments: response.data.commentsSummary?.totalComments || 0,
        shares: response.data.sharesSummary?.totalShares || 0,
        engagement: (response.data.likesSummary?.totalLikes || 0) +
                   (response.data.commentsSummary?.totalComments || 0) +
                   (response.data.sharesSummary?.totalShares || 0),
      };

      return {
        success: true,
        analytics,
      };
    } catch (error: any) {
      strapi.log.error('LinkedIn analytics error:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  },

  async deletePost(postUrn: string) {
    try {
      if (!this.config?.accessToken) {
        throw new Error('LinkedIn credentials not configured');
      }

      const endpoint = `https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(postUrn)}`;

      await axios.delete(endpoint, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      });

      return {
        success: true,
        platform: 'linkedin',
      };
    } catch (error: any) {
      strapi.log.error('LinkedIn delete error:', error);
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

      const response = await axios.get('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      });

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
