/**
 * 天眼查企业查询平台 - API 模块
 * 与后端服务通信，所有请求自动携带登录 token。
 */

const API_BASE = window.location.origin + '/api';

class TYCApi {
    constructor() {
        this.currentCompany = null;
        this.companyId = null;
    }

    // 统一请求方法：自动附带 token，401 时跳转登录
    async request(path, body) {
        const token = typeof getToken === 'function' ? getToken() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const response = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (response.status === 401) {
            // 会话失效，清理并跳回登录页
            if (typeof logout === 'function') logout();
            throw new Error('登录已过期，请重新登录');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || '请求失败');
        }
        return response.json();
    }

    async searchCompanies(keyword) {
        return this.request('/search', { keyword });
    }

    async getBasicProfile(companyId, companyName) {
        return this.request('/profile/basic', { companyId, companyName });
    }

    async getDimensionData(companyId, companyName, dimension) {
        return this.request('/profile/dimension', { companyId, companyName, dimension });
    }

    async getCapabilities(companyId, companyName) {
        return this.request('/capabilities', { companyId, companyName });
    }

    setCurrentCompany(companyId, companyName) {
        this.currentCompany = companyName;
        this.companyId = companyId;
    }

    getCurrentCompany() {
        return { companyId: this.companyId, companyName: this.currentCompany };
    }
}

// 全局 API 实例
const api = new TYCApi();
