# 天眼查企业查询平台 - 生产镜像
FROM node:20-alpine

WORKDIR /app

# 先拷贝依赖清单并安装（利用 Docker 层缓存）
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm install --omit=dev

# 拷贝源码与静态资源
COPY server/ ./server/
COPY public/ ./public/

EXPOSE 3000

# 绑定 0.0.0.0 以便容器外访问；端口/密钥等通过环境变量注入
CMD ["node", "server/index.js"]
