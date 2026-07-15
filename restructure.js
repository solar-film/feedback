const fs = require('fs');

let html = fs.readFileSync('admin/index.html', 'utf8');

// 1. Remove the reports menu item
html = html.replace(/<li class="menu-item" data-tab="reports">[\s\S]*?<\/li>/, '');

// 2. Extract the chart-card for department scores
const startStr = '<div class="chart-card">\n                            <div class="chart-card-header">\n                                <h3 class="chart-card-title">สรุปคะแนนเฉลี่ยผลงานรายแผนก (เต็ม 5.0)</h3>';
const startIndex = html.indexOf(startStr);
const endStr = '<div style="font-size: 1.6rem; font-weight: 800; color: var(--success);" id="report-avg-tech">0.0</div>\n                                </div>\n                            </div>\n                        </div>';
const endIndex = html.indexOf(endStr) + endStr.length;

let cardHtml = html.substring(startIndex, endIndex);

// Add styling for grid span
cardHtml = cardHtml.replace('<div class="chart-card">', '<div class="chart-card" style="grid-column: 3 / span 2; grid-row: 1 / span 2; display: flex; flex-direction: column;">');

// 3. Insert cardHtml into kpi-grid
// kpi-grid has 4 kpi-cards. We want to insert it after the 2nd kpi-card.
// We can find the 2nd kpi-card's closing div.
let kpiGridStart = html.indexOf('<div class="kpi-grid">');
let firstCardEnd = html.indexOf('</div>\n                        \n                        <div class="kpi-card">', kpiGridStart);
let secondCardEnd = html.indexOf('</div>\n\n                        <div class="kpi-card">', firstCardEnd + 10);
// To be safe, just find the string of the 2nd kpi-card end
let insertTarget = '<i data-lucide="check-circle-2"></i>\n                            </div>\n                        </div>';
let insertPos = html.indexOf(insertTarget) + insertTarget.length;

html = html.substring(0, insertPos) + '\n\n                        ' + cardHtml + html.substring(insertPos);

// 4. Remove tab-reports entirely
const tabStartStr = '<!-- TAB 4: รายงานผลงานทีมและโหวต MVP -->';
const tabStart = html.indexOf(tabStartStr);
const tabEndStr = '<!-- TAB 5: โหมดนำเสนอ -->';
const tabEnd = html.indexOf(tabEndStr);

if(tabStart !== -1 && tabEnd !== -1) {
    html = html.substring(0, tabStart) + html.substring(tabEnd);
}

fs.writeFileSync('admin/index.html', html);
console.log('Restructure complete');
