// GFS Care Admin Dashboard - Core Application Logic

// Global state variables
const state = {
    currentTab: 'dashboard',
    googleSheetsUrl: 'https://script.google.com/macros/s/AKfycbyhrQWxU2tQenMMoV1OaWZUKbDdPhrDIDl_T5XMHMFBIbFtIrVBZiwmFVfUP98-fpmKlw/exec',
    allCustomers: [],
    customers: [],
    charts: {
        scoresBar: null,
        moodsPie: null,
        salesBar: null,
        techBar: null,
        mvpsBar: null
    },
    filterInitialized: false
};

// Realistic mock data fallback for immediate offline evaluation
const MOCK_CUSTOMERS = [
    {
        id: "GF-8821",
        name: "สมชาย ยินดี",
        phone: "0812345678",
        siteType: "บ้าน",
        installDate: "2026-07-05",
        filmModel: "3M Ceramic Ultra Clear",
        status: "Completed", // Unsent, Sent, Completed, Action Required
        feedback: {
            timestamp: "2026-07-08T10:14:00Z",
            benefits: ["ห้องเย็นขึ้น", "แสงจ้าลดลง", "ใช้งานพื้นที่สบายขึ้น"],
            ratings: { admin: 5, sales: 5, tech: 5 },
            details: {
                admin: ["ตอบกลับไว", "พูดคุยสุภาพ"],
                sales: ["แนะนำรุ่นฟิล์มเหมาะสม", "ไม่กดดันการขาย"],
                tech: ["เข้างานตรงเวลา", "ติดตั้งเรียบร้อย", "เก็บงานสะอาด"]
            },
            comments: {
                admin: "",
                sales: "",
                tech: ""
            },
            mvp: "tech",
            mvpComment: "ทีมช่างทำงานประณีตมากครับ ไม่มีฟองอากาศหรือฝุ่นเลย ประทับใจมาก",
            overallMood: "😍",
            supportNeeds: [],
            supportDetails: ""
        }
    },
    {
        id: "GF-8822",
        name: "พงศธร รักษ์สุข",
        phone: "0865554321",
        siteType: "คอนโด",
        installDate: "2026-07-03",
        filmModel: "กระจกห้องนั่งเล่น คอนโดบีบี",
        status: "Action Required",
        feedback: {
            timestamp: "2026-07-09T09:05:00Z",
            benefits: ["ห้องเย็นขึ้น", "ความเป็นส่วนตัวดีขึ้น"],
            ratings: { admin: 3, sales: 3, tech: 2 },
            details: {
                admin: ["ติดต่อยาก"],
                sales: ["อธิบายไม่ชัดเจน"],
                tech: ["กระจกมีรอย/ฝุ่น"]
            },
            comments: {
                admin: "แอดมินตอบช้าค่ะ",
                sales: "สับสนเรื่องตารางสเปกนิดหน่อย",
                tech: "มีจุดฝุ่นและฟองอากาศตรงขอบล่างหลายบาน"
            },
            mvp: "none",
            mvpComment: "",
            overallMood: "😐",
            supportNeeds: ["อยากให้ตรวจเช็กงานบางจุด"],
            supportDetails: "มีจุดฝุ่นและฟองอากาศตรงขอบล่างหลายบาน อยากให้ช่างเข้ามาช่วยเช็คงานอีกรอบครับ"
        }
    },
    {
        id: "GF-8823",
        name: "วิภาดา งามพร้อม",
        phone: "0891112233",
        siteType: "สำนักงาน",
        installDate: "2026-07-07",
        filmModel: "Goodfilm Carbon Black 60",
        status: "Sent",
        feedback: null
    },
    {
        id: "GF-8824",
        name: "บริษัท สุวรรณการช่าง",
        phone: "023456789",
        siteType: "อาคาร",
        installDate: "2026-07-08",
        filmModel: "ฟิล์มกรองแสงอาคารภายนอก 3M",
        status: "Unsent",
        feedback: null
    },
    {
        id: "GF-8825",
        name: "อนันต์ พานิช",
        phone: "0879998877",
        siteType: "ร้านค้า",
        installDate: "2026-07-06",
        filmModel: "Ceramic Nano Cool 80",
        status: "Completed",
        feedback: {
            timestamp: "2026-07-07T14:20:00Z",
            benefits: ["ห้องเย็นขึ้น", "แสงจ้าลดลง", "กระจกดูสวยขึ้น"],
            ratings: { admin: 5, sales: 4, tech: 5 },
            details: {
                admin: ["ตอบกลับไว"],
                sales: ["แนะนำรุ่นฟิล์มเหมาะสม"],
                tech: ["เข้างานตรงเวลา", "ติดตั้งเรียบร้อย"]
            },
            comments: { admin: "", sales: "", tech: "" },
            mvp: "sales",
            mvpComment: "ฝ่ายขายให้คำปรึกษาตรงงบประมาณดีมาก ไม่บังคับขาย",
            overallMood: "😊",
            supportNeeds: [],
            supportDetails: ""
        }
    }
];

// Document Ready
document.addEventListener('DOMContentLoaded', () => {
    // Attach Sidebar switch events
    setupSidebarTabEvents();
    
    // Initial data load
    loadData();
});

// Sidebar navigation handler
function setupSidebarTabEvents() {
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    state.currentTab = tabId;
    
    // Highlight sidebar item
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Toggle content pane
    document.querySelectorAll('.tab-pane').forEach(pane => {
        if (pane.getAttribute('id') === `tab-${tabId}`) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });

    // Update Header navbar Title
    const titles = {
        dashboard: "Dashboard ภาพรวม",
        database: "ฐานข้อมูลรายชื่อลูกค้า",
        kanban: "ท่อติดตามสถานะแบบประเมิน (Kanban)",
        reports: "รายงานคะแนนประเมินทีมบริการ",
        settings: "ตั้งค่าการเชื่อมต่อ Google Sheets API",
        presentation: "โหมดนำเสนอข้อมูลฟีดแบคจากลูกค้า (Customer Feedback)"
    };
    document.getElementById('page-title').innerText = titles[tabId] || "Dashboard";
    
    // Close sidebar on mobile after switching
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }

    // Refresh charts if dashboard or reports are activated
    if (tabId === 'dashboard') {
        setTimeout(renderDashboardCharts, 100);
    } else if (tabId === 'reports') {
        setTimeout(renderReportCharts, 100);
    } else if (tabId === 'presentation') {
        if(typeof initPresentation === 'function') setTimeout(initPresentation, 100);
    }

    // Re-initialize Lucide Icons for dynamic content
    lucide.createIcons();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('open');
    } else {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    }
}

// LOAD DATABASE
function loadData() {
    const cachedUrl = localStorage.getItem('google_sheets_apps_script_url');
    if (cachedUrl === 'https://script.google.com/macros/s/AKfycbzC9Os3IHKXZQ-epBWilu-k3gaAL8eqZamHN1IH-4svZ5TGxNwo8GeuXPykvV8h4SpNLQ/exec' ||
        cachedUrl === 'https://script.google.com/macros/s/AKfycbxnEtoNpkucS_9L2NPide8tRPF66xK4PKWz0hkzLvbJ8tXyfEsl_nVBiDOOX1bu-qj5qg/exec') {
        localStorage.removeItem('google_sheets_apps_script_url');
        state.googleSheetsUrl = 'https://script.google.com/macros/s/AKfycbyhrQWxU2tQenMMoV1OaWZUKbDdPhrDIDl_T5XMHMFBIbFtIrVBZiwmFVfUP98-fpmKlw/exec';
    }

    if (!state.googleSheetsUrl || state.googleSheetsUrl.trim() === '') {
        console.warn("No Sheets Web App URL provided.");
        updateApiBadge('error', 'กรุณาระบุ Web App URL');
        return;
    }

    // --- 1. Optimistic UI (Stale-While-Revalidate) ---
    // Check if we have cached data in LocalStorage to render immediately
    const cachedData = localStorage.getItem('admin_dashboard_cache');
    if (cachedData) {
        try {
            updateDataAndRender(JSON.parse(cachedData));
            updateApiBadge('loading', 'กำลังอัปเดตข้อมูลล่าสุด...');
        } catch(e) {
            console.error("Cache parsing error", e);
            updateApiBadge('loading', 'กำลังดึงข้อมูล...');
        }
    } else {
        updateApiBadge('loading', 'กำลังดึงข้อมูล...');
    }

    // --- 2. Fetch fresh data in the background ---
    fetch(`${state.googleSheetsUrl}?action=getAllCustomersDetailed`)
        .then(res => {
            if (!res.ok) throw new Error("HTTP error " + res.status);
            return res.json();
        })
        .then(data => {
            if (data.status === 'success' && data.data) {
                // Parse returned joined rows
                const freshCustomers = data.data.map(item => {
                    let status = item.status || 'Unsent';
                    
                    // Auto-flag poor feedback as "Action Required"
                    if (status === 'Completed' && item.feedback) {
                        const isUnhappy = ['😐', '🥺', '😡', '🤬', '😭', '🚨'].includes(item.feedback.overallMood);
                        const avgRating = ((item.feedback.ratings?.admin || 0) + (item.feedback.ratings?.sales || 0) + (item.feedback.ratings?.tech || 0)) / 3;
                        const hasLowRating = avgRating <= 3.5; // Trigger if average is 3.5 or below (basically anything with a low score)
                        
                        if (isUnhappy || hasLowRating) {
                            status = 'Action Required';
                        }
                    }

                    const localStatus = localStorage.getItem('local_status_' + item.id);
                    if (localStatus) {
                        if ((item.status === 'Completed' || item.feedback) && (localStatus === 'Unsent' || localStatus === 'Sent')) {
                            // Backend confirms it's completed, so ignore and clear the outdated local 'Sent' state
                            localStorage.removeItem('local_status_' + item.id);
                        } else if (item.status === 'Sent' && localStatus === 'Sent') {
                            localStorage.removeItem('local_status_' + item.id); // server caught up
                        } else {
                            status = localStatus;
                        }
                    }

                    return {
                        id: item.id,
                        company: item.company || '-',
                        name: item.name,
                        phone: item.phone,
                        lineAt: item.lineAt || '-',
                        siteType: item._col_16 || item.siteType || item.company || '-',
                        installDate: formatInstallDate(item.installDate),
                        filmModel: item.filmModel || '-',
                        sales: item.sales || '-',
                        tech: item.tech || '-',
                        adminName: item._col_17 || item.adminName || '-',
                        bill: item.bill || '-',
                        status: status,
                        feedback: item.feedback || null
                    };
                });
                
                // Compare and update if data changed or cache was empty
                const freshJson = JSON.stringify(freshCustomers);
                if (freshJson !== cachedData) {
                    localStorage.setItem('admin_dashboard_cache', freshJson);
                    updateDataAndRender(freshCustomers);
                }
                updateApiBadge('connected', 'เชื่อมต่อฐานข้อมูลแล้ว ✓');
            } else {
                throw new Error(data.message || "Unknown error");
            }
        })
        .catch(err => {
            console.error("API error:", err);
            updateApiBadge('error', 'ข้อผิดพลาดการดึงข้อมูล Google Sheet');
            // Only show toast if we didn't have cached data to show
            if (!cachedData) {
                showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message, 'error');
            }
        });
}

function updateApiBadge(type, text) {
    const badge = document.getElementById('api-status');
    const badgeText = document.getElementById('api-status-text');
    
    badge.className = 'api-status-badge';
    badgeText.innerText = text;

    if (type === 'connected') {
        badge.classList.add('connected');
    } else if (type === 'loading') {
        // loading status uses base style
    } else if (type === 'error') {
        badge.style.backgroundColor = 'var(--danger-light)';
        badge.style.color = 'var(--danger)';
    } else if (type === 'mock') {
        badge.style.backgroundColor = 'var(--info-light)';
        badge.style.color = 'var(--info)';
    }
}

// FORCE REFRESH DATA (For the Update Button)
function forceRefreshData() {
    if (!state.googleSheetsUrl || state.googleSheetsUrl.trim() === '') {
        showToast('กรุณาระบุ Web App URL', 'error');
        return;
    }

    const btn = document.getElementById('btn-refresh-data');
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.add('spin-icon');
            icon.style.animation = 'spin 1s linear infinite';
        }
        btn.disabled = true;
    }
    
    // Bypass cache for visual feedback
    updateApiBadge('loading', 'กำลังดึงข้อมูลล่าสุด...');
    
    fetch(`${state.googleSheetsUrl}?action=getAllCustomersDetailed`)
        .then(res => {
            if (!res.ok) throw new Error("HTTP error " + res.status);
            return res.json();
        })
        .then(data => {
            if (data.status === 'success' && data.data) {
                const freshCustomers = data.data.map(item => {
                    let status = item.status || 'Unsent';
                    
                    // Auto-flag poor feedback as "Action Required"
                    if (status === 'Completed' && item.feedback) {
                        const isUnhappy = ['😐', '🥺', '😡', '🤬', '😭', '🚨'].includes(item.feedback.overallMood);
                        const avgRating = ((item.feedback.ratings?.admin || 0) + (item.feedback.ratings?.sales || 0) + (item.feedback.ratings?.tech || 0)) / 3;
                        const hasLowRating = avgRating <= 3.5; // Trigger if average is 3.5 or below
                        
                        if (isUnhappy || hasLowRating) {
                            status = 'Action Required';
                        }
                    }

                    // Always allow local manual override via drag & drop, EXCEPT if it contradicts a completed survey
                    const localStatus = localStorage.getItem('local_status_' + item.id);
                    if (localStatus) {
                        if ((item.status === 'Completed' || item.feedback) && (localStatus === 'Unsent' || localStatus === 'Sent')) {
                            localStorage.removeItem('local_status_' + item.id);
                        } else {
                            status = localStatus;
                        }
                    }

                    return {
                        id: item.id,
                        company: item.company || '-',
                        name: item.name,
                        phone: item.phone,
                        lineAt: item.lineAt || '-',
                        siteType: item._col_16 || item.siteType || item.company || '-',
                        installDate: formatInstallDate(item.installDate),
                        filmModel: item.filmModel || '-',
                        sales: item.sales || '-',
                        tech: item.tech || '-',
                        adminName: item._col_17 || item.adminName || '-',
                        bill: item.bill || '-',
                        status: status,
                        feedback: item.feedback || null
                    };
                });
                
                localStorage.setItem('admin_dashboard_cache', JSON.stringify(freshCustomers));
                updateDataAndRender(freshCustomers);
                updateApiBadge('connected', 'เชื่อมต่อฐานข้อมูลแล้ว ✓');
                showToast('อัปเดตข้อมูลเรียบร้อยแล้ว', 'success');
            } else {
                throw new Error(data.message || "Unknown error");
            }
        })
        .catch(err => {
            console.error("API error:", err);
            updateApiBadge('error', 'ข้อผิดพลาดการดึงข้อมูล');
            showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message, 'error');
        })
        .finally(() => {
            if (btn) {
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.remove('spin-icon');
                    icon.style.animation = '';
                }
                btn.disabled = false;
            }
        });
}

// DATA PROCESSING AND RENDERING
function updateDataAndRender(customersData) {
    state.allCustomers = customersData;
    if (!state.filterInitialized && state.allCustomers.length > 0) {
        populateFilters(true);
        state.filterInitialized = true;
    } else {
        populateFilters(false);
    }
    applyGlobalFilter();
}

function applyGlobalFilter() {
    const monthVal = document.getElementById('global-filter-month')?.value || 'all';
    const companyVal = document.getElementById('global-filter-company')?.value || 'all';
    const startVal = document.getElementById('global-filter-start')?.value;
    const endVal = document.getElementById('global-filter-end')?.value;

    state.customers = state.allCustomers.filter(c => {
        let m = '', y = '';
        if (c.installDate && c.installDate !== '-') {
            const dateStr = formatInstallDate(c.installDate);
            if (dateStr.indexOf('-') > -1) {
                const p = dateStr.split('-');
                m = parseInt(p[1], 10);
                y = p[0].length === 2 ? "20" + p[0] : p[0];
            } else if (dateStr.indexOf('/') > -1) {
                const p = dateStr.split('/');
                m = parseInt(p[1], 10);
                y = p[2].length === 2 ? "20" + p[2] : p[2];
            }
        }
        const rowMonthYear = (m && y) ? `${m}-${y}` : '';

        // Month filter check
        let matchesMonth = true;
        if (monthVal !== 'all') {
            matchesMonth = (rowMonthYear === monthVal);
        }

        // Date Range check
        let matchesDateRange = true;
        if (c.installDate && c.installDate !== '-') {
            const dateStr = formatInstallDate(c.installDate);
            let rowDateObj = null;
            if (dateStr.indexOf('-') > -1) {
                const p = dateStr.split('-');
                rowDateObj = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
            } else if (dateStr.indexOf('/') > -1) {
                const p = dateStr.split('/');
                rowDateObj = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
            }

            if (rowDateObj) {
                if (startVal) {
                    const sDate = new Date(startVal);
                    sDate.setHours(0,0,0,0);
                    if (rowDateObj < sDate) matchesDateRange = false;
                }
                if (endVal) {
                    const eDate = new Date(endVal);
                    eDate.setHours(23,59,59,999);
                    if (rowDateObj > eDate) matchesDateRange = false;
                }
            }
        }

        // Company filter check
        let matchesCompany = true;
        if (companyVal !== 'all') {
            matchesCompany = (c.company === companyVal);
        }

        return matchesMonth && matchesDateRange && matchesCompany;
    });

    processDataAndRender();
}

function processDataAndRender() {
    renderKPIs();
    renderCustomerTable();
    renderKanbanBoard();
    filterCustomerTable();
    
    if (state.currentTab === 'dashboard') {
        renderDashboardCharts();
    } else if (state.currentTab === 'reports') {
        renderReportCharts();
    } else if (state.currentTab === 'presentation') {
        if(typeof initPresentation === 'function') initPresentation();
    }
}

// KPI Box Render
function renderKPIs() {
    const total = state.customers.length;
    const completed = state.customers.filter(c => c.status === 'Completed' || (c.status === 'Action Required' && c.feedback)).length;
    const pending = state.customers.filter(c => c.status === 'Sent').length;
    
    const responseRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const pendingRate = total > 0 ? Math.round((pending / total) * 100) : 0;

    document.getElementById('kpi-total-cust').innerText = total;
    document.getElementById('kpi-done-survey').innerText = completed;
    document.getElementById('kpi-done-rate').innerText = `${responseRate}% Response Rate`;
    document.getElementById('kpi-pending-survey').innerText = pending;
    document.getElementById('kpi-pending-rate').innerText = `${pendingRate}% ส่งคำขอประเมินแล้ว`;

    // Calc Average Score
    let scoreSum = 0;
    let scoreCount = 0;
    state.customers.forEach(c => {
        if (c.feedback && c.feedback.ratings) {
            const r = c.feedback.ratings;
            const avg = ((r.admin || 0) + (r.sales || 0) + (r.tech || 0)) / 3;
            scoreSum += avg;
            scoreCount++;
        }
    });

    const totalAvg = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(1) : '0.0';
    document.getElementById('kpi-avg-rating').innerText = totalAvg;
    document.getElementById('kpi-avg-desc').innerText = `จากคำตอบของลูกค้า ${scoreCount} คน`;
}

function renderCustomerTable() {
    const tbody = document.getElementById('customer-table-body');
    tbody.innerHTML = '';

    if (state.customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--text-muted);">ไม่มีข้อมูลลูกค้า กรุณากดปุ่มเพิ่มลูกค้าใหม่ด้านขวาบน</td></tr>';
        return;
    }

    // Sort customers by date descending (latest date on top)
    const sortedCustomers = [...state.customers].sort((a, b) => {
        const dateA = parseDateObj(a.installDate);
        const dateB = parseDateObj(b.installDate);
        return dateB - dateA;
    });

    sortedCustomers.forEach((c, index) => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.setAttribute('onclick', `openCustomerDrawer('${c.id}')`);

        let statusText = 'ยังไม่ส่ง';
        let statusClass = 'unsent';
        if (c.status === 'Sent') { statusText = 'ส่งลิงก์แล้ว'; statusClass = 'sent'; }
        else if (c.status === 'Completed') { statusText = 'ประเมินสำเร็จ'; statusClass = 'completed'; }
        else if (c.status === 'Action Required') { statusText = 'ต้องการดูแลด่วน'; statusClass = 'action'; }

        // Dynamic LINE Message
        const surveyLink = `${window.location.href.split('/admin')[0]}/?id=${encodeURIComponent(c.id)}`;
        const companyName = c.company === 'MHL' ? 'MHL' : 'Goodfilm';
        const lineMessage = `สวัสดีครับคุณ${c.name} ${companyName} รบกวนเวลาสั้น ๆ 2 นาที ร่วมทำภารกิจประเมินความพึงพอใจการติดตั้งฟิล์ม ผ่านลิงก์นี้นะครับ: ${surveyLink} ขอบคุณมากครับ 💙`;
        const lineDeepLink = `https://line.me/R/msg/text/?${encodeURIComponent(lineMessage)}`;

        tr.innerHTML = `
            <td style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">${index + 1}</td>
            <td>${c.company || '-'}</td>
            <td class="customer-id">${c.id}</td>
            <td style="font-weight: 700;">${c.name}</td>
            <td>${c.phone}</td>
            <td>${c.lineAt || '-'}</td>
            <td>${c.installDate || '-'}</td>
            <td>${c.sales || '-'}</td>
            <td>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td onclick="event.stopPropagation()">
                <div class="table-actions">
                    <button class="icon-btn" onclick="copySurveyLink('${c.id}', this)" title="คัดลอกลิงก์ประเมิน">
                        <i data-lucide="copy" style="width: 14px; height: 14px;"></i>
                    </button>
                    <a href="${lineDeepLink}" target="_blank" class="icon-btn line" onclick="markAsSent('${c.id}')" title="ส่ง LINE หาลูกค้า">
                        <i data-lucide="message-square" style="width: 14px; height: 14px;"></i>
                    </a>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

// Search and Filter Database Table
function clearAllFilters() {
    if(document.getElementById('global-filter-month')) document.getElementById('global-filter-month').value = 'all';
    if(document.getElementById('global-filter-company')) document.getElementById('global-filter-company').value = 'all';
    if(document.getElementById('global-filter-start')) document.getElementById('global-filter-start').value = '';
    if(document.getElementById('global-filter-end')) document.getElementById('global-filter-end').value = '';
    if(document.getElementById('search-input')) document.getElementById('search-input').value = '';
    if(document.getElementById('filter-status')) document.getElementById('filter-status').value = 'all';
    
    applyGlobalFilter();
}

function filterCustomerTable() {
    const query = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const status = document.getElementById('filter-status')?.value || 'all';

    const rows = document.querySelectorAll('#customer-table-body tr');
    
    rows.forEach(row => {
        if (row.cells.length < 9) return; // Skip headers/empty rows

        const company = row.cells[1].innerText;
        const id = row.cells[2].innerText.toLowerCase();
        const name = row.cells[3].innerText.toLowerCase();
        const phone = row.cells[4].innerText.toLowerCase();
        const lineAt = row.cells[5].innerText.toLowerCase();
        const sales = row.cells[7].innerText.toLowerCase();
        const rowStatusTag = row.cells[8].querySelector('.status-badge');
        
        let rowStatus = 'Unsent';
        if (rowStatusTag.classList.contains('sent')) rowStatus = 'Sent';
        else if (rowStatusTag.classList.contains('completed')) rowStatus = 'Completed';
        else if (rowStatusTag.classList.contains('action')) rowStatus = 'Action Required';

        const matchesQuery = id.includes(query) || name.includes(query) || phone.includes(query) || lineAt.includes(query) || sales.includes(query) || company.toLowerCase().includes(query);
        const matchesStatus = status === 'all' || rowStatus === status;

        if (matchesQuery && matchesStatus) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Kanban Board Render
function renderKanbanBoard() {
    const lanes = {
        'Unsent': document.getElementById('cards-unsent'),
        'Sent': document.getElementById('cards-sent'),
        'Completed': document.getElementById('cards-completed'),
        'Action Required': document.getElementById('cards-action')
    };

    // Reset lane containers
    Object.keys(lanes).forEach(k => {
        lanes[k].innerHTML = '';
        const idSuffix = k === 'Action Required' ? 'action' : k.toLowerCase();
        document.getElementById(`count-${idSuffix}`).innerText = '0';
    });

    let counts = { 'Unsent': 0, 'Sent': 0, 'Completed': 0, 'Action Required': 0 };

    state.customers.forEach(c => {
        const laneKey = c.status || 'Unsent';
        if (!lanes[laneKey]) return;

        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.setAttribute('draggable', 'true');
        card.setAttribute('ondragstart', `dragStart(event, '${c.id}')`);
        card.setAttribute('onclick', `openCustomerDrawer('${c.id}')`);

        let moveButtons = `<div style="display: flex; gap: 4px; align-items: center;">`;
        const laneOrder = ['Unsent', 'Sent', 'Completed', 'Action Required'];
        const currentIndex = laneOrder.indexOf(laneKey);
        if (currentIndex > 0) {
            moveButtons += `<button onclick="moveKanbanCard('${c.id}', '${laneOrder[currentIndex - 1]}', event)" style="background:transparent; border:none; padding:4px; cursor:pointer; color:var(--text-muted); display:flex; align-items:center; border-radius:4px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'"><i data-lucide="chevron-left" style="width:16px; height:16px;"></i></button>`;
        }
        if (currentIndex < 3) {
            moveButtons += `<button onclick="moveKanbanCard('${c.id}', '${laneOrder[currentIndex + 1]}', event)" style="background:transparent; border:none; padding:4px; cursor:pointer; color:var(--text-muted); display:flex; align-items:center; border-radius:4px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'"><i data-lucide="chevron-right" style="width:16px; height:16px;"></i></button>`;
        }
        moveButtons += `</div>`;

        let footerHtml = '';
        if (c.feedback) {
            const overall = c.feedback.overallMood || '😐';
            const avg = (((c.feedback.ratings.admin || 0) + (c.feedback.ratings.sales || 0) + (c.feedback.ratings.tech || 0)) / 3).toFixed(1);
            footerHtml = `
                <div class="kanban-card-footer" style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span style="font-size: 1.2rem;">${overall}</span>
                        <span class="kanban-card-rating">
                            <i data-lucide="star" style="width:12px; height:12px; fill:var(--accent); color:var(--accent);"></i>
                            <span>${avg} / 5</span>
                        </span>
                    </div>
                    ${moveButtons}
                </div>
            `;
        } else {
            footerHtml = `
                <div class="kanban-card-footer" style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size: 0.65rem; color: var(--text-muted);">รอดำเนินการ</span>
                    ${moveButtons}
                </div>
            `;
        }

        card.innerHTML = `
            <div class="kanban-card-title">${c.name} <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: normal; margin-left: 4px;">#${c.id}</span></div>
            <div class="kanban-card-meta">📞 ${c.phone} | LINE: ${c.lineAt || '-'}</div>
            <div style="font-size: 0.68rem; color: var(--text-muted); margin-bottom: 2px;">📅 ติดตั้ง: ${c.installDate || '-'}</div>
            <div style="font-size: 0.68rem; color: var(--text-muted); margin-bottom: 4px;">👤 ฝ่ายขาย: ${c.sales || '-'} | 🔧 ช่าง: ${c.tech || '-'}</div>
            ${footerHtml}
        `;

        lanes[laneKey].appendChild(card);
        counts[laneKey]++;
    });

    // Update counts
    Object.keys(counts).forEach(k => {
        const idSuffix = k === 'Action Required' ? 'action' : k.toLowerCase();
        document.getElementById(`count-${idSuffix}`).innerText = counts[k];
    });

    lucide.createIcons();
}

function moveKanbanCard(customerId, targetStatus, e) {
    if (e) e.stopPropagation();
    updateCustomerStatus(customerId, targetStatus);
}

function updateCustomerStatus(customerId, targetStatus) {
    const customer = state.customers.find(c => c.id === customerId);
    if (!customer) return;

    if (customer.status === targetStatus) return;

    customer.status = targetStatus;
    localStorage.setItem('local_status_' + customerId, targetStatus);

    // Refresh display
    renderKanbanBoard();
    renderCustomerTable();
    renderKPIs();

    // Sync status to backend
    if (state.googleSheetsUrl && (targetStatus === 'Sent' || targetStatus === 'Unsent')) {
        fetch(state.googleSheetsUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                action: 'updateStatus',
                id: customerId,
                status: targetStatus
            })
        }).catch(err => console.error("Failed to sync status to Google Sheets:", err));
    }
}

// Drag & Drop Kanban Handlers
function dragStart(e, customerId) {
    e.dataTransfer.setData('text/plain', customerId);
}

function allowDrop(e) {
    e.preventDefault();
}

function handleDrop(e, targetStatus) {
    e.preventDefault();
    const customerId = e.dataTransfer.getData('text/plain');
    updateCustomerStatus(customerId, targetStatus);
}

function markAsSent(id) {
    const customer = state.customers.find(c => c.id === id);
    if (customer && (!customer.status || customer.status === 'Unsent')) {
        updateCustomerStatus(id, 'Sent');
    }
}

// Copy link action helper
function copySurveyLink(id, btn) {
    const baseUrl = `${window.location.href.split('/admin')[0]}/?id=${encodeURIComponent(id)}`;
    const surveyMessage = `มีบางอย่างที่อยากบอก... แต่ขอฟังความเห็นคุณก่อนครับ 🤫\n\nไขความลับเพื่อบริการที่เหนือระดับ พร้อมลุ้นรับ 'ของรางวัลปริศนา' \n\nที่เตรียมไว้ให้คุณ! เข้ามาที่นี่เลยครับ 👇\n${baseUrl}\n\nขอบคุณที่มาร่วมเปิดเผยความประทับใจไปกับเรานะครับ 🙏`;
    const copyPromise = copyTextRobust(surveyMessage);

    copyPromise.then(() => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px; color: var(--success);"></i>';
        lucide.createIcons();

        setTimeout(() => {
            // Auto-move to 'Sent' if currently 'Unsent'
            const customer = state.customers.find(c => c.id === id);
            if (customer && (!customer.status || customer.status === 'Unsent')) {
                updateCustomerStatus(id, 'Sent');
            }
            if (document.body.contains(btn)) {
                btn.innerHTML = originalHtml;
                lucide.createIcons();
            }
        }, 1000);
    }).catch(err => {
        console.error('Could not copy link:', err);
        alert('Copy failed: ' + err.message + '\nnavigator.clipboard: ' + !!navigator.clipboard);
        showToast('เกิดข้อผิดพลาดในการคัดลอกลิงก์', 'error');
    });
}

// DETAIL DRAWER & TIMELINE
function openCustomerDrawer(id) {
    const c = state.customers.find(item => item.id === id);
    if (!c) return;

    // Fill metadata
    document.getElementById('drawer-cust-name').innerText = c.name;
    document.getElementById('drawer-cust-id').innerText = `รหัสสัญญา: ${c.id}`;
    document.getElementById('drawer-cust-phone').innerText = c.phone;
    document.getElementById('drawer-cust-sitetype').innerText = c.siteType;
    document.getElementById('drawer-cust-date').innerText = c.installDate;
    document.getElementById('drawer-cust-film').innerText = c.filmModel || '-';

    // Draw Journey Timeline
    renderJourneyTimeline(c);

    // Render survey details if completed
    const feedbackBox = document.getElementById('drawer-feedback-details');
    if (c.feedback) {
        feedbackBox.style.display = 'block';
        
        // Mood
        document.getElementById('drawer-mood-emoji').innerText = c.feedback.overallMood;
        
        let moodText = 'ประทับใจมาก ฟิล์มทำงานดีเกินคาด';
        if (c.feedback.overallMood === '😊') moodText = 'พอใจ ใช้งานได้ตามที่ต้องการ';
        else if (c.feedback.overallMood === '😐') moodText = 'กลาง ๆ ยังอยากดูผลเพิ่ม';
        else if (c.feedback.overallMood === '😟') moodText = 'มีบางจุดที่อยากให้ดูแล';
        else if (c.feedback.overallMood === '🚨') moodText = 'อยากให้ทีมงานติดต่อกลับด่วน';
        document.getElementById('drawer-mood-desc').innerText = moodText;

        // Benefits selected
        const chipsContainer = document.getElementById('drawer-benefits-chips');
        chipsContainer.innerHTML = '';
        if (c.feedback.benefits && c.feedback.benefits.length > 0) {
            c.feedback.benefits.forEach(b => {
                const span = document.createElement('span');
                span.className = 'status-badge unsent';
                span.style.padding = '4px 10px';
                span.innerText = b;
                chipsContainer.appendChild(span);
            });
        } else {
            chipsContainer.innerHTML = '<span style="font-size:0.75rem; color:var(--text-muted);">ไม่มีรายการระบุ</span>';
        }

        // Scores
        document.getElementById('drawer-score-admin').innerText = `${c.feedback.ratings.admin.toFixed(1)} / 5.0`;
        document.getElementById('drawer-score-sales').innerText = `${c.feedback.ratings.sales.toFixed(1)} / 5.0`;
        document.getElementById('drawer-score-tech').innerText = `${c.feedback.ratings.tech.toFixed(1)} / 5.0`;

        // MVP
        let mvpName = 'ไม่ได้ระบุ';
        if (c.feedback.mvp === 'admin') mvpName = 'ทีมประสานงาน / แอดมิน 💬';
        else if (c.feedback.mvp === 'sales') mvpName = 'ทีมที่ปรึกษาฟิล์ม / ฝ่ายขาย 🧭';
        else if (c.feedback.mvp === 'tech') mvpName = 'ทีมช่างติดตั้ง 🧰';
        else if (c.feedback.mvp === 'all') mvpName = 'ทุกทีมดูแลดีมาก 💙';
        document.getElementById('drawer-vote-mvp').innerText = mvpName;

        // Comment
        const comment = c.feedback.mvpComment || c.feedback.supportDetails || '';
        if (comment) {
            document.getElementById('drawer-comment-block').style.display = 'block';
            document.getElementById('drawer-cust-comment').innerText = `"${comment}"`;
        } else {
            document.getElementById('drawer-comment-block').style.display = 'none';
        }

    } else {
        feedbackBox.style.display = 'none';
    }

    // Dynamic LINE link & copy inside Drawer
    const surveyLink = `${window.location.href.split('/admin')[0]}/?id=${encodeURIComponent(c.id)}`;
    const companyName = c.company === 'MHL' ? 'MHL' : 'Goodfilm';
    const lineMessage = `สวัสดีครับคุณ${c.name} ${companyName} รบกวนเวลาสั้น ๆ 2 นาที ร่วมทำภารกิจประเมินความพึงพอใจการติดตั้งฟิล์ม ผ่านลิงก์นี้นะครับ: ${surveyLink} ขอบคุณมากครับ 💙`;
    
    document.getElementById('drawer-btn-line').onclick = () => {
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(lineMessage)}`, '_blank');
        markAsSent(c.id);
    };
    
    document.getElementById('drawer-btn-copy').onclick = () => {
        try {
            const copyPromise = copyTextRobust(surveyLink);
            copyPromise.then(() => {
                const btn = document.getElementById('drawer-btn-copy');
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<i data-lucide="check" style="width: 16px;"></i><span>คัดลอกแล้ว</span>';
                btn.style.backgroundColor = 'var(--success)';
                btn.style.color = '#fff';
                lucide.createIcons();
                
                showToast('คัดลอกลิงก์แบบสอบถามสำเร็จแล้วค่ะ! 📋', 'success');
                
                setTimeout(() => {
                    markAsSent(c.id);
                    closeCustomerDrawer();
                    btn.innerHTML = originalHtml;
                    btn.style.backgroundColor = '';
                    btn.style.color = '';
                }, 1000);
            }).catch(err => {
                console.error('Could not copy link:', err);
                alert('Promise rejected: ' + err.message);
                showToast('เกิดข้อผิดพลาดในการคัดลอกลิงก์', 'error');
            });
        } catch (fatalErr) {
            alert('Fatal Error in drawer copy: ' + fatalErr.message);
        }
    };

    // Open sliding drawer overlay
    document.getElementById('customer-drawer').style.display = 'flex';
}

function closeCustomerDrawer() {
    document.getElementById('customer-drawer').style.display = 'none';
}

// Generate Customer Journey Timeline nodes
function renderJourneyTimeline(customer) {
    const container = document.getElementById('drawer-timeline-container');
    container.innerHTML = '';

    const installDate = customer.installDate;
    const hasFeedback = customer.feedback !== null;
    const isHappy = hasFeedback && (customer.feedback.overallMood === '😍' || customer.feedback.overallMood === '😊');

    // Step 1: Install Film
    const step1 = document.createElement('div');
    step1.className = 'timeline-step completed';
    step1.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-header">
            <span class="timeline-title">ติดตั้งฟิล์มกรองแสงสำเร็จ</span>
            <span class="timeline-time">${installDate}</span>
        </div>
        <div class="timeline-body">
            ทีมช่างดำเนินติดตั้งเสร็จสิ้นที่หน้างานประเภท ${customer.siteType} รุ่นฟิล์ม ${customer.filmModel} เรียบร้อยแล้วค่ะ
        </div>
    `;
    container.appendChild(step1);

    // Step 2: Survey Link Sent
    const hasSent = customer.status !== 'Unsent';
    const step2 = document.createElement('div');
    step2.className = `timeline-step ${hasSent ? 'completed' : 'current'}`;
    step2.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-header">
            <span class="timeline-title">${hasSent ? 'ส่งแบบประเมินเรียบร้อย' : 'รอดำเนินการส่งแบบประเมิน'}</span>
            <span class="timeline-time">${hasSent ? 'สำเร็จ' : 'รอกดส่ง'}</span>
        </div>
        <div class="timeline-body">
            ${hasSent ? 'ลิงก์ย่อรหัสแบบสอบถามถูกจัดส่งทาง LINE / ข้อความหาลูกค้าแล้วค่ะ' : 'แอดมินสามารถคัดลอกลิงก์ย่อหรือกดส่ง LINE ตรงช่องฐานข้อมูลด้านซ้ายได้เลยค่ะ'}
        </div>
    `;
    container.appendChild(step2);

    // Step 3: Feedback responses
    const step3 = document.createElement('div');
    if (hasFeedback) {
        step3.className = 'timeline-step completed';
        const dateObj = new Date(customer.feedback.timestamp);
        const timeStr = dateObj.toLocaleDateString('th-TH');
        step3.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-header">
                <span class="timeline-title">ลูกค้าตอบแบบประเมินแล้ว (${customer.feedback.overallMood})</span>
                <span class="timeline-time">${timeStr}</span>
            </div>
            <div class="timeline-body">
                ลูกค้าประเมินสำเร็จ โหวต MVP ให้กับ ${customer.feedback.mvp === 'tech' ? 'ทีมช่าง' : customer.feedback.mvp === 'sales' ? 'ฝ่ายขาย' : customer.feedback.mvp === 'admin' ? 'แอดมิน' : 'ทุกแผนก'}
            </div>
        `;
    } else {
        step3.className = `timeline-step ${customer.status === 'Sent' ? 'current' : ''}`;
        step3.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-header">
                <span class="timeline-title">รอลูกค้าส่งความเห็นประเมิน</span>
                <span class="timeline-time">-</span>
            </div>
            <div class="timeline-body">
                อยู่ระหว่างการรอลูกค้าเปิดลิงก์เข้ามาทำภารกิจ ${customer.company === 'MHL' ? 'MHL' : 'Goodfilm'} Care Quest
            </div>
        `;
    }
    container.appendChild(step3);

    // Step 4: Support care follow-up
    if (customer.status === 'Action Required') {
        const issue = customer.feedback.supportNeeds.join(', ');
        step4Class = 'timeline-step danger';
        step4Title = 'ต้องการบริการดูแลเร่งด่วน 🚨';
        step4Body = `พบหัวข้อข้อเรียนร้องเรียน: <strong>${issue}</strong> <br> ข้อความติดต่อกลับ: "${customer.feedback.supportDetails}"`;
    } else if (hasFeedback) {
        step4Class = 'timeline-step completed';
        step4Title = 'การดูแลเสร็จสิ้นสมบูรณ์ ✓';
        step4Body = isHappy ? 'ลูกค้ามีความพึงพอใจการติดตั้งในระดับแง่บวก เรียบร้อยมีความสุขค่ะ' : 'ให้การแนะนำวิธีดูแลรักษาฟิล์มและรับทราบข้อเสนอแนะเรียบร้อย';
    } else {
        step4Class = 'timeline-step';
        step4Title = 'การบริการบำรุงรักษาหลังติดตั้ง';
        step4Body = 'รอสรุปผลตอบกลับจากแบบสอบถามก่อนดำเนินการติดตามผลต่อไปค่ะ';
    }

    const step4 = document.createElement('div');
    step4.className = step4Class;
    step4.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-header">
            <span class="timeline-title">${step4Title}</span>
        </div>
        <div class="timeline-body">
            ${step4Body}
        </div>
    `;
    container.appendChild(step4);
}

// ADD NEW CUSTOMER MODAL
function openAddCustomerModal() {
    document.getElementById('add-customer-form').reset();
    
    // Auto generate ID based on total customers
    const nextNum = state.customers.length + 8821;
    document.getElementById('add-cust-id').value = `GF-${nextNum}`;
    
    // Set default date to today
    document.getElementById('add-cust-date').value = new Date().toISOString().split('T')[0];

    document.getElementById('add-customer-modal').style.display = 'flex';
}

function closeAddCustomerModal() {
    document.getElementById('add-customer-modal').style.display = 'none';
}

function handleAddCustomerSubmit(e) {
    e.preventDefault();
    showToast('⚠️ การเพิ่มข้อมูลลูกค้าโดยตรงถูกปิดใช้งานชั่วคราวตามนโยบาย Read-only กรุณาไปแก้ไขเพิ่มเติมที่แผ่นงานชีต Data โดยตรงค่ะ', 'warning');
    closeAddCustomerModal();
}

// SETTINGS & CONNECTION TEST
function saveSettingUrl() {
    const url = document.getElementById('setting-sheets-url').value.trim();
    state.googleSheetsUrl = url;
    localStorage.setItem('google_sheets_apps_script_url', url);
}

function testConnection() {
    saveSettingUrl();
    loadData();
}

// CHARTS REPRESENTATIONS (Chart.js)
function renderDashboardCharts() {
    const ctxBar = document.getElementById('chart-scores-bar');
    const ctxPie = document.getElementById('chart-moods-pie');
    
    if (!ctxBar || !ctxPie) return;

    // Calculate averages per team
    let sumAdmin = 0, sumSales = 0, sumTech = 0;
    let countAdmin = 0, countSales = 0, countTech = 0;
    let moods = { '😍': 0, '😊': 0, '😐': 0, '😟': 0, '🚨': 0 };

    state.customers.forEach(c => {
        if (c.feedback) {
            const rA = Number(c.feedback.ratings?.admin) || 0;
            if (rA > 0) { sumAdmin += rA; countAdmin++; }
            
            const rS = Number(c.feedback.ratings?.sales) || 0;
            if (rS > 0) { sumSales += rS; countSales++; }
            
            const rT = Number(c.feedback.ratings?.tech) || 0;
            if (rT > 0) { sumTech += rT; countTech++; }

            const emoji = c.feedback.overallMood;
            if (moods[emoji] !== undefined) moods[emoji]++;
        }
    });

    const avgAdmin = countAdmin > 0 ? (sumAdmin / countAdmin).toFixed(2) : 0;
    const avgSales = countSales > 0 ? (sumSales / countSales).toFixed(2) : 0;
    const avgTech = countTech > 0 ? (sumTech / countTech).toFixed(2) : 0;

    // Helper to get emoji for score
    const getEmojiForScore = (score) => {
        if (score >= 4.5) return '😍';
        if (score >= 3.5) return '😊';
        if (score >= 2.5) return '😐';
        if (score >= 1.5) return '😟';
        if (score > 0) return '🚨';
        return '';
    };

    // 1. Scores Bar Chart
    if (state.charts.scoresBar) state.charts.scoresBar.destroy();
    state.charts.scoresBar = new Chart(ctxBar, {
        type: 'bar',
        plugins: typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : [],
        data: {
            labels: ['💬 ทีมประสานงาน / แอดมิน', '🧭 แนะนำฟิล์ม / ฝ่ายขาย', '🧰 หน้างานติดตั้ง / ทีมช่าง'],
            datasets: [{
                label: 'คะแนนเฉลี่ยประเมิน',
                data: [avgAdmin, avgSales, avgTech],
                backgroundColor: ['#1b437c', '#005eb8', '#10b981'],
                borderRadius: 8,
                barThickness: 36
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: (value) => getEmojiForScore(value),
                    font: { size: 18 }
                }
            },
            scales: {
                y: { min: 0, max: 5, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            },
            layout: { padding: { top: 35 } }
        }
    });

    // 2. Moods Pie Chart
    if (state.charts.moodsPie) state.charts.moodsPie.destroy();
    state.charts.moodsPie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['😍 ประทับใจมาก', '😊 พอใจ', '😐 กลาง ๆ', '😟 ต้องแก้ไข', '🚨 ด่วนที่สุด'],
            datasets: [{
                data: [moods['😍'], moods['😊'], moods['😐'], moods['😟'], moods['🚨']],
                backgroundColor: ['#10b981', '#60a5fa', '#94a3b8', '#f59e0b', '#ef4444'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Sarabun' } } }
            },
            cutout: '65%'
        }
    });

    // 3. Sales and Tech Performance Charts
    const ctxSales = document.getElementById('chart-sales-perf');
    const ctxTech = document.getElementById('chart-tech-perf');

    if (ctxSales && ctxTech) {
        let salesStats = {};
        let techStats = {};

        state.customers.forEach(c => {
            if (c.feedback) {
                let salesName = c.sales || '-';
                let techName = c.tech && c.tech !== '-' ? c.tech : '-';

                // Parse "Sales+Tech" format if present
                if (salesName.includes('+')) {
                    const parts = salesName.split('+');
                    salesName = parts[0].trim();
                    if (techName === '-') {
                        techName = parts.slice(1).join('+').trim();
                    }
                }
                
                salesName = salesName.trim();
                techName = techName.trim();

                // Sales
                if (salesName && salesName !== '-') {
                    const rS = Number(c.feedback.ratings?.sales) || 0;
                    if (rS > 0) {
                        if (!salesStats[salesName]) salesStats[salesName] = { sum: 0, count: 0 };
                        salesStats[salesName].sum += rS;
                        salesStats[salesName].count++;
                    }
                }
                // Tech
                if (techName && techName !== '-') {
                    const rT = Number(c.feedback.ratings?.tech) || 0;
                    if (rT > 0) {
                        if (!techStats[techName]) techStats[techName] = { sum: 0, count: 0 };
                        techStats[techName].sum += rT;
                        techStats[techName].count++;
                    }
                }
            }
        });

        // Prepare data for Sales Chart (sorted by rating descending)
        const salesData = Object.keys(salesStats).map(k => ({
            name: k,
            avg: (salesStats[k].sum / salesStats[k].count).toFixed(2),
            count: salesStats[k].count
        })).sort((a, b) => b.avg - a.avg);

        // Prepare data for Tech Chart (sorted by rating descending)
        const techData = Object.keys(techStats).map(k => ({
            name: k,
            avg: (techStats[k].sum / techStats[k].count).toFixed(2),
            count: techStats[k].count
        })).sort((a, b) => b.avg - a.avg);

        if (state.charts.salesBar) state.charts.salesBar.destroy();
        state.charts.salesBar = new Chart(ctxSales, {
            type: 'bar',
            plugins: typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : [],
            data: {
                labels: salesData.map(d => d.name),
                datasets: [{
                    label: 'คะแนนเฉลี่ยฝ่ายขาย',
                    data: salesData.map(d => d.avg),
                    backgroundColor: '#005eb8',
                    borderRadius: 4,
                    barThickness: 24
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (value) => getEmojiForScore(value),
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                return `จำนวนประเมิน: ${salesData[context.dataIndex].count} งาน`;
                            }
                        }
                    }
                },
                scales: {
                    y: { min: 0, max: 5, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false } }
                },
                layout: { padding: { top: 35 } }
            }
        });

        if (state.charts.techBar) state.charts.techBar.destroy();
        state.charts.techBar = new Chart(ctxTech, {
            type: 'bar',
            plugins: typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : [],
            data: {
                labels: techData.map(d => d.name),
                datasets: [{
                    label: 'คะแนนเฉลี่ยทีมช่าง',
                    data: techData.map(d => d.avg),
                    backgroundColor: '#10b981',
                    borderRadius: 4,
                    barThickness: 24
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (value) => getEmojiForScore(value),
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                return `จำนวนประเมิน: ${techData[context.dataIndex].count} งาน`;
                            }
                        }
                    }
                },
                scales: {
                    y: { min: 0, max: 5, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false } }
                },
                layout: { padding: { top: 20 } }
            }
        });
    }
}

function renderReportCharts() {
    const ctxMvp = document.getElementById('chart-mvps-bar');
    if (!ctxMvp) return;

    let mvps = { admin: 0, sales: 0, tech: 0, all: 0, none: 0 };
    state.customers.forEach(c => {
        if (c.feedback && c.feedback.mvp) {
            mvps[c.feedback.mvp]++;
        }
    });

    // Render horizontal Bar chart
    if (state.charts.mvpsBar) state.charts.mvpsBar.destroy();
    state.charts.mvpsBar = new Chart(ctxMvp, {
        type: 'bar',
        data: {
            labels: ['ทีมช่าง 🧰', 'ฝ่ายขาย 🧭', 'แอดมิน 💬', 'ทุกทีม 💙'],
            datasets: [{
                label: 'คะแนนเสียงโหวต MVP',
                data: [mvps.tech, mvps.sales, mvps.admin, mvps.all],
                backgroundColor: ['#10b981', '#005eb8', '#1b437c', '#ec4899'],
                borderRadius: 6,
                barThickness: 24
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#f1f5f9' }, ticks: { stepSize: 1 } },
                y: { grid: { display: false } }
            }
        }
    });

    // Fill detailed averages
    let sumAdmin = 0, sumSales = 0, sumTech = 0, count = 0;
    state.customers.forEach(c => {
        if (c.feedback) {
            sumAdmin += c.feedback.ratings.admin;
            sumSales += c.feedback.ratings.sales;
            sumTech += c.feedback.ratings.tech;
            count++;
        }
    });

    const avgAdmin = count > 0 ? (sumAdmin / count).toFixed(2) : '0.0';
    const avgSales = count > 0 ? (sumSales / count).toFixed(2) : '0.0';
    const avgTech = count > 0 ? (sumTech / count).toFixed(2) : '0.0';

    document.getElementById('report-avg-admin').innerText = avgAdmin;
    document.getElementById('report-avg-sales').innerText = avgSales;
    document.getElementById('report-avg-tech').innerText = avgTech;
}

// EXPORT TO JSON
function exportData() {
    const blob = new Blob([JSON.stringify(state.customers, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `gfs_crm_customers_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function clearDashboardData() {
    if (confirm('คุณต้องการลบข้อมูลลูกค้าทั้งหมดในหน้าจำลองนี้ใช่หรือไม่?')) {
        state.customers = [];
        processDataAndRender();
        // SoundFX is not initialized in admin app, just clear
    }
}

// Custom premium toast notification system (replaces ugly browser alerts)
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.setAttribute('id', 'toast-container');
        document.body.appendChild(container);
    }

    const card = document.createElement('div');
    card.className = `toast-card ${type}`;

    let iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-circle';
    else if (type === 'warning') iconName = 'alert-triangle';
    else if (type === 'info') iconName = 'info';

    card.innerHTML = `
        <div class="toast-icon ${type}">
            <i data-lucide="${iconName}" style="width: 20px; height: 20px;"></i>
        </div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(card);
    lucide.createIcons();

    // Fade out and remove after 3 seconds
    setTimeout(() => {
        card.classList.add('fade-out');
        setTimeout(() => {
            if (card.parentNode) {
                container.removeChild(card);
            }
        }, 300);
    }, 3000);
}

function fetchAndGenerateLinks() {
    const sheetsUrl = state.googleSheetsUrl || localStorage.getItem('google_sheets_apps_script_url');
    if (!sheetsUrl || sheetsUrl.trim() === '') {
        showToast('⚠️ กรุณากรอก Google Sheets Web App URL ในหน้าตั้งค่าระบบ API ก่อนกดดึงข้อมูลค่ะ', 'warning');
        return;
    }

    const container = document.getElementById('links-generator-container');
    container.innerHTML = '<div style="text-align: center; font-size: 0.7rem; padding: 10px; color: var(--primary);"><i data-lucide="loader" class="spin-icon" style="width: 14px; height: 14px; margin-right: 6px;"></i>กำลังดึงข้อมูลรายชื่อลูกค้าจากชีต Data...</div>';
    lucide.createIcons();

    fetch(`${sheetsUrl}?action=getAllCustomers`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.data) {
                const customers = data.data;
                if (customers.length === 0) {
                    container.innerHTML = '<div style="text-align: center; font-size: 0.7rem; color: var(--text-muted); padding: 10px;">ไม่พบข้อมูลลูกค้าในชีต Data</div>';
                    return;
                }

                container.innerHTML = '';
                // The consumer app is served at the root domain!
                const baseUrl = window.location.origin + '/';

                customers.forEach(c => {
                    const shortUrl = `${baseUrl}?id=${encodeURIComponent(c.id)}`;
                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.justify = 'space-between';
                    row.style.alignItems = 'center';
                    row.style.backgroundColor = '#ffffff';
                    row.style.padding = '8px 10px';
                    row.style.borderRadius = '8px';
                    row.style.border = '1px solid var(--border)';
                    row.style.fontSize = '0.75rem';

                    row.innerHTML = `
                        <div style="flex: 1; min-width: 0; padding-right: 10px; text-align: left;">
                            <strong style="color: var(--primary);">${c.name}</strong> 
                            <span style="color: var(--text-muted);">(${c.id})</span>
                            <div style="color: var(--secondary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; font-size: 0.68rem; margin-top: 2px;">${shortUrl}</div>
                        </div>
                        <button class="btn-primary" style="padding: 4px 10px; font-size: 0.65rem; width: auto; height: auto; border-radius: 6px; flex-shrink: 0;" onclick="copyToClipboard('${shortUrl}', this, '${c.id}')">
                            คัดลอกลิงก์
                        </button>
                    `;
                    container.appendChild(row);
                });
            } else {
                container.innerHTML = `<div style="text-align: center; font-size: 0.7rem; color: var(--danger); padding: 10px;">❌ ดึงข้อมูลล้มเหลว: ${data.message}</div>`;
            }
        })
        .catch(err => {
            container.innerHTML = `<div style="text-align: center; font-size: 0.7rem; color: var(--danger); padding: 10px;">❌ เกิดข้อผิดพลาด: ${err.message}</div>`;
        });
}

function copyTextRobust(text) {
    try {
        var textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        var successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            return Promise.resolve();
        }
    } catch (err) {
        try {
            if (document.body.contains(textArea)) {
                document.body.removeChild(textArea);
            }
        } catch (e) {}
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    
    return Promise.reject(new Error('All copy methods failed'));
}

function copyToClipboard(text, btn, id = null) {
    try {
        const copyPromise = copyTextRobust(text);
        
        copyPromise.then(() => {
            showToast('คัดลอกลิงก์แบบสอบถามสำเร็จแล้วค่ะ! 📋', 'success');

            const origText = btn.innerText;
            btn.innerText = '✓ คัดลอกแล้ว';
            btn.style.backgroundColor = 'var(--success)';
            btn.style.backgroundImage = 'none'; // remove linear gradient
            
            setTimeout(() => {
                if (id) markAsSent(id);
                // We don't need to restore btn if it gets destroyed by markAsSent's re-render, 
                // but just in case it doesn't:
                if (document.body.contains(btn)) {
                    btn.innerText = origText;
                    btn.style.backgroundColor = '';
                    btn.style.backgroundImage = '';
                }
            }, 1000);
        }).catch(err => {
            console.error('Could not copy text: ', err);
            alert('Promise rejected: ' + err.message);
            showToast('เกิดข้อผิดพลาดในการคัดลอกลิงก์', 'error');
        });
    } catch (fatalErr) {
        alert("Fatal Error in copyToClipboard: " + fatalErr.message);
    }
}

function getCustomerMonth(installDateStr) {
    if (!installDateStr) return '';
    if (installDateStr.indexOf('-') > -1) {
        return parseInt(installDateStr.split('-')[1], 10).toString();
    } else if (installDateStr.indexOf('/') > -1) {
        return parseInt(installDateStr.split('/')[1], 10).toString();
    }
    return '';
}

function parseDateObj(dateStr) {
    if (!dateStr) return new Date(0);
    if (dateStr.indexOf('-') > -1) {
        return new Date(dateStr);
    } else if (dateStr.indexOf('/') > -1) {
        const parts = dateStr.split('/');
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(dateStr);
}
function populateFilters(init) {
    const monthSelect = document.getElementById('global-filter-month');
    const companySelect = document.getElementById('global-filter-company');
    
    const monthNames = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const uniqueMonths = new Set();
    const uniqueCompanies = new Set();

    state.allCustomers.forEach(c => {
        if (c.company && c.company !== '-') uniqueCompanies.add(c.company);

        if (!c.installDate || c.installDate === '-') return;
        let m = '', y = '';
        const dateStr = formatInstallDate(c.installDate);
        if (dateStr.indexOf('-') > -1) {
            const p = dateStr.split('-');
            m = parseInt(p[1], 10);
            y = p[0].length === 2 ? "20" + p[0] : p[0];
        } else if (dateStr.indexOf('/') > -1) {
            const p = dateStr.split('/');
            m = parseInt(p[1], 10);
            y = p[2].length === 2 ? "20" + p[2] : p[2];
        }
        if (m && y) uniqueMonths.add(`${m}-${y}`);
    });

    // Populate Months
    if (monthSelect) {
        let currentMonthVal = monthSelect.value;
        monthSelect.innerHTML = '<option value="all">ทุกเดือน</option>';
        const sortedMonths = Array.from(uniqueMonths).map(str => {
            const p = str.split('-');
            return { val: str, m: parseInt(p[0]), y: parseInt(p[1]) };
        }).sort((a, b) => b.y !== a.y ? b.y - a.y : b.m - a.m);
        
        sortedMonths.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.val;
            opt.textContent = `${monthNames[item.m]} ${item.y}`;
            monthSelect.appendChild(opt);
        });

        if (init) {
            const currentM = new Date().getMonth() + 1;
            const currentY = new Date().getFullYear();
            const currentMonthKey = `${currentM}-${currentY}`;
            
            if (Array.from(monthSelect.options).some(o => o.value === currentMonthKey)) {
                monthSelect.value = currentMonthKey;
            } else if (sortedMonths.length > 0) {
                monthSelect.value = sortedMonths[0].val; // Default to newest month
            }
        } else if (currentMonthVal) {
            if (currentMonthVal.indexOf('-') === -1 && currentMonthVal !== 'all') {
                const currentYear = new Date().getFullYear();
                const newVal = `${currentMonthVal}-${currentYear}`;
                monthSelect.value = Array.from(monthSelect.options).some(o => o.value === newVal) ? newVal : 'all';
            } else {
                monthSelect.value = currentMonthVal;
            }
        }
    }

    // Populate Companies
    if (companySelect) {
        const currentCompanyVal = companySelect.value;
        companySelect.innerHTML = '<option value="all">ทุกบริษัท</option>';
        Array.from(uniqueCompanies).sort().forEach(comp => {
            const opt = document.createElement('option');
            opt.value = comp;
            opt.textContent = comp;
            companySelect.appendChild(opt);
        });
        if (!init && currentCompanyVal) {
            companySelect.value = currentCompanyVal;
        }
    }
}

function formatInstallDate(dateStr) {
    if (!dateStr) return '-';
    // If it's a long date string containing "GMT"
    if (dateStr.indexOf('GMT') > -1) {
        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }
        } catch (e) {
            console.error("Error parsing date:", e);
        }
    }
    return dateStr;
}

// ==========================================
// PRESENTATION MODE LOGIC
// ==========================================
let presentationSlides = [];
let currentSlideIndex = 0;

function initPresentation() {
    // Filter customers who have feedback data
    presentationSlides = state.customers.filter(c => c.feedback && (c.feedback.overallMood || c.status === 'Completed'));
    currentSlideIndex = 0;
    
    renderPresentationSlide();
}

function renderPresentationSlide() {
    const container = document.getElementById('presentation-content');
    const counter = document.getElementById('slide-counter');
    
    if (!presentationSlides || presentationSlides.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted);">ไม่มีข้อมูลสำหรับนำเสนอในช่วงเวลานี้</div>';
        counter.innerText = '0 / 0';
        return;
    }
    
    if (currentSlideIndex < 0) currentSlideIndex = 0;
    if (currentSlideIndex >= presentationSlides.length) currentSlideIndex = presentationSlides.length - 1;
    
    counter.innerText = `${currentSlideIndex + 1} / ${presentationSlides.length}`;
    
    const c = presentationSlides[currentSlideIndex];
    const fb = c.feedback;
    
    // Build tags for benefits/details
    const positiveTags = (fb.benefits || []).map(b => `<span class="slide-tag positive"><i data-lucide="check-circle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-top:-2px;"></i> ${b}</span>`).join('');
    
    let adminPos = (fb.details?.admin || []).map(b => `<span class="slide-tag slide-tag-admin">${b}</span>`).join('');
    let salesPos = (fb.details?.sales || []).map(b => `<span class="slide-tag slide-tag-sales">${b}</span>`).join('');
    let techPos = (fb.details?.tech || []).map(b => `<span class="slide-tag slide-tag-tech">${b}</span>`).join('');
    
    let supportTags = (fb.supportNeeds || []).map(b => `<span class="slide-tag negative"><i data-lucide="alert-circle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-top:-2px;"></i> ${b}</span>`).join('');
    
    let additionalComments = [];
    if (fb.comments?.admin) additionalComments.push(`<b>แอดมิน:</b> ${fb.comments.admin}`);
    if (fb.comments?.sales) additionalComments.push(`<b>ฝ่ายขาย:</b> ${fb.comments.sales}`);
    if (fb.comments?.tech) additionalComments.push(`<b>ทีมช่าง:</b> ${fb.comments.tech}`);
    if (fb.supportDetails) additionalComments.push(`<b style="color:var(--danger)">รายละเอียดเพิ่มเติม (ปรับปรุง):</b> ${fb.supportDetails}`);
    
    
    
        const customerComment = fb.mvpComment ? fb.mvpComment.trim() : '';
    const quoteHtml = customerComment 
        ? `<div class="slide-quote-text">${customerComment}</div>`
        : `<div class="slide-quote-empty">ลูกค้าประเมินคะแนนเรียบร้อย แต่ไม่ได้ระบุข้อความเพิ่มเติม</div>`;
        
    // Calculate total score
    let totalScore = 0;
    let scoreCount = 0;
    if (fb.ratings?.admin) { totalScore += fb.ratings.admin; scoreCount++; }
    if (fb.ratings?.sales) { totalScore += fb.ratings.sales; scoreCount++; }
    if (fb.ratings?.tech) { totalScore += fb.ratings.tech; scoreCount++; }
    const avgScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : '-';
        
    container.innerHTML = `
        <div class="slide-card" style="display: flex; flex-direction: column; gap: 0;">
            <div class="slide-header" style="margin-bottom: 20px; align-items: flex-start;">
                <div class="slide-cust-info">
                    <h3>${c.name}</h3>
                    <div class="slide-cust-meta" style="flex-direction: column; gap: 8px;">
                        <span><i data-lucide="building" style="width:16px;height:16px;"></i> <b>สถานที่:</b> ${c.siteType || c.company || '-'}</span>
                        <div style="display: flex; gap: 16px;">
                            <span><i data-lucide="calendar" style="width:16px;height:16px;"></i> <b>วันที่:</b> ${c.installDate}</span>
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px;">
                    <div class="slide-mood-big" style="background: #f1f5f9; padding: 12px 20px; border-radius: 16px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 100px;">
                        <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">คะแนนรวม</span>
                        <span style="font-size: 1.8rem; font-weight: 900; color: var(--primary); line-height: 1;">${avgScore} <span style="font-size: 1rem; color: #94a3b8;">/5</span></span>
                    </div>
                    <div class="slide-mood-big" style="background: #f1f5f9; padding: 12px 24px; border-radius: 16px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); display: flex; align-items: center;">
                        ${fb.overallMood || '😊'}
                    </div>
                </div>
            </div>
            
            <!-- Customer Quote Area -->
            <div class="slide-quote-container">
                <div class="slide-quote-label">ข้อความฝากถึงทีมงาน</div>
                ${quoteHtml}
            </div>
            
            <!-- Team Scores Area -->
            <div class="slide-team-grid">
                <!-- Admin -->
                <div class="slide-team-card">
                    <div class="slide-team-card-header">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #eff6ff; color: #3b82f6; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                            <i data-lucide="headset" style="width: 28px; height: 28px;"></i>
                        </div>
                        <div class="slide-team-card-title">
                            <h4>แอดมิน (${c.adminName || '-'})</h4>
                            <div class="slide-team-score">${fb.ratings?.admin || '-'} <span style="font-size:1.1rem; color:#94a3b8;">/ 5</span></div>
                        </div>
                    </div>
                    <div class="slide-team-tags">${adminPos || '<span style="color:#ccc;">-</span>'}</div>
                    ${fb.comments?.admin ? `<div class="slide-team-comment comment-admin">${fb.comments.admin}</div>` : ''}
                </div>
                
                <!-- Sales -->
                <div class="slide-team-card">
                    <div class="slide-team-card-header">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #fdf4ff; color: #d946ef; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                            <i data-lucide="briefcase" style="width: 28px; height: 28px;"></i>
                        </div>
                        <div class="slide-team-card-title">
                            <h4>ฝ่ายขาย (${c.sales || '-'})</h4>
                            <div class="slide-team-score">${fb.ratings?.sales || '-'} <span style="font-size:1.1rem; color:#94a3b8;">/ 5</span></div>
                        </div>
                    </div>
                    <div class="slide-team-tags">${salesPos || '<span style="color:#ccc;">-</span>'}</div>
                    ${fb.comments?.sales ? `<div class="slide-team-comment comment-sales">${fb.comments.sales}</div>` : ''}
                </div>
                
                <!-- Tech -->
                <div class="slide-team-card">
                    <div class="slide-team-card-header">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #f0fdf4; color: #22c55e; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                            <i data-lucide="wrench" style="width: 28px; height: 28px;"></i>
                        </div>
                        <div class="slide-team-card-title">
                            <h4>ทีมช่าง (${c.tech || '-'})</h4>
                            <div class="slide-team-score">${fb.ratings?.tech || '-'} <span style="font-size:1.1rem; color:#94a3b8;">/ 5</span></div>
                        </div>
                    </div>
                    <div class="slide-team-tags">${techPos || '<span style="color:#ccc;">-</span>'}</div>
                    ${fb.comments?.tech ? `<div class="slide-team-comment comment-tech">${fb.comments.tech}</div>` : ''}
                </div>
            </div>
            
            ${fb.supportDetails || fb.supportNeeds?.length > 0 ? `
            <div style="margin-top: 20px; padding: 16px; background: #fff5f5; border-left: 4px solid var(--danger); border-radius: 8px;">
                <div style="font-weight: 700; margin-bottom: 8px; color: var(--danger);"><i data-lucide="alert-triangle" style="width:18px; display:inline-block; vertical-align:-3px;"></i> สิ่งที่ควรปรับปรุง:</div>
                <div style="margin-bottom: 4px; font-weight: 600;">${supportTags}</div>
                <div>${fb.supportDetails || ''}</div>
            </div>
            ` : ''}
        </div>
    `;

    lucide.createIcons();
}

function prevSlide() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        renderPresentationSlide();
    }
}

function nextSlide() {
    if (currentSlideIndex < presentationSlides.length - 1) {
        currentSlideIndex++;
        renderPresentationSlide();
    }
}

function toggleFullScreen() {
    const elem = document.getElementById('presentation-container');
    if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}
