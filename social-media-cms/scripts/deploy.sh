#!/bin/bash

# Social Media CMS Deployment Script
# This script handles deployment to production environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
APP_NAME="social-media-cms"
BACKUP_DIR="./backups"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Social Media CMS Deployment Script${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_info "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    print_info "All requirements satisfied"
}

# Create backup
create_backup() {
    print_info "Creating backup..."
    
    mkdir -p ${BACKUP_DIR}
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"
    
    # Backup database
    docker-compose exec -T postgres pg_dump -U postgres social_media_cms > "${BACKUP_DIR}/db_${TIMESTAMP}.sql"
    
    # Backup uploads
    tar -czf "${BACKUP_FILE}" public/uploads database
    
    print_info "Backup created: ${BACKUP_FILE}"
}

# Pull latest changes
pull_changes() {
    print_info "Pulling latest changes from repository..."
    git pull origin ${ENVIRONMENT}
}

# Build Docker images
build_images() {
    print_info "Building Docker images..."
    docker-compose build --no-cache
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."
    docker-compose run --rm strapi npm run strapi -- migrate
}

# Start services
start_services() {
    print_info "Starting services..."
    docker-compose up -d
}

# Health check
health_check() {
    print_info "Performing health check..."
    
    MAX_RETRIES=30
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -f http://localhost:1337/api/health/live > /dev/null 2>&1; then
            print_info "Application is healthy!"
            return 0
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        print_warning "Waiting for application to be ready... (${RETRY_COUNT}/${MAX_RETRIES})"
        sleep 5
    done
    
    print_error "Health check failed after ${MAX_RETRIES} attempts"
    return 1
}

# Cleanup old Docker images
cleanup() {
    print_info "Cleaning up old Docker images..."
    docker image prune -f
}

# Rollback function
rollback() {
    print_error "Deployment failed. Rolling back..."
    
    # Stop current containers
    docker-compose down
    
    # Checkout previous commit
    git reset --hard HEAD~1
    
    # Rebuild and restart
    docker-compose build
    docker-compose up -d
    
    print_info "Rollback completed"
}

# Main deployment flow
main() {
    # Check requirements
    check_requirements
    
    # Create backup before deployment
    create_backup
    
    # Pull latest changes
    pull_changes
    
    # Build new images
    build_images
    
    # Stop existing services
    print_info "Stopping existing services..."
    docker-compose down
    
    # Run migrations
    run_migrations
    
    # Start services
    start_services
    
    # Health check
    if ! health_check; then
        rollback
        exit 1
    fi
    
    # Cleanup
    cleanup
    
    print_info "Deployment completed successfully!"
    
    # Show logs
    print_info "Showing recent logs..."
    docker-compose logs --tail=50 strapi
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main

exit 0
