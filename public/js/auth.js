/**
 * 天眼查企业查询平台 - 认证模块
 */

const AUTH_KEY = 'tyc_query_auth';
const USERS_KEY = 'tyc_query_users';

// 默认管理员账户（首次启动时创建）
const DEFAULT_USERS = [
    { username: 'admin', password: 'admin123', role: 'admin', displayName: '管理员' },
    { username: 'guest', password: 'guest123', role: 'guest', displayName: '访客' }
];

// 初始化用户数据
function initUsers() {
    if (!localStorage.getItem(USERS_KEY)) {
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    }
}

// 获取用户列表
function getUsers() {
    initUsers();
    return JSON.parse(localStorage.getItem(USERS_KEY));
}

// 登录验证
function login(username, password) {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        const authData = {
            username: user.username,
            role: user.role,
            displayName: user.displayName,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
        return { success: true, user: authData };
    }
    return { success: false, error: '用户名或密码错误' };
}

// 检查是否已登录
function isLoggedIn() {
    const auth = localStorage.getItem(AUTH_KEY);
    if (!auth) return false;
    try {
        const data = JSON.parse(auth);
        // 简单的会话过期检查（24小时）
        const loginTime = new Date(data.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
        if (hoursDiff > 24) {
            logout();
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

// 获取当前用户
function getCurrentUser() {
    if (!isLoggedIn()) return null;
    return JSON.parse(localStorage.getItem(AUTH_KEY));
}

// 退出登录
function logout() {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = 'index.html';
}

// 添加新用户（仅管理员）
function addUser(newUser) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: '仅管理员可添加用户' };
    }
    const users = getUsers();
    if (users.find(u => u.username === newUser.username)) {
        return { success: false, error: '用户名已存在' };
    }
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return { success: true };
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 登录页面处理
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // 如果已登录，直接跳转
        if (isLoggedIn()) {
            window.location.href = 'dashboard.html';
            return;
        }

        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('loginError');
            const btn = document.getElementById('loginBtn');

            btn.disabled = true;
            btn.querySelector('span').textContent = '登录中...';

            const result = login(username, password);
            if (result.success) {
                window.location.href = 'dashboard.html';
            } else {
                errorEl.textContent = result.error;
                errorEl.style.display = 'block';
                btn.disabled = false;
                btn.querySelector('span').textContent = '登录';
            }
        });
    }

    // 仪表板页面处理
    const logoutBtn = document.getElementById('logoutBtn');
    const currentUserEl = document.getElementById('currentUser');

    if (logoutBtn && currentUserEl) {
        // 检查登录状态
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
