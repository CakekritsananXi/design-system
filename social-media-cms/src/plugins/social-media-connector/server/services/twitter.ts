import { TwitterApi, TweetV2PostTweetResult } from 'twitter-api-v2';

interface TwitterPost {
  text: string;
  media?: string[];
  poll?: {
    options: string[];
    durationMinutes: number;
  };
  threadMode?: boolean;
  threadPosts?: string[];
}

interface TwitterConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
  bearerToken: string;
}

export default ({ strapi }) => ({
  client: null as TwitterApi | null,
  config: null as TwitterConfig | null,

  initialize() {
    this.config = {
      appKey: process.env.TWITTER_API_KEY || '',
      appSecret: process.env.TWITTER_API_SECRET || '',
      accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
      bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
    };

    if (this.config.appKey && this.config.appSecret && this.config.accessToken && this.config.accessSecret) {
      this.client = new TwitterApi({
        appKey: this.config.appKey,
        appSecret: this.config.appSecret,
        accessToken: this.config.accessToken,
        accessSecret: this.config.accessSecret,
      });
      strapi.log.info('Twitter service initialized');
    } else {
      strapi.log.warn('Twitter credentials not fully configured');
    }
  },

  async publishPost(postData: TwitterPost) {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      // Handle thread mode
      if (postData.threadMode && postData.threadPosts && postData.threadPosts.length > 0) {
        return await this.publishThread(postData);
      }

      const tweetData: any = {
        text: postData.text,
      };

      // Handle media uploads
      if (postData.media && postData.media.length > 0) {
        const mediaIds = await this.uploadMedia(postData.media);
        if (mediaIds.length > 0) {
          tweetData.media = { media_ids: mediaIds };
        }
      }

      // Handle polls
      if (postData.poll) {
        tweetData.poll = {
          options: postData.poll.options,
          duration_minutes: postData.poll.durationMinutes,
        };
      }

      const tweet = await this.client.v2.tweet(tweetData);

      return {
        success: true,
        postId: tweet.data.id,
        platform: 'twitter',
        data: tweet.data,
      };
    } catch (error: any) {
      strapi.log.error('Twitter publish error:', error);
      return {
        success: false,
        error: error.message || 'Failed to publish tweet',
        platform: 'twitter',
      };
    }
  },

  async publishThread(postData: TwitterPost) {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      const tweets: TweetV2PostTweetResult[] = [];
      let replyToId: string | undefined;

      // Publish first tweet
      const firstTweet = await this.client.v2.tweet({
        text: postData.text,
      });
      tweets.push(firstTweet);
      replyToId = firstTweet.data.id;

      // Publish thread tweets
      if (postData.threadPosts) {
        for (const threadText of postData.threadPosts) {
          const threadTweet = await this.client.v2.tweet({
            text: threadText,
            reply: {
              in_reply_to_tweet_id: replyToId,
            },
          });
          tweets.push(threadTweet);
          replyToId = threadTweet.data.id;
        }
      }

      return {
        success: true,
        postId: tweets[0].data.id,
        threadIds: tweets.map(t => t.data.id),
        platform: 'twitter',
        type: 'thread',
        data: tweets.map(t => t.data),
      };
    } catch (error: any) {
      strapi.log.error('Twitter thread publish error:', error);
      return {
        success: false,
        error: error.message || 'Failed to publish thread',
        platform: 'twitter',
      };
    }
  },

  async uploadMedia(mediaUrls: string[]): Promise<string[]> {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      const mediaIds: string[] = [];

      for (const mediaUrl of mediaUrls) {
        // Download media from URL
        const axios = require('axios');
        const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        // Upload to Twitter
        const mediaId = await this.client.v1.uploadMedia(buffer, {
          mimeType: response.headers['content-type'],
        });

        mediaIds.push(mediaId);
      }

      return mediaIds;
    } catch (error: any) {
      strapi.log.error('Twitter media upload error:', error);
      return [];
    }
  },

  async getPostAnalytics(tweetId: string) {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      const tweet = await this.client.v2.singleTweet(tweetId, {
        'tweet.fields': ['public_metrics', 'created_at'],
      });

      const metrics = tweet.data.public_metrics;

      return {
        success: true,
        analytics: {
          platform: 'twitter',
          postId: tweetId,
          likes: metrics?.like_count || 0,
          retweets: metrics?.retweet_count || 0,
          replies: metrics?.reply_count || 0,
          quotes: metrics?.quote_count || 0,
          impressions: metrics?.impression_count || 0,
          engagement: (metrics?.like_count || 0) + 
                     (metrics?.retweet_count || 0) + 
                     (metrics?.reply_count || 0) + 
                     (metrics?.quote_count || 0),
        },
      };
    } catch (error: any) {
      strapi.log.error('Twitter analytics error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch analytics',
      };
    }
  },

  async deletePost(tweetId: string) {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      await this.client.v2.deleteTweet(tweetId);

      return {
        success: true,
        platform: 'twitter',
      };
    } catch (error: any) {
      strapi.log.error('Twitter delete error:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete tweet',
      };
    }
  },

  async verifyCredentials() {
    try {
      if (!this.client) {
        return { valid: false, error: 'Client not initialized' };
      }

      const user = await this.client.v2.me();

      return {
        valid: true,
        user: user.data,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Failed to verify credentials',
      };
    }
  },

  async searchTweets(query: string, maxResults: number = 10) {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      const tweets = await this.client.v2.search(query, {
        max_results: maxResults,
        'tweet.fields': ['public_metrics', 'created_at', 'author_id'],
      });

      return {
        success: true,
        tweets: tweets.data.data,
      };
    } catch (error: any) {
      strapi.log.error('Twitter search error:', error);
      return {
        success: false,
        error: error.message || 'Failed to search tweets',
      };
    }
  },
});
