# PM2 Zero-Downtime Deployment Guide

This guide explains how to deploy and manage the Jensei Backend using PM2 with zero-downtime reloads.

## Prerequisites

1. **Install PM2 globally** on your EC2 instance:
   ```bash
   npm install -g pm2
   ```

2. **Create logs directory**:
   ```bash
   mkdir -p logs
   ```

## Initial Setup on EC2

### Step 1: Clone and Setup Repository

```bash
# Navigate to your deployment directory
cd /home/ubuntu

# Clone the repository (if not already done)
git clone git@github.com:jenseitech/jensei-backend-node.git
cd jensei-backend-node

# Install dependencies
npm install

# Copy production environment file
cp env.production .env

# Edit .env with your production values
nano .env
```

### Step 2: Start Application with PM2

```bash
# Start the application using PM2 ecosystem file
pm2 start ecosystem.config.js --env production

# Save PM2 process list (so it restarts on server reboot)
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions it provides
```

## Zero-Downtime Deployment Process

### Method 1: Manual Deployment (Recommended)

1. **SSH into your EC2 instance**:
   ```bash
   ssh ubuntu@api.jensei.com
   ```

2. **Navigate to project directory**:
   ```bash
   cd /home/ubuntu/jensei-backend-node
   ```

3. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

4. **Install new dependencies** (if any):
   ```bash
   npm install
   ```

5. **Reload application with zero downtime**:
   ```bash
   pm2 reload ecosystem.config.js --env production
   ```

   This command will:
   - Start new instances with updated code
   - Wait for new instances to be ready
   - Gracefully shutdown old instances
   - **Zero downtime** - requests continue to be served during the process

### Method 2: Using PM2 Deploy (Advanced)

If you've configured the `deploy` section in `ecosystem.config.js`:

```bash
# From your local machine
pm2 deploy ecosystem.config.js production

# Or from EC2
pm2 deploy production
```

## PM2 Management Commands

### View Application Status

```bash
# View all PM2 processes
pm2 list

# View detailed information
pm2 show jensei-backend

# View real-time monitoring
pm2 monit
```

### View Logs

```bash
# View all logs
pm2 logs jensei-backend

# View only error logs
pm2 logs jensei-backend --err

# View only output logs
pm2 logs jensei-backend --out

# Clear logs
pm2 flush
```

### Application Control

```bash
# Restart application (downtime)
pm2 restart jensei-backend

# Reload application (zero-downtime)
pm2 reload jensei-backend

# Stop application
pm2 stop jensei-backend

# Delete application from PM2
pm2 delete jensei-backend
```

### Using NPM Scripts

You can also use the npm scripts defined in `package.json`:

```bash
# Start
npm run pm2:start

# Reload (zero-downtime)
npm run pm2:reload

# Restart
npm run pm2:restart

# Stop
npm run pm2:stop

# View logs
npm run pm2:logs

# Monitor
npm run pm2:monit
```

## Zero-Downtime Reload Explained

The `pm2 reload` command performs a **graceful reload**:

1. **Sends SIGINT signal** to old instances
2. **Starts new instances** with updated code
3. **Waits for new instances** to be ready (listen on port)
4. **Stops accepting new connections** on old instances
5. **Waits for existing connections** to finish (up to `kill_timeout`)
6. **Force kills** old instances if they don't stop gracefully
7. **All requests are served** throughout the process - **zero downtime**

## Configuration Details

### Cluster Mode

- **`instances: 'max'`**: Uses all available CPU cores
- **`exec_mode: 'cluster'`**: Enables cluster mode for load balancing
- Each instance handles requests independently
- PM2 automatically distributes load across instances

### Auto-Restart

- **`autorestart: true`**: Automatically restarts on crash
- **`max_restarts: 10`**: Maximum restarts in a short period
- **`min_uptime: '10s'`**: App must run for 10s to be considered stable
- **`max_memory_restart: '1G'`**: Restart if memory exceeds 1GB

### Logging

- Logs are stored in `./logs/` directory
- Separate files for errors, output, and combined logs
- Timestamps included in all log entries
- Logs from all instances are merged

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs jensei-backend --err

# Check if port is already in use
sudo lsof -i :3000

# Check application status
pm2 describe jensei-backend
```

### High Memory Usage

```bash
# Monitor memory usage
pm2 monit

# Restart if memory is high
pm2 reload jensei-backend
```

### Application Keeps Crashing

```bash
# View error logs
pm2 logs jensei-backend --err

# Check restart count
pm2 list

# If max_restarts reached, check application code
```

### PM2 Not Starting on Boot

```bash
# Re-run startup command
pm2 startup

# Follow the instructions provided
# Usually involves running a sudo command
```

## Best Practices

1. **Always use `reload` instead of `restart`** for zero-downtime
2. **Test deployments** on a staging environment first
3. **Monitor logs** after deployment
4. **Keep PM2 updated**: `npm install -g pm2@latest`
5. **Backup your `.env` file** before deployments
6. **Use version control** - always commit before deploying
7. **Monitor application health** using `pm2 monit`

## Health Check Endpoint

Your application has a health check endpoint:
```
GET /health
```

You can use this to verify the application is running after deployment.

## Example Deployment Script

Create a `deploy.sh` script for easier deployments:

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Reload application
echo "🔄 Reloading application..."
pm2 reload ecosystem.config.js --env production

# Check status
echo "✅ Deployment complete!"
pm2 list
pm2 logs jensei-backend --lines 20
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run it:
```bash
./deploy.sh
```

## Security Notes

- Never commit `.env` file to git
- Use strong JWT secrets in production
- Keep PM2 and Node.js updated
- Monitor for security vulnerabilities: `npm audit`
- Use HTTPS in production (configure reverse proxy with nginx)

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
- [PM2 Deployment](https://pm2.keymetrics.io/docs/usage/deployment/)

