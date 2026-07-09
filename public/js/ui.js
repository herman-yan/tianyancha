/**
 * 天眼查企业查询平台 - UI 模块
 * 处理界面交互和数据渲染
 */

document.addEventListener('DOMContentLoaded', function() {
    // 只在仪表板页面运行
    if (!document.getElementById('searchInput')) return;

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchResults = document.getElementById('searchResults');
    const resultsList = document.getElementById('resultsList');
    const resultCount = document.getElementById('resultCount');
    const companyDetail = document.getElementById('companyDetail');
    const detailContent = document.getElementById('detailContent');
    const emptyState = document.getElementById('emptyState');
    const backBtn = document.getElementById('backToResults');
    const suggestionsEl = document.getElementById('searchSuggestions');

    let currentDimension = 'basic';
    let searchDebounceTimer = null;

    // =========== 搜索功能 ===========

    searchBtn.addEventListener('click', function() {
        const keyword = searchInput.value.trim();
        if (keyword) performSearch(keyword);
    });

    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const keyword = searchInput.value.trim();
            if (keyword) performSearch(keyword);
        }
    });

    // 快捷标签
    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const query = this.dataset.query;
            searchInput.value = query;
            performSearch(query);
        });
    });

    // 输入时搜索建议（延迟请求）
    searchInput.addEventListener('input', function() {
        const val = this.value.trim();
        clearTimeout(searchDebounceTimer);

        if (val.length < 2) {
            suggestionsEl.style.display = 'none';
            return;
        }

        searchDebounceTimer = setTimeout(() => {
            fetchSuggestions(val);
        }, 500);
    });

    // 点击其他区域关闭建议
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-box')) {
            suggestionsEl.style.display = 'none';
        }
    });

    async function fetchSuggestions(keyword) {
        try {
            const data = await api.searchCompanies(keyword);
            if (data.results && data.results.length > 0) {
                renderSuggestions(data.results.slice(0, 5));
            } else {
                suggestionsEl.style.display = 'none';
            }
        } catch {
            suggestionsEl.style.display = 'none';
        }
    }

    function renderSuggestions(results) {
        suggestionsEl.innerHTML = results.map(r => `
            <div class="suggestion-item" data-id="${r.id || r.companyId}" data-name="${r.name || r.companyName}">
                <div class="suggestion-name">${r.name || r.companyName}</div>
                <div class="suggestion-meta">${r.regNo || r.creditCode || ''}</div>
            </div>
        `).join('');
        suggestionsEl.style.display = 'block';

        suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', function() {
                const id = this.dataset.id;
                const name = this.dataset.name;
                searchInput.value = name;
                suggestionsEl.style.display = 'none';
                showCompanyDetail(id, name);
            });
        });
    }

    async function performSearch(keyword) {
        searchBtn.disabled = true;
        searchBtn.textContent = '查询中...';
        emptyState.style.display = 'none';
        companyDetail.style.display = 'none';

        try {
            const data = await api.searchCompanies(keyword);
            if (data.results && data.results.length > 0) {
                renderSearchResults(data.results);
                searchResults.style.display = 'block';
            } else {
                showToast('未找到相关企业，请尝试其他关键词', 'info');
                searchResults.style.display = 'none';
                emptyState.style.display = 'flex';
            }
        } catch (error) {
            showToast('查询失败：' + error.message, 'error');
            emptyState.style.display = 'flex';
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = '查询';
        }
    }

    function renderSearchResults(results) {
        resultCount.textContent = `共找到 ${results.length} 家相关企业`;
        resultsList.innerHTML = results.map(r => {
            const statusText = r.status || '在营';
            const statusClass = statusText.includes('注销') || statusText.includes('吊销') ? 'cancelled' :
                               statusText.includes('迁出') ? 'revoked' : 'active';
            return `
                <div class="result-card" data-id="${r.id || r.companyId}" data-name="${r.name || r.companyName}">
                    <div class="result-card-icon">🏢</div>
                    <div class="result-card-info">
                        <div class="result-card-name">${r.name || r.companyName}</div>
                        <div class="result-card-meta">
                            <span class="status-badge ${statusClass}">${statusText}</span>
                            ${r.regDate ? `<span>成立于 ${r.regDate}</span>` : ''}
                            ${r.regCapital ? `<span>${r.regCapital}</span>` : ''}
                            ${r.creditCode ? `<span>${r.creditCode}</span>` : ''}
                        </div>
                    </div>
                    <div class="result-card-action">查看详情 →</div>
                </div>
            `;
        }).join('');

        resultsList.querySelectorAll('.result-card').forEach(card => {
            card.addEventListener('click', function() {
                const id = this.dataset.id;
                const name = this.dataset.name;
                showCompanyDetail(id, name);
            });
        });
    }

    // =========== 企业详情 ===========

    backBtn.addEventListener('click', function() {
        companyDetail.style.display = 'none';
        if (resultsList.children.length > 0) {
            searchResults.style.display = 'block';
        } else {
            emptyState.style.display = 'flex';
        }
    });

    // 维度标签切换
    document.querySelectorAll('.dim-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.dim-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentDimension = this.dataset.dim;

            const { companyId, companyName } = api.getCurrentCompany();
            if (companyId && companyName) {
                loadDimensionData(companyId, companyName, currentDimension);
            }
        });
    });

    async function showCompanyDetail(companyId, companyName) {
        api.setCurrentCompany(companyId, companyName);
        searchResults.style.display = 'none';
        emptyState.style.display = 'none';
        companyDetail.style.display = 'block';

        // 设置头部信息
        document.getElementById('detailCompanyName').textContent = companyName;

        // 重置到基本工商标签
        currentDimension = 'basic';
        document.querySelectorAll('.dim-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.dim-tab[data-dim="basic"]').classList.add('active');

        // 加载基本画像
        await loadDimensionData(companyId, companyName, 'basic');
    }

    async function loadDimensionData(companyId, companyName, dimension) {
        detailContent.innerHTML = `
            <div class="loading-placeholder">
                <div class="spinner"></div>
                <p>正在加载${getDimensionName(dimension)}信息...</p>
            </div>
        `;

        try {
            let data;
            if (dimension === 'basic') {
                data = await api.getBasicProfile(companyId, companyName);
            } else {
                data = await api.getDimensionData(companyId, companyName, dimension);
            }

            // 同时更新头部信息
            if (dimension === 'basic' && data.profile) {
                updateDetailHeader(data.profile);
            }

            renderDimensionData(dimension, data);
        } catch (error) {
            detailContent.innerHTML = `
                <div style="text-align:center; padding:2rem; color:var(--text-secondary);">
                    <p>⚠️ 加载失败：${error.message}</p>
                    <p style="font-size:0.8125rem; margin-top:0.5rem;">请稍后重试或切换其他维度查看</p>
                </div>
            `;
        }
    }

    function updateDetailHeader(profile) {
        const statusText = profile.status || '在营';
        const statusClass = statusText.includes('注销') || statusText.includes('吊销') ? 'cancelled' :
                           statusText.includes('迁出') ? 'revoked' : 'active';
        document.getElementById('detailStatus').textContent = statusText;
        document.getElementById('detailStatus').className = `status-badge ${statusClass}`;
        document.getElementById('detailRegDate').textContent = profile.regDate ? `成立于 ${profile.regDate}` : '';
        document.getElementById('detailRegCapital').textContent = profile.regCapital || '';
    }

    function renderDimensionData(dimension, data) {
        switch(dimension) {
            case 'basic':
                renderBasicProfile(data);
                break;
            case 'shareholder':
                renderShareholders(data);
                break;
            case 'risk':
                renderRiskData(data);
                break;
            case 'people':
                renderPeople(data);
                break;
            case 'ip':
                renderIPData(data);
                break;
            case 'operation':
                renderOperationData(data);
                break;
            default:
                detailContent.innerHTML = `<p>暂不支持该维度</p>`;
        }
    }

    function renderBasicProfile(data) {
        const profile = data.profile || data;
        const fields = [
            ['企业名称', profile.name || profile.companyName || '-'],
            ['统一社会信用代码', profile.creditCode || '-'],
            ['法定代表人', profile.legalPerson || '-'],
            ['企业类型', profile.companyType || '-'],
            ['经营状态', profile.status || '-'],
            ['注册资本', profile.regCapital || '-'],
            ['成立日期', profile.regDate || '-'],
            ['核准日期', profile.approveDate || '-'],
            ['营业期限', profile.businessTerm || '-'],
            ['所属行业', profile.industry || '-'],
            ['登记机关', profile.regAuthority || '-'],
            ['经营范围', profile.businessScope || '-'],
            ['注册地址', profile.address || '-'],
            ['联系电话', profile.phone || '-'],
            ['邮箱', profile.email || '-'],
            ['官网', profile.website || '-'],
            ['曾用名', profile.formerNames || '-'],
            ['人员规模', profile.staffSize || '-'],
            ['英文名称', profile.englishName || '-'],
        ];

        detailContent.innerHTML = `
            <table class="info-table">
                ${fields.map(([label, value]) => `
                    <tr>
                        <td>${label}</td>
                        <td>${value}</td>
                    </tr>
                `).join('')}
            </table>
        `;
    }

    function renderShareholders(data) {
        const shareholders = data.shareholders || data.list || [];
        if (!shareholders.length) {
            detailContent.innerHTML = `<p style="text-align:center;color:var(--text-secondary);">暂无股东信息记录</p>`;
            return;
        }

        detailContent.innerHTML = `
            <table class="info-table">
                <thead>
                    <tr>
                        <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">股东名称</th>
                        <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">持股比例</th>
                        <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">认缴出资</th>
                        <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">出资日期</th>
                    </tr>
                </thead>
                <tbody>
                    ${shareholders.map(s => `
                        <tr>
                            <td style="padding:0.75rem;font-size:0.875rem;">${s.name || s.shareholderName || '-'}</td>
                            <td style="padding:0.75rem;font-size:0.875rem;">${s.ratio || s.shareRatio || '-'}</td>
                            <td style="padding:0.75rem;font-size:0.875rem;">${s.capital || s.subscribedCapital || '-'}</td>
                            <td style="padding:0.75rem;font-size:0.875rem;">${s.date || s.dateOfCapital || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function renderRiskData(data) {
        const risks = data.risks || data.list || [];
        const summary = data.summary || {};

        if (!risks.length && !summary.total) {
            detailContent.innerHTML = `<p style="text-align:center;color:var(--text-secondary);">暂无司法风险记录</p>`;
            return;
        }

        // 概要卡片
        const summaryCards = [];
        if (summary.lawsuitCount) summaryCards.push({ title: '诉讼案件', value: summary.lawsuitCount, icon: '⚖️' });
        if (summary.executeCount) summaryCards.push({ title: '被执行', value: summary.executeCount, icon: '📋', risk: 'high' });
        if (summary.dishonestCount) summaryCards.push({ title: '失信信息', value: summary.dishonestCount, icon: '⚠️', risk: 'high' });
        if (summary.adminPenaltyCount) summaryCards.push({ title: '行政处罚', value: summary.adminPenaltyCount, icon: '📌', risk: 'medium' });

        const cardsHtml = summaryCards.length ? `
            <div class="data-cards" style="margin-bottom:1.5rem;">
                ${summaryCards.map(c => `
                    <div class="data-card">
                        <div class="data-card-title">${c.icon} ${c.title}
                            ${c.risk ? `<span class="risk-indicator risk-${c.risk}">风险</span>` : ''}
                        </div>
                        <div class="data-card-value">${c.value}</div>
                    </div>
                `).join('')}
            </div>
        ` : '';

        // 详情列表
        const listHtml = risks.length ? `
            <table class="info-table">
                <thead>
                    <tr>
                        <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">案件名称</th>
                        <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">案由</th>
                        <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">日期</th>
                        <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">角色</th>
                    </tr>
                </thead>
                <tbody>
                    ${risks.slice(0, 20).map(r => `
                        <tr>
                            <td style="padding:0.75rem;font-size:0.875rem;">${r.title || r.caseName || '-'}</td>
                            <td style="padding:0.75rem;font-size:0.875rem;">${r.reason || r.caseType || '-'}</td>
                            <td style="padding:0.75rem;font-size:0.875rem;">${r.date || r.caseDate || '-'}</td>
                            <td style="padding:0.75rem;font-size:0.875rem;">${r.role || r.caseRole || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '';

        detailContent.innerHTML = cardsHtml + listHtml;
    }

    function renderPeople(data) {
        const people = data.people || data.list || data.executives || [];
        if (!people.length) {
            detailContent.innerHTML = `<p style="text-align:center;color:var(--text-secondary);">暂无董监高信息记录</p>`;
            return;
        }

        detailContent.innerHTML = `
            <table class="info-table">
                <thead>
                    <tr>
                        <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">姓名</th>
                        <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">职位</th>
                        <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">任职日期</th>
                    </tr>
                </thead>
                <tbody>
                    ${people.map(p => `
                        <tr>
                            <td style="padding:0.75rem;font-size:0.875rem;">${p.name || p.personName || '-'}</td>
                            <td style="padding:0.75rem;font-size:0.875rem;">${p.position || p.title || '-'}</td>
                            <td style="padding:0.75rem;font-size:0.875rem;">${p.appointDate || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function renderIPData(data) {
        const patents = data.patents || [];
        const trademarks = data.trademarks || [];
        const summary = data.summary || {};

        let html = '';

        // 概要卡片
        const summaryCards = [];
        if (summary.patentCount) summaryCards.push({ title: '专利数量', value: summary.patentCount, icon: '💡' });
        if (summary.trademarkCount) summaryCards.push({ title: '商标数量', value: summary.trademarkCount, icon: '™️' });
        if (summary.softCopyrightCount) summaryCards.push({ title: '软件著作权', value: summary.softCopyrightCount, icon: '💻' });

        if (summaryCards.length) {
            html += `<div class="data-cards" style="margin-bottom:1.5rem;">
                ${summaryCards.map(c => `
                    <div class="data-card">
                        <div class="data-card-title">${c.icon} ${c.title}</div>
                        <div class="data-card-value">${c.value}</div>
                    </div>
                `).join('')}
            </div>`;
        }

        // 专利列表
        if (patents.length) {
            html += `<h4 style="font-size:1rem;font-weight:600;margin-bottom:0.75rem;">专利信息</h4>
            <table class="info-table">
                <thead><tr>
                    <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">专利名称</th>
                    <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">类型</th>
                    <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">状态</th>
                    <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">申请日期</th>
                </tr></thead>
                <tbody>
                    ${patents.slice(0, 15).map(p => `<tr>
                        <td style="padding:0.75rem;font-size:0.875rem;">${p.title || p.patentName || '-'}</td>
                        <td style="padding:0.75rem;font-size:0.875rem;">${p.type || p.patentType || '-'}</td>
                        <td style="padding:0.75rem;font-size:0.875rem;">${p.status || p.patentStatus || '-'}</td>
                        <td style="padding:0.75rem;font-size:0.875rem;">${p.date || p.applyDate || '-'}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
        }

        // 商标列表
        if (trademarks.length) {
            html += `<h4 style="font-size:1rem;font-weight:600;margin:1rem 0 0.75rem;">商标信息</h4>
            <table class="info-table">
                <thead><tr>
                    <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">商标名称</th>
                    <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">类别</th>
                    <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">状态</th>
                </tr></thead>
                <tbody>
                    ${trademarks.slice(0, 15).map(t => `<tr>
                        <td style="padding:0.75rem;font-size:0.875rem;">${t.name || t.trademarkName || '-'}</td>
                        <td style="padding:0.75rem;font-size:0.875rem;">${t.category || t.intCls || '-'}</td>
                        <td style="padding:0.75rem;font-size:0.875rem;">${t.status || t.trademarkStatus || '-'}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
        }

        if (!html) {
            html = `<p style="text-align:center;color:var(--text-secondary);">暂无知识产权信息记录</p>`;
        }

        detailContent.innerHTML = html;
    }

    function renderOperationData(data) {
        const operations = data.operations || data.list || [];
        const summary = data.summary || {};

        let html = '';

        // 概要卡片
        const summaryCards = [];
        if (summary.bidCount) summaryCards.push({ title: '招投标', value: summary.bidCount, icon: '📝' });
        if (summary.taxGrade) summaryCards.push({ title: '税务信用', value: summary.taxGrade, icon: '📊' });
        if (summary.branchCount) summaryCards.push({ title: '分支机构', value: summary.branchCount, icon: '🏢' });
        if (summary.investCount) summaryCards.push({ title: '对外投资', value: summary.investCount, icon: '💰' });

        if (summaryCards.length) {
            html += `<div class="data-cards" style="margin-bottom:1.5rem;">
                ${summaryCards.map(c => `
                    <div class="data-card">
                        <div class="data-card-title">${c.icon} ${c.title}</div>
                        <div class="data-card-value">${c.value}</div>
                    </div>
                `).join('')}
            </div>`;
        }

        if (operations.length) {
            html += `<table class="info-table">
                <thead><tr>
                    <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">项目名称</th>
                    <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">类型</th>
                    <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">日期</th>
                    <th style="padding:0.75rem;font-weight:600;font-size:0.875rem;">金额</th>
                </tr></thead>
                <tbody>
                    ${operations.slice(0, 15).map(o => `<tr>
                        <td style="padding:0.75rem;font-size:0.875rem;">${o.title || o.projectName || '-'}</td>
                        <td style="padding:0.75rem;font-size:0.875rem;">${o.type || '-'}</td>
                        <td style="padding:0.75rem;font-size:0.875rem;">${o.date || '-'}</td>
                        <td style="padding:0.75rem;font-size:0.875rem;">${o.amount || '-'}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
        }

        if (!html) {
            html = `<p style="text-align:center;color:var(--text-secondary);">暂无经营数据记录</p>`;
        }

        detailContent.innerHTML = html;
    }

    // =========== 辅助函数 ===========

    function getDimensionName(dim) {
        const names = {
            basic: '基本工商',
            shareholder: '股东结构',
            risk: '司法风险',
            people: '董监高',
            ip: '知识产权',
            operation: '经营数据'
        };
        return names[dim] || dim;
    }

    function showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
