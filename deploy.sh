#!/bin/bash

# Jensei Backend Zero-Downtime Deployment Script
# Usage: ./deploy.sh

set -e  # Exit on any error

echo "🚀 Starting Jensei Backend deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed. Please install it first:${NC}"
    echo "npm install -g pm2"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "ecosystem.config.cjs" ]; then
    echo -e "${RED}❌ ecosystem.config.cjs not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes from git...${NC}"
git pull origin main || {
    echo -e "${RED}❌ Failed to pull changes. Please check your git repository.${NC}"
    exit 1
}

# Install dependencies
echo -e "${YELLOW}📦 Installing/updating dependencies...${NC}"
npm install

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from env.production...${NC}"
    if [ -f "env.production" ]; then
        cp env.production .env
        echo -e "${YELLOW}⚠️  Please update .env with your production values!${NC}"
    else
        echo -e "${RED}❌ env.production not found. Please create .env file manually.${NC}"
        exit 1
    fi
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if application is already running
if pm2 list | grep -q "jensei-backend"; then
    echo -e "${YELLOW}🔄 Application is running. Performing zero-downtime reload...${NC}"
    pm2 reload ecosystem.config.cjs --env production
    
    # Wait a moment and verify the server is actually listening
    sleep 3
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is healthy and responding${NC}"
    else
        echo -e "${RED}⚠️  Warning: Server reloaded but health check failed!${NC}"
        echo -e "${YELLOW}   Check logs: pm2 logs jensei-backend --err${NC}"
    fi
else
    echo -e "${YELLOW}▶️  Starting application for the first time...${NC}"
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    
    # Wait and verify startup
    sleep 3
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server started successfully${NC}"
    else
        echo -e "${RED}❌ Server started but health check failed!${NC}"
        echo -e "${YELLOW}   Check logs: pm2 logs jensei-backend --err${NC}"
        exit 1
    fi
fi

# Wait a moment for the reload to complete
sleep 2

# Check application status
echo -e "${YELLOW}📊 Application status:${NC}"
pm2 list

# Show recent logs
echo -e "${YELLOW}📝 Recent logs:${NC}"
pm2 logs jensei-backend --lines 10 --nostream

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Useful commands:"
echo "  - View logs: pm2 logs jensei-backend"
echo "  - Monitor: pm2 monit"
echo "  - Status: pm2 list"
echo "  - Reload: pm2 reload ecosystem.config.cjs --env production"

