module.exports = {
  apps: [
    {
      name: "my-app",
      script: "./dist/index.js",  // TypeScript build output
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      // Add restart/backoff settings to avoid fast crash loops causing 502s
      max_restarts: 5,
      restart_delay: 5000,
      // If you use PM2's wait_ready, server should call process.send('ready') when ready
      wait_ready: false,
      listen_timeout: 8000,
      // Log files
      error_file: "./logs/my-app-err.log",
      out_file: "./logs/my-app-out.log",
      merge_logs: true,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
