#!/usr/bin/env bash
set -e

APP_DIR="/var/www/canhbao"
REPO_URL="https://github.com/letranbaotran/canhbao.git"
PORT=8066

echo "======================================================"
echo "🚀 TRIỂN KHAI HỆ THỐNG CẢNH BÁO EA SÚP (canhbao.easupso.com)"
echo "📂 Thư mục đích: $APP_DIR | Cổng lắng nghe: $PORT"
echo "======================================================"

mkdir -p /var/www

if [ ! -d "$APP_DIR/.git" ]; then
  echo "📥 Đang clone mã nguồn từ GitHub về $APP_DIR..."
  rm -rf "$APP_DIR"
  git clone -b main "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
else
  echo "🔄 Đang pull mã nguồn mới nhất từ nhánh main vào $APP_DIR..."
  cd "$APP_DIR"
  git fetch origin main
  git reset --hard origin/main
fi

if [ ! -f "$APP_DIR/.env" ] && [ -f "$APP_DIR/.env.example" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
fi

echo "📦 Đang cài đặt thư viện và đóng gói bản sản xuất (Next.js Standalone)..."
npm install
npx prisma generate
npm run build

if command -v pm2 >/dev/null 2>&1; then
  echo "⚡ Đang khởi chạy dịch vụ qua PM2 tại cổng $PORT (0.0.0.0:$PORT)..."
  pm2 delete canhbao-easupso >/dev/null 2>&1 || true
  PORT=$PORT HOSTNAME=0.0.0.0 NODE_ENV=production pm2 start .next/standalone/server.js --name "canhbao-easupso"
  pm2 save
  echo "✅ Đã khởi chạy thành công qua PM2 trên cổng $PORT!"
elif command -v docker >/dev/null 2>&1; then
  echo "🐳 Đang khởi chạy container Docker easup_web tại cổng $PORT..."
  docker compose up -d --build web
  echo "✅ Đã khởi chạy thành công qua Docker trên cổng $PORT!"
else
  echo "⚡ Đang cài đặt PM2 và khởi chạy dịch vụ tại cổng $PORT..."
  npm install -g pm2
  PORT=$PORT HOSTNAME=0.0.0.0 NODE_ENV=production pm2 start .next/standalone/server.js --name "canhbao-easupso"
  pm2 save
  echo "✅ Đã khởi chạy thành công trên cổng $PORT!"
fi

echo "======================================================"
echo "🎉 HOÀN TẤT! Dịch vụ đang lắng nghe tại: http://0.0.0.0:$PORT"
echo "🌐 Tên miền Nginx Proxy Manager: https://canhbao.easupso.com"
echo "======================================================"

