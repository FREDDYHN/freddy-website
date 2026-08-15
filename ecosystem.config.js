module.exports = {
  apps: [
    {
      name: 'freddy-epr',
      cwd: '/root/freddy-epr/backend',
      script: 'src/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        BASE_URL: 'https://www.freddy-epr.com',
        DB_PATH: '/root/freddy-epr/database/data.db',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/root/logs/freddy-epr-error.log',
      out_file: '/root/logs/freddy-epr-out.log',
      max_memory_restart: '256M',
    },
  ],
}
