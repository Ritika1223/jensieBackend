/**
 * PM2 Ecosystem Configuration - Simplified Version
 * For single EC2 instance with simple Node.js API
 */

export default {
  apps: [
    {
      name: 'jensei-backend',
      script: './server.js',
      
      // Single instance (fork mode) - simpler for single server
      instances: 1,
      exec_mode: 'fork', // Single process, no clustering
      
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Zero-downtime reload (still important!)
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Auto-restart on crash
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M', // Lower for single instance
      
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true,
      
      // Don't watch files in production
      watch: false,
    },
  ],
};

