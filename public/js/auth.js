/**
 * 天眼查企业查询平台 - 认证模块
 * 登录走服务端校验，token 保存在浏览器本地，所有数据请求需携带。
 */

const AUTH_KEY = 'tyc_query_auth';
const SESSION_TIMEOUT_HOURS = 24;

// 从服务端换取 token
async function serverLogin(username, password) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || '登录失败');
    }
    return data; // { success, token, user }
}

// 退出（通知服务端销毁 token）
function serverLogout(token) {
    if (!token) return;
    fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
    }).catch(() => {});
}

// 获取保存的 token
function getToken() {
    try {
        const data = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
        if (!data.token) return null;
        // 客户端过期检查
        if (data.loginTime) {
            const hoursDiff = (Date.now() - new Date(data.loginTime).getTime()) / (1000 * 60 * 60);
            if (hoursDiff > SESSION_TIMEOUT_HOURS) {
                logout();
                return null;
            }
        }
        return data.token;
    } catch {
        return null;
    }
}

// 登录（供登录页调用）
async function login(username, password) {
    const data = await serverLogin(username, password);
    const authData = {
        token: data.token,
        username: data.user.username,
        role: data.user.role,
        displayName: data.user.displayName,
        loginTime: new Date().toISOString()
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
    return { success: true, user: authData };
}

// 是否已登录
function isLoggedIn() {
    return !!getToken();
}

// 当前登录用户
function getCurrentUser() {
    if (!isLoggedIn()) return null;
    try {
        return JSON.parse(localStorage.getItem(AUTH_KEY));
    } catch {
        return null;
    }
}

// 退出登录
function logout() {
    const token = getToken();
    serverLogout(token);
    localStorage.removeItem(AUTH_KEY);
    window.location.href = 'index.html';
}

// ============ 页面初始化 ============

document.addEventListener('DOMContentLoaded', function() {
    // 登录页
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        if (isLoggedIn()) {
            window.location.href = 'dashboard.html';
            return;
        }

        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('loginError');
            const btn = document.getElementById('loginBtn');

            btn.disabled = true;
            btn.querySelector('span').textContent = '登录中...';

            try {
                await login(username, password);
                window.location.href = 'dashboard.html';
            } catch (err) {
                errorEl.textContent = err.message || '用户名或密码错误';
                errorEl.style.display = 'block';
                btn.disabled = false;
                btn.querySelector('span').textContent = '登录';
            }
        });
    }

    // 仪表板
    const logoutBtn = document.getElementById('logoutBtn');
    const currentUserEl = document.getElementById('currentUser');

    if (logoutBtn && currentUserEl) {
        if (!isLoggedIn()) {
            window.location.href = 'index.html';
            return;
        }
        const user = getCurrentUser();
        currentUserEl.textContent = user.displayName || user.username;

        logoutBtn.addEventListener('click', function() {
            logout();
        });
    }
});
