module.exports = {
  apps: [
    {
      name: "my-app",
      script: "./dist/index.js",  // TypeScript build output
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
