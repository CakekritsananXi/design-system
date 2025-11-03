# Social Media CMS - Enterprise Social Media Content Management System

[![Built with Strapi](https://img.shields.io/badge/Built%20with-Strapi-blue)](https://strapi.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive, production-ready social media content management system built with **Strapi v5**. Manage, schedule, and publish content across multiple social platforms from a centralized dashboard.

## 🚀 Features

### Core Functionality
- **Multi-Platform Support**: Facebook, Instagram, Twitter/X, LinkedIn, TikTok, YouTube
- **Content Scheduling**: Advanced scheduling with timezone support and cron job management
- **Real-time Analytics**: Comprehensive performance tracking and custom metrics
- **Campaign Management**: Organize content into campaigns with budget tracking
- **Content Templates**: Reusable templates for rapid content creation
- **Multi-language Support**: Built-in i18n for global reach

### Advanced Features
- **A/B Testing**: Test content variations and track performance
- **Approval Workflows**: Multi-stage content approval process
- **Team Collaboration**: Role-based access control and activity logging
- **SEO Optimization**: Meta tags and SEO tools for better discoverability
- **Media Management**: Advanced media library with CDN integration
- **Bulk Operations**: Batch publishing and content management

### Custom Plugins
1. **Social Media Connector**: Seamless API integrations for all platforms
2. **Analytics Dashboard**: Real-time insights with custom visualizations
3. **Content Scheduler**: Automated publishing with cron job management
4. **Workflow Management**: Customizable approval processes

## 📋 Prerequisites

- **Node.js**: >= 18.0.0 <= 20.x.x
- **npm**: >= 8.0.0 or **yarn**: >= 3.5.0
- **Database**: PostgreSQL (recommended) or SQLite for development
- **Redis**: For caching and job queues (optional but recommended)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd social-media-cms
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Environment Variables

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Update the `.env` file with your:
- Database credentials
- Social media API keys
- CDN configuration (if using)
- Email provider settings
- Redis connection details

### 4. Set Up Database

```bash
npm run strapi -- database:migrate
```

### 5. Start Development Server

```bash
npm run develop
```

The admin panel will be available at `http://localhost:1337/admin`

## 🔑 Social Media API Configuration

### Facebook & Instagram

1. Create a Facebook App at [developers.facebook.com](https://developers.facebook.com)
2. Add Facebook Login and Instagram Graph API products
3. Generate a Page Access Token
4. Add to `.env`:

```env
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_ACCESS_TOKEN=your_page_access_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_id
```

### Twitter/X

1. Create a Twitter App at [developer.twitter.com](https://developer.twitter.com)
2. Generate API keys and access tokens
3. Add to `.env`:

```env
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_secret
TWITTER_BEARER_TOKEN=your_bearer_token
```

### LinkedIn

1. Create a LinkedIn App at [developers.linkedin.com](https://developers.linkedin.com)
2. Request access to Marketing Developer Platform
3. Generate access token
4. Add to `.env`:

```env
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_ACCESS_TOKEN=your_access_token
```

### TikTok

1. Register at [developers.tiktok.com](https://developers.tiktok.com)
2. Create an app and get credentials
3. Add to `.env`:

```env
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_ACCESS_TOKEN=your_access_token
```

### YouTube

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Add to `.env`:

```env
YOUTUBE_API_KEY=your_api_key
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REFRESH_TOKEN=your_refresh_token
```

## 📊 Content Types

### Social Post
Main content type for social media posts with:
- Multi-platform support
- Rich media attachments
- Platform-specific metadata
- Scheduling capabilities
- SEO optimization
- A/B testing support

### Campaign
Organize posts into marketing campaigns:
- Budget tracking
- Goal setting
- Team management
- Performance metrics
- Timeline management

### Analytics
Track performance across platforms:
- Impressions, reach, engagement
- Click-through rates
- Demographic data
- Sentiment analysis
- Historical data

### Content Template
Reusable content templates:
- Platform-specific formatting
- Variable placeholders
- Default media
- Category organization

### Approval Workflow
Content review and approval:
- Multi-stage review process
- Comment system
- Revision history
- Priority levels
- Due dates

## 🔌 API Endpoints

### Posts

```bash
# Get all posts
GET /api/social-posts

# Get single post
GET /api/social-posts/:id

# Create post
POST /api/social-posts

# Update post
PUT /api/social-posts/:id

# Delete post
DELETE /api/social-posts/:id

# Publish post immediately
POST /api/social-posts/:id/publish

# Schedule post
POST /api/social-posts/:id/schedule
```

### Campaigns

```bash
# Get all campaigns
GET /api/campaigns

# Get campaign with posts
GET /api/campaigns/:id?populate=posts

# Create campaign
POST /api/campaigns
```

### Analytics

```bash
# Get analytics for post
GET /api/analytics?filters[post][id][$eq]=:postId

# Sync analytics from platforms
POST /api/analytics/sync/:postId
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- facebook.test.ts
```

## 🔒 Security Features

- **JWT Authentication**: Secure API access with refresh tokens
- **Role-Based Access Control**: Admin, Editor, Contributor, Viewer roles
- **Rate Limiting**: Prevent API abuse
- **Security Headers**: Helmet.js integration
- **Input Validation**: Comprehensive data validation
- **Activity Logging**: Audit trail for all actions
- **CORS Configuration**: Configurable origin restrictions

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Variables for Production

Ensure all production environment variables are set:
- Set `NODE_ENV=production`
- Use strong, unique values for all secrets
- Configure proper CORS origins
- Set up SSL/TLS certificates
- Configure production database

### Docker Deployment

```bash
docker build -t social-media-cms .
docker run -p 1337:1337 social-media-cms
```

## 📚 Documentation

- [Strapi Documentation](https://docs.strapi.io)
- [Plugin Development](./docs/plugin-development.md)
- [API Reference](./docs/api-reference.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Strapi](https://strapi.io)
- Social media integrations powered by official platform APIs
- UI components from Strapi Design System

## 📧 Support

For support, email support@example.com or join our Slack community.

## 🗺️ Roadmap

- [ ] Instagram Stories and Reels support
- [ ] LinkedIn Articles publishing
- [ ] Advanced sentiment analysis with AI
- [ ] Automated content suggestions
- [ ] Mobile app for content approval
- [ ] Real-time collaboration features
- [ ] Advanced reporting and exports
- [ ] Webhook integrations
- [ ] Custom plugin marketplace

## 📊 Project Status

**Status**: Production Ready 🎉
**Version**: 1.0.0
**Last Updated**: 2024

---

Made with ❤️ by the Social Media CMS Team
