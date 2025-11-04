# Production Deployment Guide

This guide covers deploying Social Media CMS to production with PostgreSQL, Redis, monitoring, and CDN integration.

## 📋 Prerequisites

### Required Services
- **PostgreSQL 15+** - Production database
- **Redis 7+** - Caching and job queue
- **Node.js 18+** - Application runtime
- **Docker & Docker Compose** (optional but recommended)

### Required Accounts & API Keys
- Social media platform developer accounts (Facebook, Twitter, LinkedIn, YouTube, TikTok)
- CDN service (Cloudinary or AWS S3)
- Email service provider (SendGrid recommended)
- Monitoring service (Sentry, optional)

## 🚀 Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Step 1: Configure Environment

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit with your production credentials
nano .env.production
```

**Critical Environment Variables:**
```env
# Generate secure random keys
APP_KEYS=$(openssl rand -base64 32),$(openssl rand -base64 32)
API_TOKEN_SALT=$(openssl rand -base64 32)
ADMIN_JWT_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# Database (use your production credentials)
DATABASE_HOST=your-db-host.com
DATABASE_PASSWORD=secure_password_here

# Public URL
PUBLIC_URL=https://your-domain.com
```

#### Step 2: Build and Start Services

```bash
# Build Docker images
docker-compose build

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f strapi
```

#### Step 3: Run Migrations

```bash
# Run database migrations
docker-compose exec strapi npm run strapi -- migrate

# Create admin user
docker-compose exec strapi npm run strapi -- admin:create-user
```

#### Step 4: Verify Deployment

```bash
# Health check
curl http://localhost:1337/api/health/live

# Full health check
curl http://localhost:1337/api/health

# Metrics
curl http://localhost:1337/api/metrics
```

### Option 2: Manual Deployment

#### Step 1: Set Up PostgreSQL

```sql
-- Create database
CREATE DATABASE social_media_cms_production;

-- Create user
CREATE USER cms_user WITH ENCRYPTED PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE social_media_cms_production TO cms_user;
```

#### Step 2: Install Dependencies

```bash
cd /path/to/social-media-cms
npm ci --production
```

#### Step 3: Configure Environment

```bash
cp .env.production.example .env
# Edit .env with your configuration
```

#### Step 4: Build Application

```bash
npm run build
```

#### Step 5: Start Application

```bash
# Using PM2 (recommended)
npm install -g pm2
pm2 start npm --name "social-media-cms" -- start

# Or using Node directly
npm start
```

## 🗄️ Database Configuration

### PostgreSQL Production Settings

```typescript
// config/env/production/database.ts
export default ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME'),
      user: env('DATABASE_USERNAME'),
      password: env('DATABASE_PASSWORD'),
      ssl: {
        rejectUnauthorized: true,
        ca: env('DATABASE_CA_CERT'), // For managed databases
      },
    },
    pool: {
      min: 5,
      max: 20,
    },
  },
});
```

### Database Backup

```bash
# Create backup
pg_dump -h localhost -U cms_user -d social_media_cms_production > backup_$(date +%Y%m%d).sql

# Restore backup
psql -h localhost -U cms_user -d social_media_cms_production < backup.sql

# Automated daily backups
0 2 * * * pg_dump -h localhost -U cms_user social_media_cms_production | gzip > /backups/cms_$(date +\%Y\%m\%d).sql.gz
```

## 🔧 CDN Configuration

### Cloudinary Setup

1. **Create Cloudinary Account**: https://cloudinary.com/users/register/free

2. **Get API Credentials**:
   - Dashboard → Account Details
   - Copy Cloud Name, API Key, API Secret

3. **Configure in .env**:
```env
CDN_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

4. **Update Upload Configuration**:
```typescript
// config/plugins.ts
upload: {
  config: {
    provider: 'cloudinary',
    providerOptions: {
      cloud_name: env('CLOUDINARY_CLOUD_NAME'),
      api_key: env('CLOUDINARY_API_KEY'),
      api_secret: env('CLOUDINARY_API_SECRET'),
    },
  },
},
```

### AWS S3 Setup (Alternative)

1. **Create S3 Bucket**:
```bash
aws s3 mb s3://social-media-cms-uploads
```

2. **Configure Bucket Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::social-media-cms-uploads/*"
    }
  ]
}
```

3. **Configure in .env**:
```env
UPLOAD_PROVIDER=aws-s3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=social-media-cms-uploads
```

## 📊 Monitoring Setup

### Health Endpoints

The application provides three health check endpoints:

1. **Liveness Probe** - `/api/health/live`
   - Quick check if application is running
   - Use for Kubernetes/Docker health checks

2. **Readiness Probe** - `/api/health/ready`
   - Checks database connectivity
   - Use for load balancer health checks

3. **Full Health Check** - `/api/health`
   - Comprehensive system check
   - Database, Redis, social media APIs
   - System metrics

4. **Metrics** - `/api/metrics`
   - CPU, memory, uptime statistics
   - Use for monitoring dashboards

### Kubernetes Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: social-media-cms
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: strapi
        image: your-registry/social-media-cms:latest
        ports:
        - containerPort: 1337
        livenessProbe:
          httpGet:
            path: /api/health/live
            port: 1337
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 1337
          initialDelaySeconds: 30
          periodSeconds: 5
```

### Logging

Logs are written to:
- Console (all environments)
- `/app/logs/` directory (production)
  - `error.log` - Error logs only
  - `combined.log` - All logs
  - `analytics.log` - Analytics operations
  - `social-media-api.log` - Social media API calls
  - `security.log` - Security events

### Log Rotation

```bash
# Install logrotate
sudo apt-get install logrotate

# Create logrotate config
sudo nano /etc/logrotate.d/social-media-cms

# Add configuration
/app/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 strapi strapi
    sharedscripts
    postrotate
        docker-compose exec strapi kill -USR1 1
    endscript
}
```

## 🔒 Security Hardening

### SSL/TLS Configuration

Use a reverse proxy (Nginx) for SSL termination:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:1337;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Firewall Rules

```bash
# Allow only necessary ports
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### Environment Security

```bash
# Secure .env file
chmod 600 .env.production

# Never commit .env to git
echo ".env.production" >> .gitignore

# Use secrets management
# - AWS Secrets Manager
# - HashiCorp Vault
# - Kubernetes Secrets
```

## 🚀 CI/CD Pipeline

The project includes GitHub Actions workflow (`.github/workflows/deploy.yml`):

### Required GitHub Secrets

```
DOCKER_USERNAME
DOCKER_PASSWORD
DATABASE_URL
PRODUCTION_SERVER_SSH_KEY
```

### Manual Deployment

```bash
# Using the deployment script
./scripts/deploy.sh production

# Or step by step
git pull origin production
docker-compose build
docker-compose down
docker-compose up -d
```

## 📈 Performance Optimization

### Database Optimization

```sql
-- Create indexes for frequently queried fields
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled_at ON social_posts(scheduled_at);
CREATE INDEX idx_analytics_post_id ON analytics(post_id);

-- Analyze tables
ANALYZE social_posts;
ANALYZE analytics;
```

### Redis Caching

Configure Redis for:
- Session storage
- API response caching
- Job queue for background tasks

```typescript
// In your configuration
cache: {
  enabled: true,
  type: 'redis',
  options: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
},
```

## 🔄 Backup & Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Database backup
docker-compose exec -T postgres pg_dump -U postgres social_media_cms > "${BACKUP_DIR}/db_${TIMESTAMP}.sql"

# File backup
tar -czf "${BACKUP_DIR}/files_${TIMESTAMP}.tar.gz" public/uploads

# Upload to S3
aws s3 cp "${BACKUP_DIR}/db_${TIMESTAMP}.sql" s3://your-backup-bucket/
aws s3 cp "${BACKUP_DIR}/files_${TIMESTAMP}.tar.gz" s3://your-backup-bucket/

# Keep only last 30 days
find ${BACKUP_DIR} -name "*.sql" -mtime +30 -delete
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +30 -delete
```

## 🆘 Troubleshooting

### Application Won't Start

```bash
# Check logs
docker-compose logs strapi

# Check database connection
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# Rebuild containers
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### High Memory Usage

```bash
# Check memory usage
docker stats

# Restart container
docker-compose restart strapi

# Increase memory limit in docker-compose.yml
services:
  strapi:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Database Connection Issues

```bash
# Test connection
psql -h your-db-host -U cms_user -d social_media_cms_production

# Check pool settings
# Increase pool size in database.ts
pool: {
  min: 10,
  max: 30,
}
```

## 📞 Support

For production support:
- Check logs: `docker-compose logs -f`
- Health check: `curl http://localhost:1337/api/health`
- Metrics: `curl http://localhost:1337/api/metrics`

## ✅ Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] Admin user created
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Health checks passing
- [ ] Monitoring enabled
- [ ] Backup script scheduled
- [ ] Social media API credentials verified
- [ ] CDN configured and tested
- [ ] Email sending tested
- [ ] Load testing completed
- [ ] Security scan passed

---

**Need Help?** Check the main [README.md](./README.md) for additional documentation.
