#!/usr/bin/env bash
#
# 天眼查企业查询平台 - 一键部署脚本（适用于全新 Linux 云服务器）
#
# 用法：
#   sudo bash deploy.sh [天眼查API_KEY]
#
# 说明：
#   - 自动安装 Docker 与 Docker Compose（已安装则跳过）
#   - 从 GitHub 拉取代码到 /opt/tyc-query
#   - 生成 server/.env 配置文件
#   - 构建并后台启动容器（开机自启、崩溃自动重启）
#
# 部署完成后，浏览器访问 http://服务器公网IP:3000 即可。
# 默认账户：admin / admin123 、guest / guest123
#
set -e

API_KEY="${1:-}"
REPO_URL="https://github.com/herman-yan/tianyancha.git"
INSTALL_DIR="/opt/tyc-query"
PORT=3000

echo "===== 天眼查企业查询平台 部署脚本 ====="

# 1. 安装 Docker
if ! command -v docker >/dev/null 2>&1; then
    echo "[1/5] 未检测到 Docker，开始安装..."
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update -y
        apt-get install -y docker.io docker-compose-plugin curl git
    elif command -v yum >/dev/null 2>&1; then
        yum install -y docker curl git
        systemctl enable --now docker
    else
        echo "不支持的包管理器，请手动安装 Docker 后重试。"
        exit 1
    fi
    systemctl enable --now docker 2>/dev/null || true
else
    echo "[1/5] Docker 已安装，跳过。"
fi

# 2. 克隆代码
echo "[2/5] 拉取代码到 ${INSTALL_DIR} ..."
if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
fi
git clone "$REPO_URL" "$INSTALL_DIR"

# 3. 生成配置
echo "[3/5] 生成 server/.env 配置..."
cat > "$INSTALL_DIR/server/.env" <<EOF
# 天眼查 API Key（在 ai.tianyancha.com 注册获取）
TIANYANCHA_API_KEY=${API_KEY}

# 服务端口
PORT=${PORT}

# 登录账户密码（可按需修改）
ADMIN_PASSWORD=admin123
GUEST_PASSWORD=guest123

# 会话有效期（小时）
SESSION_TIMEOUT_HOURS=24
EOF
echo "       配置已写入 $INSTALL_DIR/server/.env"

# 4. 构建并启动
echo "[4/5] 构建并启动容器..."
cd "$INSTALL_DIR"
docker compose up -d --build

# 5. 完成
echo "[5/5] 部署完成！"
echo "----------------------------------------"
echo " 访问地址： http://<服务器公网IP>:${PORT}"
echo " 默认账户： admin / admin123"
echo "           guest / guest123"
echo "----------------------------------------"
echo " 提示："
echo "  - 若查询提示 'API Key 未配置'，请编辑 $INSTALL_DIR/server/.env 填入密钥后执行："
echo "      cd $INSTALL_DIR && docker compose restart"
echo "  - 查看日志： docker compose logs -f"
echo "  - 停止服务： docker compose down"
