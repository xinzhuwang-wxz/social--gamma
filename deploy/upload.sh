#!/usr/bin/env bash
#
# 本地执行：把源码同步到服务器（排除 node_modules / .next / .git / 密钥）
# 用法（在本地仓库根目录）：SERVER=root@119.45.158.50 bash deploy/upload.sh
#
set -euo pipefail

SERVER="${SERVER:-ubuntu@119.45.158.50}"
DEST="${DEST:-/opt/social-forest}"

ssh "$SERVER" "mkdir -p $DEST"
rsync -avz --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude data \
  --exclude .env.local \
  ./ "$SERVER:$DEST/"

echo "已同步 → $SERVER:$DEST"
echo "注意：.env.local（含 ARK 密钥）未同步，请在服务器上单独创建。"
