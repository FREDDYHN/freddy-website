module.exports = {
  apps: [
    {
      name: 'freddy-epr',
      cwd: '/root/freddy-website/backend',
      script: 'src/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        BASE_URL: 'https://www.freddy-epr.cn',
        JWT_SECRET: process.env.JWT_SECRET,
        DB_PATH: '/root/freddy-website/database/data.db',
        SMTP_HOST: process.env.SMTP_HOST || '',
        SMTP_PORT: process.env.SMTP_PORT || '',
        SMTP_USER: process.env.SMTP_USER || '',
        SMTP_PASS: process.env.SMTP_PASS || '',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/root/logs/freddy-epr-error.log',
      out_file: '/root/logs/freddy-epr-out.log',
      max_memory_restart: '256M',
    },
  ],
}
