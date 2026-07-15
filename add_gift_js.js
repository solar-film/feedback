const fs = require('fs');
let code = fs.readFileSync('admin/app.js', 'utf8');

// 1. Add title for 'gifts' tab
if (code.indexOf('gifts: "สถานะจัดส่งของรางวัล",') === -1) {
    code = code.replace(
        'presentation: "โหมดนำเสนอข้อมูลฟีดแบคจากลูกค้า (Customer Feedback)"\n    };',
        'presentation: "โหมดนำเสนอข้อมูลฟีดแบคจากลูกค้า (Customer Feedback)",\n        gifts: "สถานะจัดส่งของรางวัล"\n    };'
    );
}

// 2. Add renderGiftTable() to processDataAndRender
if (code.indexOf('renderGiftTable();') === -1) {
    code = code.replace(
        'filterCustomerTable();',
        'filterCustomerTable();\n    renderGiftTable();'
    );
}

// 3. Append the Gift Delivery logic
const giftLogic = `

// ==========================================
// GIFT DELIVERY STATUS SYSTEM
// ==========================================

function renderGiftTable() {
    const tbody = document.getElementById('gifts-table-body');
    if (!tbody) return;
    
    // Filter customers who have googleReviewClicked === 'Yes'
    const giftCustomers = state.customers.filter(c => c.feedback && c.feedback.googleReviewClicked === 'Yes');
    
    if (giftCustomers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px;">ไม่มีข้อมูลลูกค้าที่กดรีวิว Google Maps</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    giftCustomers.forEach(c => {
        const gift = c.giftData || {};
        const status = gift.status || '-';
        const item = gift.gift || '-';
        
        let statusBadge = '';
        if (status === 'เตรียมจัดส่ง') statusBadge = '<span class="status-badge" style="background-color:var(--warning-light);color:var(--warning);">เตรียมจัดส่ง</span>';
        else if (status === 'จัดส่งแล้ว') statusBadge = '<span class="status-badge" style="background-color:var(--success-light);color:var(--success);">จัดส่งแล้ว</span>';
        else if (status === 'ของตีกลับ') statusBadge = '<span class="status-badge" style="background-color:var(--danger-light);color:var(--danger);">ของตีกลับ</span>';
        else statusBadge = '<span style="color:var(--text-muted);">-</span>';
        
        const tr = document.createElement('tr');
        tr.innerHTML = \`
            <td>\${c.id}</td>
            <td>คุณ\${(c.name || '').replace(/^คุณ/, '').split(' ')[0]}</td>
            <td>\${c.company || '-'}</td>
            <td>\${statusBadge}</td>
            <td>\${item}</td>
            <td style="text-align: right; white-space: nowrap;">
                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem; margin-right: 4px;" onclick="openGiftModal('\${c.id}')">
                    <i data-lucide="edit" style="width: 14px; height: 14px;"></i> แก้ไข
                </button>
                <button class="btn-primary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="printGiftLabel('\${c.id}')" title="พิมพ์จ่าหน้าซอง">
                    <i data-lucide="printer" style="width: 14px; height: 14px;"></i> พิมพ์
                </button>
            </td>
        \`;
        tbody.appendChild(tr);
    });
    
    lucide.createIcons();
}

function openGiftModal(id) {
    const c = state.customers.find(x => x.id === id);
    if (!c) return;
    
    const gift = c.giftData || {};
    
    document.getElementById('gift-cust-id').value = id;
    document.getElementById('gift-status').value = gift.status || '';
    document.getElementById('gift-item').value = gift.gift || '';
    
    // Default address from Data sheet Col Q if no gift address saved
    let addr = gift.address || c.addressFromData || '';
    document.getElementById('gift-address').value = addr;
    
    document.getElementById('gift-remark').value = gift.remark || '';
    
    if (gift.status) {
        document.getElementById('btn-delete-gift').style.display = 'flex';
    } else {
        document.getElementById('btn-delete-gift').style.display = 'none';
    }
    
    document.getElementById('modal-gift').classList.add('open');
}

function closeGiftModal() {
    document.getElementById('modal-gift').classList.remove('open');
}

async function saveGiftStatus() {
    const id = document.getElementById('gift-cust-id').value;
    const status = document.getElementById('gift-status').value;
    const item = document.getElementById('gift-item').value;
    const addr = document.getElementById('gift-address').value;
    const remark = document.getElementById('gift-remark').value;
    
    if (!status || !item || !addr) {
        alert('กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน');
        return;
    }
    
    const btn = document.querySelector('#modal-gift .btn-primary');
    const ogHtml = btn.innerHTML;
    btn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;border-top-color:white;"></div> กำลังบันทึก...';
    btn.disabled = true;
    
    try {
        const payload = {
            action: 'updateGiftStatus',
            id: id,
            status: status,
            gift: item,
            address: addr,
            remark: remark
        };
        
        await fetch(state.googleSheetsUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        // Update local state temporarily so it reflects immediately
        const c = state.customers.find(x => x.id === id);
        if (c) {
            c.giftData = { status, gift: item, address: addr, remark };
        }
        
        renderGiftTable();
        closeGiftModal();
        showToast('บันทึกข้อมูลของรางวัลสำเร็จ', 'success');
        
    } catch (e) {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
        btn.innerHTML = ogHtml;
        btn.disabled = false;
    }
}

async function deleteGiftStatus() {
    if (!confirm('ยืนยันการลบข้อมูลของรางวัลลูกค้ารายนี้?')) return;
    
    const id = document.getElementById('gift-cust-id').value;
    const btn = document.getElementById('btn-delete-gift');
    const ogHtml = btn.innerHTML;
    btn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;border-top-color:var(--danger);"></div>';
    btn.disabled = true;
    
    try {
        const payload = {
            action: 'deleteGiftStatus',
            id: id
        };
        
        await fetch(state.googleSheetsUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const c = state.customers.find(x => x.id === id);
        if (c) {
            c.giftData = null;
        }
        
        renderGiftTable();
        closeGiftModal();
        showToast('ลบข้อมูลของรางวัลสำเร็จ', 'success');
        
    } catch (e) {
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
        btn.innerHTML = ogHtml;
        btn.disabled = false;
    }
}

function printGiftLabel(id) {
    const c = state.customers.find(x => x.id === id);
    if (!c) return;
    
    const gift = c.giftData || {};
    const addr = gift.address || c.addressFromData || '';
    
    // Determine Sender by Company
    let senderName = '';
    let senderAddress = '';
    
    if (c.company === 'MHL') {
        senderName = 'บริษัท มโหฬารฟิล์ม จำกัด (สำนักงานใหญ่)';
        senderAddress = 'ฝ่ายการตลาดและลูกค้าสัมพันธ์<br>924 ถ.ลาซาล แขวงบางนาใต้ เขตบางนา กรุงเทพมหานคร 10260<br>Call Center: 02-055-6886 | Mobile: 094-998-1234';
    } else {
        // Default to GFS
        senderName = 'บริษัท กู๊ดฟิล์ม จำกัด (สำนักงานใหญ่)';
        senderAddress = 'ฝ่ายการตลาดและลูกค้าสัมพันธ์<br>914/10-11 ถนนลาซาล แขวงบางนา เขตบางนา กรุงเทพ 10260<br>Call Center: 02-096-3424 | Mobile: 097-097-2103';
    }
    
    const layout = document.getElementById('print-layout');
    
    // Create print HTML layout (A5 Landscape: 210 x 148 mm)
    layout.innerHTML = \`
        <style>
            @media print {
                body * {
                    visibility: hidden;
                }
                #print-layout, #print-layout * {
                    visibility: visible;
                }
                #print-layout {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 210mm;
                    height: 148mm;
                    padding: 15mm;
                    box-sizing: border-box;
                    background: white;
                }
                @page {
                    size: A5 landscape;
                    margin: 0;
                }
                .label-box {
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    width: 100%;
                    height: 100%;
                    padding: 20px;
                    box-sizing: border-box;
                    font-family: 'Sarabun', 'Prompt', sans-serif;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    position: relative;
                }
                .sender-info {
                    font-size: 11pt;
                    color: #475569;
                    line-height: 1.4;
                    max-width: 60%;
                }
                .sender-title {
                    font-weight: bold;
                    color: #1e293b;
                    font-size: 12pt;
                    margin-bottom: 4px;
                }
                .receiver-box {
                    align-self: flex-end;
                    width: 70%;
                    border: 2px solid #005eb8;
                    border-radius: 12px;
                    padding: 20px;
                    margin-top: 20px;
                    background-color: #f8fafc;
                }
                .receiver-title {
                    font-weight: bold;
                    color: #005eb8;
                    font-size: 14pt;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #cbd5e1;
                    padding-bottom: 5px;
                }
                .receiver-details {
                    font-size: 14pt;
                    color: #0f172a;
                    line-height: 1.5;
                }
                .cute-message {
                    position: absolute;
                    bottom: 20px;
                    left: 20px;
                    font-size: 12pt;
                    color: #ec4899;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #fdf2f8;
                    padding: 8px 12px;
                    border-radius: 8px;
                    border: 1px dashed #fbcfe8;
                }
            }
        </style>
        <div class="label-box">
            <div class="sender-info">
                <div class="sender-title">ผู้ส่ง (Sender): \${senderName}</div>
                <div>\${senderAddress}</div>
            </div>
            
            <div class="receiver-box">
                <div class="receiver-title">ผู้รับ (Receiver)</div>
                <div class="receiver-details">
                    <strong>คุณ\${(c.name || '').replace(/^คุณ/, '')}</strong><br>
                    <strong>โทร:</strong> \${c.phone || '-'}<br>
                    <strong>ที่อยู่:</strong><br>
                    \${addr.replace(/\\n/g, '<br>') || '-'}
                </div>
            </div>
            
            <div class="cute-message">
                💖 ขอบคุณที่ไว้วางใจให้เราดูแลรถของคุณนะคะ! รับของขวัญแทนคำขอบคุณจากพวกเราได้เลยค่ะ ✨
            </div>
        </div>
    \`;
    
    // Add font for print if missing
    if (!document.getElementById('print-font')) {
        const font = document.createElement('link');
        font.id = 'print-font';
        font.rel = 'stylesheet';
        font.href = 'https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;700&display=swap';
        document.head.appendChild(font);
    }
    
    // Trigger print
    setTimeout(() => {
        window.print();
    }, 300);
}

`;

if (code.indexOf('function renderGiftTable') === -1) {
    code += giftLogic;
}

fs.writeFileSync('admin/app.js', code);
console.log('App JS updated for Gifts');
