/**
 * PM2 Ecosystem Configuration
 * Zero-downtime deployment configuration for Jensei Backend
 * 
 * Configuration Options:
 * - Simple (single instance): instances: 1, exec_mode: 'fork'
 * - Cluster (multi-core): instances: 'max', exec_mode: 'cluster'
 * 
 * For a simple API on single EC2 instance, use fork mode (current setting).
 * Switch to cluster mode only if you need to handle high traffic.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  apps: [
    {
      name: 'jensei-backend',
      script: join(__dirname, 'server.js'), // Use absolute path for reliability
      
      // Single instance mode (simpler for single EC2)
      // Change to instances: 'max' and exec_mode: 'cluster' for multi-core utilization
      instances: 1,
      exec_mode: 'fork', // Single process - simpler and sufficient for most APIs
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Zero-downtime reload configuration
      kill_timeout: 5000, // Time to wait before force kill (ms)
      wait_ready: true, // Wait for app to be ready before reloading
      listen_timeout: 10000, // Time to wait for app to listen (ms)
      
      // Auto-restart configuration
      autorestart: true,
      max_restarts: 10, // Maximum number of restarts
      min_uptime: '10s', // Minimum uptime before considering app stable
      max_memory_restart: '500M', // Restart if memory exceeds 500MB (adjust based on your EC2 instance size)
      
      // Logging configuration
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      time: true, // Prepend timestamp to logs
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Don't watch files in production
      watch: false,
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'ubuntu', // EC2 user (adjust if different)
      host: ['api.jensei.com'], // Your EC2 hostname or IP
      ref: 'origin/main', // Git branch to deploy
      repo: 'git@github.com:jenseitech/jensei-backend-node.git', // Your repo URL
      path: '/home/ubuntu/jensei-backend', // Deployment path on EC2
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /home/ubuntu/jensei-backend',
      'pre-deploy-local': 'echo "Deploying to production..."',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};

