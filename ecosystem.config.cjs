module.exports = {
  apps: [
    {
      name: "poppik-app",
      script: "./dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      max_restarts: 10,
      min_uptime: "30s",
      restart_delay: 3000,
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      merge_logs: true,
      env: {
        NODE_ENV: "production",
        NODE_OPTIONS: "--max-old-space-size=512"
      }
    }
  ]
};
