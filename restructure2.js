const fs = require('fs');

let html = fs.readFileSync('admin/index.html', 'utf8');

// 1. Remove the reports menu item
html = html.replace(/<li class="menu-item" data-tab="reports">[\s\S]*?<\/li>/, '');

// 2. Extract the chart-card for department scores
const regex = /<div class="chart-card">\s*<div class="chart-card-header">\s*<h3 class="chart-card-title">สรุปคะแนนเฉลี่ยผลงานรายแผนก[\s\S]*?id="report-avg-tech">0\.0<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
const match = html.match(regex);
if (!match) {
    console.error("Could not find the summary card!");
    process.exit(1);
}
let cardHtml = match[0];
cardHtml = cardHtml.replace('<div class="chart-card">', '<div class="chart-card" style="grid-column: 3 / span 2; grid-row: 1 / span 2; display: flex; flex-direction: column;">');

// 3. Insert cardHtml into kpi-grid
// We want to insert it after the 2nd kpi-card.
const kpiRegex = /(<div class="kpi-card">[\s\S]*?<i data-lucide="check-circle-2"><\/i>\s*<\/div>\s*<\/div>)/;
const kpiMatch = html.match(kpiRegex);
if (!kpiMatch) {
    console.error("Could not find the 2nd kpi card!");
    process.exit(1);
}
let insertPos = html.indexOf(kpiMatch[0]) + kpiMatch[0].length;
html = html.substring(0, insertPos) + '\n\n                        ' + cardHtml + html.substring(insertPos);

// 4. Remove tab-reports entirely
const tabStart = html.indexOf('<!-- TAB 4: รายงานผลงานทีมและโหวต MVP -->');
const tabEnd = html.indexOf('<!-- TAB 5: โหมดนำเสนอ -->');
if (tabStart !== -1 && tabEnd !== -1) {
    html = html.substring(0, tabStart) + html.substring(tabEnd);
}

fs.writeFileSync('admin/index.html', html);
console.log('Restructure 2 complete');
