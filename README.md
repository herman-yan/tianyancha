# 天眼查企业查询平台

一个基于天眼查 MCP 数据接口的共享企业信息查询平台，团队成员登录后即可查询 160+ 项企业数据维度。

## 功能覆盖

| 维度 | 包含信息 |
|------|----------|
| 基本工商 | 企业名称、信用代码、法人、注册资本、经营范围、联系方式等 |
| 股东结构 | 股东名称、持股比例、认缴出资、出资日期 |
| 司法风险 | 诉讼案件、被执行信息、失信记录、行政处罚 |
| 董监高 | 主要人员、高管职位、任职日期 |
| 知识产权 | 专利、商标、软件著作权数量及详情 |
| 经营数据 | 招投标、税务信用、分支机构、对外投资 |

## 快速部署

### 1. 克隆项目

```bash
git clone https://github.com/YOUR_USERNAME/tyc-enterprise-query.git
cd tyc-enterprise-query
```

### 2. 配置天眼查 API Key

在 [天眼查 AI 智能体数据平台](https://ai.tianyancha.com) 免费注册，获取 API Key。

```bash
cd server
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key
# TIANYANCHA_API_KEY=你的API密钥
```

### 3. 安装依赖并启动

```bash
cd server
npm install
npm start
```

服务启动后访问 http://localhost:3000

### 默认登录账户

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 访客 | guest | guest123 |

> ⚠️ 部署到生产环境前，请务必修改默认密码！

## 项目结构

```
tyc-enterprise-query/
├── public/              # 前端静态文件
│   ├── index.html       # 登录页面
│   ├── dashboard.html   # 查询仪表板
│   ├── css/style.css    # 样式文件
│   ├── js/
│   │   ├── auth.js      # 认证逻辑
│   │   ├── api.js       # API 通信
│   │   ├── ui.js        # UI 渲染
├── server/              # 后端服务
│   ├── index.js         # Express 服务器
│   ├── tyc-client.js    # 天眼查 MCP 客户端
│   ├── package.json     # 依赖配置
│   ├── .env.example     # 环境变量示例
│   └── .gitignore
├── .gitignore
├── README.md
```

## 技术架构

- **前端**：原生 HTML + CSS + JavaScript，无需构建工具
- **后端**：Node.js + Express
- **数据源**：天眼查 MCP streamableHttp 协议
- **认证**：前端 localStorage 简易认证 + 后端 API Key 保护

## Docker 部署（可选）

```dockerfile
# Dockerfile 示例
FROM node:18-alpine
WORKDIR /app
COPY server/package.json server/
RUN cd server && npm install
COPY . .
EXPOSE 3000
CMD ["node", "server/index.js"]
```

## 安全注意事项

1. **API Key 保护**：天眼查 API Key 存储在服务器端 `.env` 文件中，不会暴露给前端用户
2. **密码修改**：生产环境请修改默认登录密码
3. **HTTPS**：建议在生产环境使用 HTTPS
4. **访问控制**：建议部署在内网或使用 VPN 限制访问范围

## 数据来源

所有企业数据来自天眼查，实时同步自工商系统。

- 天眼查官网：https://www.tianyancha.com
- API Key 申请：https://ai.tianyancha.com
- API 文档：https://ai.tianyancha.com/guide

## 许可

本项目仅供内部团队使用，请勿对外公开天眼查 API Key。
