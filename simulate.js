const fs = require('fs');
const data = require('./api_response.json');

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

    return {
        id: item.id,
        company: item.company || '-',
        name: item.name,
        phone: item.phone,
        lineAt: item.lineAt || '-',
        siteType: item._col_16 || item.siteType || item.company || '-',
        installDate: item.installDate,
        filmModel: item.filmModel || '-',
        sales: item.sales || '-',
        tech: item.tech || '-',
        adminName: item._col_17 || item.adminName || '-',
        bill: item.bill || '-',
        status: status,
        feedback: item.feedback || null
    };
});

const monthVal = '7-2026';
let stateCustomers = freshCustomers.filter(c => {
    let m = '', y = '';
    if (c.installDate && c.installDate !== '-') {
        // formatInstallDate is identity if already formatted.
        const dateStr = c.installDate; 
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
    return rowMonthYear === monthVal;
});

let presentationSlides = stateCustomers.filter(c => c.feedback && (c.feedback.overallMood || c.status === 'Completed'));

console.log("presentationSlides length:", presentationSlides.length);

for (let c of presentationSlides) {
    let fb = c.feedback;
    try {
        const adminTagsHtml = fb.details?.admin ? "tags" : "";
        
        let n = `คุณ${(c.name || '').replace(/^คุณ/, '').split(' ')[0]}`;
        // simulating the rest
        
    } catch (e) {
        console.error("Error on customer", c.id, e);
    }
}
console.log("Done");
