# PM2 "Watching" Feature Explained

## What is "Watching"?

**Watching** in PM2 means **file watching** - PM2 monitors your project files for changes and automatically restarts the application when any file is modified.

## How It Works

When enabled:
- PM2 watches all files in your project directory
- If any file changes (you edit code, save files, etc.)
- PM2 automatically restarts the application
- You see the changes immediately without manually restarting

## Current Status: Disabled ✅ (Correct for Production)

In your `ecosystem.config.cjs`, watching is disabled:
```javascript
watch: false, // Don't watch files in production
```

**This is the correct setting for production!**

## When to Enable Watching

### ✅ Enable Watching For:
- **Development/Testing** - When you're actively coding and want instant restarts
- **Local Development** - When running on your local machine
- **Staging Environment** - If you want automatic restarts during testing

### ❌ Disable Watching For:
- **Production** - Your current setup (EC2 production server)
- **Performance** - File watching uses CPU/memory resources
- **Stability** - You don't want accidental restarts from log file changes

## Why Disabled in Production?

1. **Performance**: File watching consumes CPU and memory
2. **Stability**: You don't want the server restarting unexpectedly
3. **Security**: Prevents accidental restarts from log file writes
4. **Control**: You want to control when deployments happen
5. **Resource Usage**: Unnecessary overhead on production servers

## How to Enable (If Needed for Development)

### Option 1: Update ecosystem.config.cjs

```javascript
{
  name: 'jensei-backend',
  script: path.join(__dirname, 'server.js'),
  watch: true, // Enable watching
  ignore_watch: [
    'node_modules',
    'logs',
    '.git',
    '*.log',
    '.env'
  ],
  // ... rest of config
}
```

### Option 2: Enable via Command Line

```bash
# Enable watching for existing process
pm2 restart jensei-backend --watch

# Or start with watching
pm2 start ecosystem.config.cjs --watch --env production
```

## What Files Are Watched?

When enabled, PM2 watches:
- ✅ All `.js`, `.json`, `.cjs` files
- ✅ Configuration files
- ✅ Source code files

**But you can exclude:**
- `node_modules/` (always excluded by default)
- `logs/` directory
- `.git/` directory
- `.env` files
- Any files you specify in `ignore_watch`

## Example: Development vs Production

### Development Config (watching enabled):
```javascript
{
  name: 'jensei-backend-dev',
  script: './server.js',
  watch: true,
  ignore_watch: ['node_modules', 'logs', '.git'],
  env: {
    NODE_ENV: 'development'
  }
}
```

### Production Config (watching disabled - your current setup):
```javascript
{
  name: 'jensei-backend',
  script: path.join(__dirname, 'server.js'),
  watch: false, // ✅ Disabled for production
  env_production: {
    NODE_ENV: 'production'
  }
}
```

## Current Setup: Perfect for Production ✅

Your current configuration is **correct**:
- ✅ `watch: false` - No automatic restarts
- ✅ Production environment
- ✅ Stable, controlled deployments
- ✅ Better performance

## When You Might Want to Enable It

Only enable watching if:
1. You're running a **development server** on EC2 (not recommended)
2. You want to test changes **without manual restarts** (use staging environment instead)
3. You're doing **local development** (use a separate dev config)

## Best Practice

**Keep watching disabled in production** (as you have now).

For development, use:
- Local machine with `watch: true`
- Or a separate development ecosystem config
- Or use `npm run dev` which has its own file watching

## Summary

| Feature | Development | Production (Your Setup) |
|---------|------------|------------------------|
| **Watching** | ✅ Enabled | ❌ Disabled ✅ |
| **Auto-restart on file change** | ✅ Yes | ❌ No |
| **Performance impact** | Low (acceptable) | None (better) |
| **Stability** | Less stable | More stable ✅ |
| **Control** | Automatic | Manual/Deployment ✅ |

**Your current setup is perfect for production!** Keep watching disabled.

