/**
 * 天眼查企业查询平台 - API 模块
 * 与后端服务通信，获取天眼查数据
 */

const API_BASE = window.location.origin + '/api';

class TYCApi {
    constructor() {
        this.currentCompany = null;
        this.companyId = null;
    }

    /**
     * 搜索企业
     * @param {string} keyword - 搜索关键词
     * @returns {Promise} 搜索结果
     */
    async searchCompanies(keyword) {
        try {
            const response = await fetch(`${API_BASE}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || '搜索失败');
            }

            return await response.json();
        } catch (error) {
            console.error('搜索企业失败:', error);
            throw error;
        }
    }

    /**
     * 获取企业基本画像
     * @param {string} companyId - 企业ID
     * @param {string} companyName - 企业名称
     */
    async getBasicProfile(companyId, companyName) {
        try {
            const response = await fetch(`${API_BASE}/profile/basic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId, companyName })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || '获取基本信息失败');
            }

            return await response.json();
        } catch (error) {
            console.error('获取基本信息失败:', error);
            throw error;
        }
    }

    /**
     * 获取企业维度数据
     * @param {string} companyId - 企业ID
     * @param {string} companyName - 企业名称
     * @param {string} dimension - 数据维度
     */
    async getDimensionData(companyId, companyName, dimension) {
        try {
            const response = await fetch(`${API_BASE}/profile/dimension`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId, companyName, dimension })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || '获取维度数据失败');
            }

            return await response.json();
        } catch (error) {
            console.error('获取维度数据失败:', error);
            throw error;
        }
    }

    /**
     * 获取企业可用能力列表
     * @param {string} companyId
     * @param {string} companyName
     */
    async getCapabilities(companyId, companyName) {
        try {
            const response = await fetch(`${API_BASE}/capabilities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId, companyName })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || '获取能力列表失败');
            }

            return await response.json();
        } catch (error) {
            console.error('获取能力列表失败:', error);
            throw error;
        }
    }

    // 设置当前企业
    setCurrentCompany(companyId, companyName) {
        this.currentCompany = companyName;
        this.companyId = companyId;
    }

    // 获取当前企业
    getCurrentCompany() {
        return { companyId: this.companyId, companyName: this.currentCompany };
    }
}

// 全局 API 实例
const api = new TYCApi();
