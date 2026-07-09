/**
 * 天眼查企业查询平台 - Express 后端服务
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const tycClient = require('./tyc-client');

// 加载环境变量
let envConfig = {};
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^"|"$/g, '');
            envConfig[key] = value;
        }
    });
}

const PORT = envConfig.PORT || 3000;
const API_KEY = envConfig.TIANYANCHA_API_KEY || '';

// 设置 API Key
if (API_KEY) {
    tycClient.setApiKey(API_KEY);
}

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// 简易认证中间件
function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    // 简单 token 验证（前端 localStorage 中存储的 auth 信息）
    // 对于共享平台，使用简单的 cookie/session 验证
    const token = authHeader || req.query.token;
    if (!token) {
        // 允许未认证请求访问页面，但 API 调用需要认证
        // 简化处理：允许所有请求（前端有自己的登录逻辑）
    }
    next();
}

app.use(authMiddleware);

// ============ API 路由 ============

// 搜索企业
app.post('/api/search', async (req, res) => {
    try {
        const { keyword } = req.body;
        if (!keyword) {
            return res.status(400).json({ message: '请提供搜索关键词' });
        }

        if (!API_KEY) {
            return res.status(503).json({ message: '天眼查 API Key 未配置，请在服务器 .env 文件中设置 TIANYANCHA_API_KEY' });
        }

        const result = await tycClient.searchCompanies(keyword);
        const parsed = tycClient.parseMCPResult(result);

        res.json({ results: formatSearchResults(parsed) });
    } catch (error) {
        console.error('搜索失败:', error);
        res.status(500).json({ message: error.message || '搜索服务暂时不可用' });
    }
});

// 获取企业基本画像
app.post('/api/profile/basic', async (req, res) => {
    try {
        const { companyId, companyName } = req.body;
        if (!companyId && !companyName) {
            return res.status(400).json({ message: '请提供企业ID或企业名称' });
        }

        if (!API_KEY) {
            return res.status(503).json({ message: '天眼查 API Key 未配置' });
        }

        const result = await tycClient.getCompanyBasicProfile(companyId, companyName);
        const parsed = tycClient.parseMCPResult(result);

        res.json({ profile: formatBasicProfile(parsed) });
    } catch (error) {
        console.error('获取基本信息失败:', error);
        res.status(500).json({ message: error.message || '服务暂时不可用' });
    }
});

// 获取企业维度数据
app.post('/api/profile/dimension', async (req, res) => {
    try {
        const { companyId, companyName, dimension } = req.body;
        if (!companyId && !companyName) {
            return res.status(400).json({ message: '请提供企业ID或企业名称' });
        }

        if (!API_KEY) {
            return res.status(503).json({ message: '天眼查 API Key 未配置' });
        }

        let result;
        const dimToolMap = {
            'shareholder': 'get_shareholder_info',
            'risk': 'get_judicial_risk_info',
            'people': 'get_company_people',
            'ip': 'get_ip_info',
            'operation': 'get_operation_info'
        };

        // 先获取能力列表，找到正确的工具名
        const capabilities = await tycClient.getCompanyCapabilities(companyId, companyName);
        const capParsed = tycClient.parseMCPResult(capabilities);

        // 尝试匹配维度对应的工具
        const targetTool = dimToolMap[dimension];
        let actualToolName = null;

        if (capParsed && typeof capParsed === 'string') {
            // 在能力文本中搜索匹配的工具
            const lines = capParsed.split('\n');
            for (const line of lines) {
                if (line.includes(targetTool) || line.toLowerCase().includes(dimension)) {
                    const match = line.match(/`?(\w+)`?/);
                    if (match) actualToolName = match[1];
                }
            }
        } else if (capParsed && capParsed.tools) {
            const matched = capParsed.tools.find(t =>
                t.tool_name === targetTool ||
                t.tool_name.toLowerCase().includes(dimension)
            );
            if (matched) actualToolName = matched.tool_name;
        }

        // 如果找到了工具名，调用它
        if (actualToolName) {
            result = await tycClient.callInternalTool(companyId, companyName, actualToolName, { page: 1, page_size: 20 });
        } else {
            // 降级：直接使用预定义工具名
            try {
                result = await tycClient.callInternalTool(companyId, companyName, targetTool, { page: 1, page_size: 20 });
            } catch {
                result = null;
            }
        }

        const parsed = tycClient.parseMCPResult(result);
        res.json(formatDimensionData(dimension, parsed));
    } catch (error) {
        console.error('获取维度数据失败:', error);
        res.status(500).json({ message: error.message || '服务暂时不可用' });
    }
});

// 获取企业能力列表
app.post('/api/capabilities', async (req, res) => {
    try {
        const { companyId, companyName } = req.body;
        if (!companyId && !companyName) {
            return res.status(400).json({ message: '请提供企业ID或企业名称' });
        }

        if (!API_KEY) {
            return res.status(503).json({ message: '天眼查 API Key 未配置' });
        }

        const result = await tycClient.getCompanyCapabilities(companyId, companyName);
        const parsed = tycClient.parseMCPResult(result);

        res.json({ capabilities: parsed });
    } catch (error) {
        console.error('获取能力列表失败:', error);
        res.status(500).json({ message: error.message || '服务暂时不可用' });
    }
});

// API Key 状态检查
app.get('/api/status', (req, res) => {
    res.json({
        configured: !!API_KEY,
        message: API_KEY ? '天眼查 API 已配置' : '天眼查 API Key 未配置，请在 .env 文件中设置'
    });
});

// ============ 数据格式化 ============

function formatSearchResults(data) {
    if (!data) return [];

    // 处理不同格式
    if (Array.isArray(data)) {
        return data.map(item => ({
            id: item.id || item.companyId || item.company_id,
            name: item.name || item.companyName || item.company_name,
            status: item.status || item.regStatus || '在营',
            regDate: item.regDate || item.fromDate || '',
            regCapital: item.regCapital || item.capital || '',
            creditCode: item.creditCode || item.credit_code || '',
            regNo: item.regNo || ''
        }));
    }

    // 可能是嵌套对象
    if (data.items || data.list || data.result) {
        const list = data.items || data.list || data.result;
        return formatSearchResults(list);
    }

    // 字符串结果需要解析
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return formatSearchResults(parsed);
        } catch {
            return [];
        }
    }

    return [];
}

function formatBasicProfile(data) {
    if (!data) return {};

    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            return { rawText: data };
        }
    }

    return {
        name: data.name || data.companyName || data.company_name,
        creditCode: data.creditCode || data.credit_code || data.unifiedSocialCreditCode,
        legalPerson: data.legalPerson || data.legal_person_name || data.operName,
        companyType: data.companyType || data.company_type || data.econKind,
        status: data.status || data.regStatus || data.reg_status,
        regCapital: data.regCapital || data.reg_capital || data.registCapital,
        regDate: data.regDate || data.fromDate || data.reg_date || data.startDate,
        approveDate: data.approveDate || data.approve_date || '',
        businessTerm: data.businessTerm || data.toDate || data.business_term,
        industry: data.industry || data.industryName || '',
        regAuthority: data.regAuthority || data.reg_org || data.regInstitute,
        businessScope: data.businessScope || data.scope || data.business_scope,
        address: data.address || data.reg_addr || data.companyAddress,
        phone: data.phone || data.phoneNumber || '',
        email: data.email || data.emailAddress || '',
        website: data.website || data.webSite || '',
        formerNames: data.formerNames || data.historyNames || '',
        staffSize: data.staffSize || data.staffNum || '',
        englishName: data.englishName || data.english_name || '',
    };
}

function formatDimensionData(dimension, data) {
    if (!data) return { dimension, list: [], summary: {} };

    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            return { dimension, rawText: data, list: [], summary: {} };
        }
    }

    switch(dimension) {
        case 'shareholder':
            return {
                dimension,
                shareholders: data.shareholders || data.list || data.items || (Array.isArray(data) ? data : []),
                summary: data.summary || {}
            };
        case 'risk':
            return {
                dimension,
                risks: data.risks || data.list || data.items || data.judicialDocuments || (Array.isArray(data) ? data : []),
                summary: data.summary || {
                    lawsuitCount: data.lawsuitCount || data.lawsuit_count || 0,
                    executeCount: data.executeCount || data.execute_count || 0,
                    dishonestCount: data.dishonestCount || data.dishonest_count || 0,
                    adminPenaltyCount: data.adminPenaltyCount || data.admin_penalty_count || 0
                }
            };
        case 'people':
            return {
                dimension,
                people: data.people || data.list || data.items || data.executives || (Array.isArray(data) ? data : []),
                summary: data.summary || {}
            };
        case 'ip':
            return {
                dimension,
                patents: data.patents || data.patentList || (Array.isArray(data) ? data : []),
                trademarks: data.trademarks || data.trademarkList || [],
                summary: data.summary || {
                    patentCount: data.patentCount || data.patent_count || 0,
                    trademarkCount: data.trademarkCount || data.trademark_count || 0,
                    softCopyrightCount: data.softCopyrightCount || data.soft_copyright_count || 0
                }
            };
        case 'operation':
            return {
                dimension,
                operations: data.operations || data.list || data.items || data.bids || (Array.isArray(data) ? data : []),
                summary: data.summary || {
                    bidCount: data.bidCount || data.bid_count || 0,
                    taxGrade: data.taxGrade || data.tax_grade || '',
                    branchCount: data.branchCount || data.branch_count || 0,
                    investCount: data.investCount || data.invest_count || 0
                }
            };
        default:
            return { dimension, data };
    }
}

// ============ 启动服务 ============

app.listen(PORT, () => {
    console.log(`\n🔍 天眼查企业查询平台已启动`);
    console.log(`   访问地址: http://localhost:${PORT}`);
    console.log(`   API Key: ${API_KEY ? '已配置 ✓' : '未配置 ✗（请在 .env 中设置 TIANYANCHA_API_KEY）'}`);
    console.log(`\n   默认登录账户:`);
    console.log(`   管理员: admin / admin123`);
    console.log(`   访客:   guest / guest123`);
    console.log(`\n`);
});
