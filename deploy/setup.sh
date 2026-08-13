#!/usr/bin/env bash
#
# 一次性服务器初始化（国内 Ubuntu）：swap + Node 22 + pnpm + 国内镜像
# 用法（在服务器上）：sudo bash deploy/setup.sh
#
set -euo pipefail

echo "==> [1/4] swap（4G 内存构建 Next 的兜底，防 OOM）"
if swapon --show | grep -q .; then
  echo "    已有 swap，跳过"
else
  fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "    已创建并启用 4G swap"
fi

echo "==> [2/4] Node 22（NodeSource）"
if command -v node >/dev/null && [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -ge 20 ]; then
  echo "    已有 Node $(node -v)，跳过"
else
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> [3/4] pnpm（corepack）"
corepack enable
corepack prepare pnpm@10.28.2 --activate

echo "==> [4/4] 国内 npm 镜像（加速 pnpm install）"
pnpm config set registry https://registry.npmmirror.com

echo "==> 完成：node $(node -v) / pnpm $(pnpm -v) / swap $(free -h | awk '/Swap/{print $2}')"
