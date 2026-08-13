#!/usr/bin/env bash
#
# 部署 / 更新：安装依赖 → 构建 → 装配 standalone → systemd 起服务
# 用法（在服务器上、仓库根目录）：sudo bash deploy/run.sh
# 前置：已执行 deploy/setup.sh，且已创建 .env.local（含 ARK_API_KEY）
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

[ -f .env.local ] || { echo "!! 缺少 .env.local（含 ARK_API_KEY），请先创建。可参考 .env.example"; exit 1; }

echo "==> [1/4] 安装依赖"
pnpm install --frozen-lockfile

echo "==> [2/4] 构建（standalone）"
pnpm build

echo "==> [3/4] 装配 standalone（拷 public + static —— standalone 不自动带）"
cp -r public .next/standalone/
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/

echo "==> [4/4] 写 systemd 服务并重启"
cat > /etc/systemd/system/social-forest.service <<EOF
[Unit]
Description=social-forest (Next.js standalone)
After=network.target

[Service]
Type=simple
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
EOF

systemctl daemon-reload
systemctl enable social-forest >/dev/null 2>&1 || true
systemctl restart social-forest
sleep 2
systemctl --no-pager status social-forest | head -8 || true

echo "==> 本机自检"
curl -fsS -o /dev/null -w "    http_code=%{http_code}\n" http://127.0.0.1/ \
  || echo "    自检失败 → 查看日志：journalctl -u social-forest -n 50 --no-pager"

echo "==> 完成 → http://119.45.158.50/   （确保腾讯云安全组已放行 80 端口）"
