/**
 * 天眼查 MCP 客户端
 * 通过 streamableHttp 协议与天眼查 MCP 服务通信
 */

const TIANYANCHA_MCP_URL = 'https://mcp.tianyancha.com/v1';
let apiKey = '';
let sessionId = null;
let initialized = false;

/**
 * 设置 API Key
 */
function setApiKey(key) {
    apiKey = key;
    initialized = false;
    sessionId = null;
}

/**
 * 发送 MCP 请求
 */
async function sendMCPRequest(method, params = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': apiKey
    };

    if (sessionId) {
        headers['Mcp-Session-Id'] = sessionId;
    }

    const body = {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: Date.now()
    };

    const response = await fetch(TIANYANCHA_MCP_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    // 保存 session id
    const newSessionId = response.headers.get('mcp-session-id');
    if (newSessionId) {
        sessionId = newSessionId;
    }

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`MCP request failed: ${response.status} - ${text}`);
    }

    // 处理可能的多行响应（streamableHttp）
    const text = await response.text();
    const lines = text.split('\n').filter(l => l.trim());

    for (const line of lines) {
        try {
            const result = JSON.parse(line);
            if (result.error) {
                throw new Error(`MCP error: ${result.error.message || JSON.stringify(result.error)}`);
            }
            if (result.result) {
                return result.result;
            }
        } catch (e) {
            // 非JSON行，跳过
        }
    }

    throw new Error('No valid response from MCP server');
}

/**
 * 初始化 MCP 连接
 */
async function initialize() {
    if (initialized) return;

    try {
        const result = await sendMCPRequest('initialize', {
            protocolVersion: '2025-03-26',
            capabilities: {
                roots: { listChanged: true }
            },
            clientInfo: {
                name: 'tyc-enterprise-query-web',
                version: '1.0.0'
            }
        });

        // 发送 initialized 通知
        await fetch(TIANYANCHA_MCP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey,
                'Mcp-Session-Id': sessionId || ''
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'notifications/initialized'
            })
        });

        initialized = true;
        return result;
    } catch (error) {
        console.error('MCP initialization failed:', error);
        throw error;
    }
}

/**
 * 调用天眼查工具
 */
async function callTool(toolName, args = {}) {
    await initialize();

    const result = await sendMCPRequest('tools/call', {
        name: toolName,
        arguments: args
    });

    return result;
}

/**
 * 搜索企业
 */
async function searchCompanies(keyword) {
    return await callTool('search_companies', { keyword });
}

/**
 * 获取企业基本画像
 */
async function getCompanyBasicProfile(companyId, companyName) {
    return await callTool('get_company_basic_profile', {
        company_id: companyId,
        company_name: companyName
    });
}

/**
 * 获取企业集团信息
 */
async function getGroupInfo(companyId, companyName) {
    return await callTool('get_group_info', {
        company_id: companyId,
        company_name: companyName
    });
}

/**
 * 获取企业人员信息
 */
async function getCompanyPeople(companyId, companyName) {
    return await callTool('get_company_people', {
        company_id: companyId,
        company_name: companyName
    });
}

/**
 * 获取企业可用能力列表
 */
async function getCompanyCapabilities(companyId, companyName) {
    return await callTool('get_company_capabilities', {
        company_id: companyId,
        company_name: companyName
    });
}

/**
 * 调用内部业务工具
 */
async function callInternalTool(companyId, companyName, toolName, args = {}) {
    return await callTool('call_tool', {
        company_id: companyId,
        company_name: companyName,
        tool_name: toolName,
        arguments: args
    });
}

/**
 * 批量调用内部业务工具（最多3个）
 */
async function callInternalToolsBatch(companyId, companyName, tools) {
    return await callTool('call_tools_batch', {
        company_id: companyId,
        company_name: companyName,
        tools: tools // [{tool_name, arguments}]
    });
}

/**
 * 解析 MCP 返回的结果内容
 */
function parseMCPResult(result) {
    if (!result) return null;

    // MCP 返回格式通常是 { content: [{type: "text", text: "..."}] }
    if (result.content && Array.isArray(result.content)) {
        const textContent = result.content.find(c => c.type === 'text');
        if (textContent) {
            try {
                return JSON.parse(textContent.text);
            } catch {
                return textContent.text;
            }
        }
    }

    // 直接返回
    return result;
}

module.exports = {
    setApiKey,
    initialize,
    searchCompanies,
    getCompanyBasicProfile,
    getGroupInfo,
    getCompanyPeople,
    getCompanyCapabilities,
    callInternalTool,
    callInternalToolsBatch,
    callTool,
    parseMCPResult
};
