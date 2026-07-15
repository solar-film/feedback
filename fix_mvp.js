const fs = require('fs');
let appJs = fs.readFileSync('admin/app.js', 'utf8');

// 1. Add mvp logic
const oldLogic = `            const customerComment = fb.mvpComment ? fb.mvpComment.trim() : '';`;
const newLogic = `            const customerComment = fb.mvpComment ? fb.mvpComment.trim() : '';
            
            let mvpRaw = fb.mvp ? fb.mvp.trim() : '';
            let showMvp = false;
            let mvpText = '';
            if (mvpRaw && mvpRaw.toLowerCase() !== 'none') {
                showMvp = true;
                mvpText = mvpRaw.toLowerCase() === 'all' ? 'ทุกทีม' : mvpRaw;
            }`;
appJs = appJs.replace(oldLogic, newLogic);

// 2. Replace MVP template
const oldTemplate = `            <!-- MVP Banner -->
            \${(fb.mvp || customerComment) ? \`
            <div class="pp-mvp-banner">
                <div class="pp-banner-bg"></div>
                <div class="pp-banner-content">
                    \${fb.mvp ? \`
                    <div class="pp-trophy">🏆</div>
                    <div class="pp-ribbon">⭐ MVP ประจำงานนี้</div>
                    <div class="pp-mvp-title">
                        ขอมอบมงให้แก่... <span class="pp-mvp-highlight">\${fb.mvp} 🎉</span>
                    </div>
                    \` : ''}`;

const newTemplate = `            <!-- MVP Banner -->
            \${(showMvp || customerComment) ? \`
            <div class="pp-mvp-banner">
                <div class="pp-banner-bg"></div>
                <div class="pp-banner-content">
                    \${showMvp ? \`
                    <div class="pp-trophy-container">
                        <div class="pp-light-rays"></div>
                        <div class="pp-trophy">🏆</div>
                    </div>
                    <div class="pp-ribbon">⭐ MVP ประจำงานนี้</div>
                    <div class="pp-mvp-title">
                        ขอมอบมงให้แก่... <span class="pp-mvp-highlight">\${mvpText} 🎉</span>
                    </div>
                    \` : ''}`;
appJs = appJs.replace(oldTemplate, newTemplate);

fs.writeFileSync('admin/app.js', appJs);

let indexCss = fs.readFileSync('admin/style.css', 'utf8');

const cssToAdd = `
.pp-trophy-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 120px;
    height: 120px;
    margin: -10px auto 10px;
}

.pp-light-rays {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200px;
    height: 200px;
    margin-top: -100px;
    margin-left: -100px;
    background: repeating-conic-gradient(
        from 0deg,
        rgba(250, 204, 21, 0) 0deg,
        rgba(250, 204, 21, 0) 10deg,
        rgba(253, 224, 71, 0.4) 10deg,
        rgba(253, 224, 71, 0.4) 20deg
    );
    border-radius: 50%;
    z-index: 1;
    animation: spinRays 8s linear infinite;
    -webkit-mask-image: radial-gradient(circle, #000 30%, transparent 65%);
    mask-image: radial-gradient(circle, #000 30%, transparent 65%);
    pointer-events: none;
}

.pp-trophy {
    font-size: 3.5rem !important;
    position: relative;
    z-index: 2;
    filter: drop-shadow(0 0 15px rgba(250, 204, 21, 0.8));
    animation: floatTrophy 2s infinite ease-in-out;
    margin: 0 !important;
}

@keyframes spinRays {
    100% { transform: rotate(360deg); }
}

@keyframes floatTrophy {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-8px) scale(1.15); }
}
`;

if (!indexCss.includes('.pp-trophy-container')) {
    indexCss += cssToAdd;
    fs.writeFileSync('admin/style.css', indexCss);
}

console.log("Done");
