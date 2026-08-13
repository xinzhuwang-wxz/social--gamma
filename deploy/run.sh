#!/usr/bin/env bash
#
# 部署 / 更新：安装 → 构建 → 建库 → 装配 standalone → systemd（以当前用户运行，CAP 绑 80）
# 用法（服务器仓库根目录，用普通用户如 ubuntu，**不要加 sudo**；脚本内部按需 sudo）：
#   bash deploy/run.sh
# 前置：已执行 deploy/setup.sh，且已创建 .env.local（含 ARK_API_KEY）
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"
RUN_USER="$(id -un)"
DB_PATH="$APP_DIR/data/social-forest.db"

[ -f .env.local ] || { echo "!! 缺少 .env.local（含 ARK_API_KEY），请先创建。参考 .env.example"; exit 1; }

echo "==> [1/5] 安装依赖"
pnpm install --frozen-lockfile

echo "==> [2/5] 构建（standalone）"
pnpm build

echo "==> [3/5] 初始化数据库（/api/auth、/api/clarify 依赖 users 等表）"
mkdir -p data
# DATABASE_URL 规范为绝对路径，避免 systemd 工作目录(.next/standalone)下相对路径错位
if grep -q '^DATABASE_URL=' .env.local; then
  sed -i "s#^DATABASE_URL=.*#DATABASE_URL=file:$DB_PATH#" .env.local
else
  echo "DATABASE_URL=file:$DB_PATH" >> .env.local
fi
DATABASE_URL="file:$DB_PATH" pnpm db:push
DATABASE_URL="file:$DB_PATH" pnpm db:seed || echo "  (db:seed 非致命，schema 已就绪)"

echo "==> [4/5] 装配 standalone（拷 public + static —— standalone 不自动带）"
rm -rf .next/standalone/public .next/standalone/.next/static
cp -r public .next/standalone/
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/

echo "==> [5/5] 写 systemd 服务并重启（以 $RUN_USER 运行，CAP_NET_BIND_SERVICE 绑 80）"
sudo tee /etc/systemd/system/social-forest.service >/dev/null <<UNIT
[Unit]
Description=social-forest (Next.js standalone)
After=network.target

[Service]
Type=simple
User=$RUN_USER
Group=$RUN_USER
AmbientCapabilities=CAP_NET_BIND_SERVICE
WorkingDirectory=$APP_DIR/.next/standalone
EnvironmentFile=$APP_DIR/.env.local
Environment=NODE_ENV=production
Environment=PORT=80
Environment=HOSTNAME=0.0.0.0
ExecStart=/usr/bin/node $APP_DIR/.next/standalone/server.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable social-forest >/dev/null 2>&1 || true
sudo systemctl restart social-forest
sleep 2
sudo systemctl --no-pager status social-forest | head -8 || true

echo "==> 本机自检"
curl -fsS -o /dev/null -w "    http_code=%{http_code}\n" http://127.0.0.1/ \
  || echo "    自检失败 → 查看日志：journalctl -u social-forest -n 50 --no-pager"

echo "==> 完成 → http://119.45.158.50/   （确保腾讯云安全组已放行 80 端口）"
