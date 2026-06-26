#!/bin/bash
# FREDDY EPR — 一键部署到服务器
# 用法: ./deploy_to_server.sh <服务器IP>
set -e

GREEN='\033[0;32m'; NC='\033[0m'
log() { echo -e "${GREEN}[✓]${NC} $1"; }

SERVER_IP="${1:?用法: ./deploy_to_server.sh <服务器IP>}"
SSH_USER="${2:-root}"
SSH_TARGET="${SSH_USER}@${SERVER_IP}"
DEPLOY_TAR="freddy-epr-deploy.tar.gz"
PROJECT_DIR="/root/freddy-website"

echo "🚀 FREDDY EPR 一键部署"
echo "   目标: ${SSH_TARGET}"
echo ""

# ─── Step 1: 构建前端 ───
log "1/5 构建前端 React 应用..."
cd frontend && npm run build && cd ..
log "前端构建完成: $(ls -lh frontend/dist/index.html | awk '{print $5}')"

# ─── Step 2: 打包 ───
log "2/5 打包部署文件..."
tar czf "$DEPLOY_TAR" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='src-legacy' \
  --exclude='frontend/node_modules' \
  --exclude='backend/node_modules' \
  backend/package.json backend/package-lock.json backend/src/ \
  frontend/dist/ \
  database/ \
  docgen/ \
  templates/ \
  shared/ \
  ecosystem.config.js \
  projects/
log "部署包: $(ls -lh $DEPLOY_TAR | awk '{print $5}')"

# ─── Step 3: 上传 ───
log "3/5 上传到服务器..."
scp "$DEPLOY_TAR" "${SSH_TARGET}:${PROJECT_DIR}/"
log "上传完成"

# ─── Step 4: 服务器安装 ───
log "4/5 服务器安装依赖并启动..."
ssh "${SSH_TARGET}" << 'ENDSSH'
set -e
cd /root/freddy-website

# 解压
tar xzf freddy-epr-deploy.tar.gz
rm freddy-epr-deploy.tar.gz

# 安装后端依赖
cd backend
npm install --omit=dev
cd ..

# 创建目录
mkdir -p /root/logs /root/database

# 初始化数据库（首次）
cd database
if [ ! -f data.db ]; then
    sqlite3 data.db < schema.sql 2>/dev/null || true
fi
cd ..

# 创建 .env (only on first deploy — preserves existing JWT_SECRET)
if [ ! -f backend/.env ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    cat > backend/.env << EOF
NODE_ENV=production
PORT=3002
BASE_URL=https://www.freddy-epr.cn
JWT_SECRET=${JWT_SECRET}
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EOF
    echo "✓ .env created with random JWT_SECRET"
fi

# PM2 重启
command -v pm2 && pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save
echo "✓ PM2 已启动"
ENDSSH
log "服务器安装完成"

# ─── Step 5: 验证 ───
log "5/5 验证部署..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${SERVER_IP}:3002/api/health" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log "部署成功! http://${SERVER_IP}:3002"
else
    echo "⚠ 健康检查返回: ${HTTP_CODE}，请检查服务器日志"
fi

echo ""
echo "📋 Nginx 配置参考 (加到 /etc/nginx/sites-enabled/freddy-epr):"
cat << 'NGINX'
server {
    listen 80;
    server_name freddy-epr.cn www.freddy-epr.cn;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    client_max_body_size 20M;
}
NGINX
