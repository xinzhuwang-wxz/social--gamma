# 社交森林 · 单容器部署（Next.js standalone + SQLite 文件库）
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 构建时不需要真实密钥
ENV ARK_API_KEY=build-placeholder
RUN pnpm build
# 预初始化数据库模板（schema + 候选池 persona）
ENV DATABASE_URL=file:/app/seed-template.db
RUN pnpm db:push && pnpm db:seed

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/app/data/social-forest.db
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/seed-template.db ./seed-template.db
VOLUME /app/data
EXPOSE 3000
# 首次启动用模板建库，之后数据持久化在卷中
CMD ["sh", "-c", "mkdir -p /app/data && [ -f /app/data/social-forest.db ] || cp /app/seed-template.db /app/data/social-forest.db; node server.js"]
