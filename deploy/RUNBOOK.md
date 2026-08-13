# 部署手册 · social-forest

目标服务器：腾讯云 SA9 **2核 4GiB / 30Mbps / Ubuntu**，公网 `119.45.158.50`（南京一区）。

## 配置结论

够用，且有余量。真正吃算力的 AI 推理在火山方舟（ARK）那边，这台机子只做 SSR + 发静态 + 转发。

- **2核 4G**：运行时仅 ~300–500MB，轻松。唯一注意点是 `next build` 峰值内存，4G 有 OOM 风险 → `setup.sh` 自动加 **4G swap** 兜底，就稳了。
- **30Mbps**：前端首屏约 4–6MB，单人冷启 ~1–2s，演示无压力。
- **纯 IP + HTTP**：直接 `http://119.45.158.50` 访问，演示不需要域名/备案。

## 路线

国内服务器走 **Node + systemd**（不依赖 Docker Hub，最稳）。Docker 备选见文末。

---

## 步骤

### 0. 前置（腾讯云控制台）
1. **开机**（当前「已关机」）。
2. **安全组放行 80 端口**（TCP 入站 0.0.0.0/0:80）—— 最常见的「机器活着但打不开」就卡在这。

### 1. 上传代码（推荐：服务器上直接 git clone，仓库已公开）
腾讯云「免密连接（TAT）」= 浏览器里的服务器终端。在里面执行：
```bash
sudo mkdir -p /opt/social-forest && sudo chown ubuntu:ubuntu /opt/social-forest
git clone https://github.com/xinzhuwang-wxz/social--gamma.git /opt/social-forest
cd /opt/social-forest
```
> 备选（本地有到服务器的 SSH 时）：本地执行 `SERVER=ubuntu@119.45.158.50 bash deploy/upload.sh`。
> `.env.local`（含 ARK 密钥）永远单独在服务器上创建，不进仓库、不同步。

### 2. 初始化服务器（服务器上执行，一次即可）
```bash
cd /opt/social-forest
sudo bash deploy/setup.sh      # swap + Node 22 + pnpm + npmmirror
```

### 3. 写 .env.local（服务器上，含 ARK 密钥）
```bash
cat > /opt/social-forest/.env.local <<'EOF'
ARK_API_KEY=在这里填你的火山方舟密钥
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_CHAT_MODEL=doubao-seed-2-0-mini-260428
ARK_CHAT_MODEL_STRONG=doubao-seed-2-0-lite-260428
ARK_IMAGE_MODEL=doubao-seedream-5-0-pro-260628
DATABASE_URL=file:./data/social-forest.db
EOF
chmod 600 /opt/social-forest/.env.local
```

### 4. 构建并起服务（服务器上执行；每次更新代码后重跑此步）
```bash
cd /opt/social-forest
bash deploy/run.sh             # 不加 sudo：install→build→建库→装配→systemd(ubuntu运行,CAP绑80)
```

### 5. 验证
- 服务器本机：`curl -I http://127.0.0.1/`（`run.sh` 末尾已自检）
- 外网：浏览器打开 `http://119.45.158.50/`
- 走一遍：种下 → AI 追问 → 匹配捏候选人 → 选人破冰 → 对话（确认 ARK 真调通）

---

## 常用运维
```bash
systemctl status social-forest          # 状态
journalctl -u social-forest -n 80 -f    # 实时日志（排查 ARK 报错）
systemctl restart social-forest         # 重启
```

## 常见坑
| 现象 | 原因 |
|---|---|
| 外网打不开、本机 curl 正常 | 安全组没放行 80 |
| build 卡死/被 kill | 没加 swap（`setup.sh` 已处理，确认 `free -h` 有 Swap） |
| 页面出来但匹配转圈报错 | `.env.local` 的 `ARK_API_KEY` 没填对；看 journalctl |
| pnpm install 很慢 | 没走 npmmirror（`setup.sh` 已设） |
| 「使用我的定位」无效 | HTTP 下浏览器禁用 Geolocation，用手填地点兜底即可 |

## 注意
- **单进程**：demo 状态是进程内单例，别上 PM2 cluster / 多副本，否则匹配/聊天状态会分裂。systemd 单实例即可。
- **密钥**：`ARK_API_KEY` 只放服务器 `.env.local`（chmod 600），永不提交、不外传。
- **DB**：SPA 演示是内存态，不需要数据库；`DATABASE_URL` 仅早期多人后端路由用到，可忽略。

---

## 备选：Docker（仓库已有生产级 Dockerfile）
```bash
docker build -t social-forest .
docker run -d --restart=always -p 80:3000 \
  -e ARK_API_KEY=你的密钥 \
  -v social-forest-data:/app/data \
  social-forest
```
> 国内需先给 Docker 配镜像加速（拉 node:22-alpine 基础镜像）；否则 build 会很慢。因此默认推荐上面的 Node + systemd 路线。
