# 天眼查企业查询平台

一个基于天眼查 MCP 数据接口的**共享**企业信息查询平台。团队成员用账号登录后，即可查询 160+ 项企业数据维度。

> 仓库地址：https://github.com/herman-yan/tianyancha

## 功能覆盖

| 维度 | 包含信息 |
|------|----------|
| 基本工商 | 企业名称、信用代码、法人、注册资本、经营范围、联系方式等 |
| 股东结构 | 股东名称、持股比例、认缴出资、出资日期 |
| 司法风险 | 诉讼案件、被执行信息、失信记录、行政处罚 |
| 董监高 | 主要人员、高管职位、任职日期 |
| 知识产权 | 专利、商标、软件著作权数量及详情 |
| 经营数据 | 招投标、税务信用、分支机构、对外投资 |

## 登录账户（服务端校验）

平台采用**服务端登录校验**：账号密码在服务器验证，登录后拿到 token 才允许查询，未登录者无法调用任何数据接口。

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 访客 | guest | guest123 |

> ⚠️ 部署到生产环境前，请在 `server/.env` 中修改 `ADMIN_PASSWORD` / `GUEST_PASSWORD`！

## 一、本地运行（开发/试用）

```bash
# 1. 配置 API Key
cd server
cp .env.example .env
# 编辑 .env，填入 TIANYANCHA_API_KEY=你的密钥（在 https://ai.tianyancha.com 注册获取）

# 2. 安装依赖并启动
npm install
npm start
```

浏览器访问 http://localhost:3000

## 二、云服务器部署（推荐，7×24 小时运行）

### 方式 A：一键脚本（最简单）

在一台全新的 Linux 云服务器（阿里云/腾讯云 ECS 等）上执行：

```bash
# 安装 git（若未安装）： sudo apt-get install -y git
curl -fsSL https://raw.githubusercontent.com/herman-yan/tianyancha/main/deploy.sh -o deploy.sh
sudo bash deploy.sh 你的天眼查API_KEY
```

脚本会自动：安装 Docker → 拉取代码 → 生成配置 → 构建并后台启动容器（开机自启、崩溃自动重启）。
部署完成后访问 `http://服务器公网IP:3000`。

### 方式 B：手动 Docker 部署

```bash
git clone https://github.com/herman-yan/tianyancha.git
cd tianyancha
cp server/.env.example server/.env   # 编辑填入 API Key 与密码
docker compose up -d --build
```

- 查看日志：`docker compose logs -f`
- 停止服务：`docker compose down`
- 重启（改了 .env 后）：`docker compose restart`

### 方式 C：systemd 常驻（不使用 Docker）

参考 `tyc-query.service` 文件：

```bash
cd /opt/tyc-query/server && npm install --omit=dev
# 创建 /opt/tyc-query/server/.env（见 .env.example）
sudo cp tyc-query.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now tyc-query
```

## 三、让外网能访问（云服务器必做）

无论用哪种方式，都需要在云服务器控制台**开放 3000 端口的入站规则**（安全组 / 防火墙）。
如需用域名访问，可在前面加一层 Nginx 反代并配置 HTTPS。

## 项目结构

```
tyc-enterprise-query/
├── public/              # 前端静态文件
│   ├── index.html       # 登录页面
│   ├── dashboard.html   # 查询仪表板
│   ├── css/style.css    # 样式文件
│   └── js/
│       ├── auth.js      # 登录与 token 管理
│       ├── api.js       # API 通信（自动携带 token）
│       └── ui.js        # UI 渲染
├── server/              # 后端服务
│   ├── index.js         # Express 服务器（含登录校验）
│   ├── tyc-client.js    # 天眼查 MCP 客户端
│   ├── package.json
│   ├── .env.example     # 环境变量示例
│   └── .gitignore
├── Dockerfile
├── docker-compose.yml
├── deploy.sh            # 一键部署脚本
├── tyc-query.service    # systemd 服务文件
├── .gitignore
└── README.md
```

## 技术架构

- **前端**：原生 HTML + CSS + JavaScript，无需构建工具
- **后端**：Node.js + Express，登录发放 token、接口需 token 校验
- **数据源**：天眼查 MCP streamableHttp 协议
- **部署**：Docker / systemd，支持开机自启与崩溃自重启

## 安全注意事项

1. **API Key 保护**：天眼查 API Key 仅存于服务器 `.env`，绝不下发到前端
2. **接口鉴权**：所有数据接口必须携带有效 token，未登录无法查询，避免 API 配额被滥用
3. **密码修改**：生产环境请修改默认密码
4. **HTTPS**：生产环境建议前置 Nginx + HTTPS
5. **访问控制**：建议配合安全组限制来源 IP，或仅内网/VPN 开放

## 数据来源

所有企业数据来自天眼查，实时同步自工商系统。

- API Key 申请：https://ai.tianyancha.com
- API 文档：https://ai.tianyancha.com/guide

## 许可

本项目仅供内部团队使用，请勿对外公开天眼查 API Key。
