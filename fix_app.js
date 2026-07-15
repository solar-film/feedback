const fs = require('fs');
let content = fs.readFileSync('admin/app.js', 'utf8');

// Replace using Regex to ignore exact spacing/line endings
content = content.replace(/const counter = document\.getElementById\('slide-counter'\);\s*if \(!presentationSlides \|\| presentationSlides\.length === 0\) \{\s*container\.innerHTML = '<div style="text-align: center; color: var\(--text-muted\);">ไม่มีข้อมูลสำหรับนำเสนอในช่วงเวลานี้<\/div>';\s*counter\.innerText = '0 \/ 0';\s*return;\s*\}/, 
`if (!presentationSlides || presentationSlides.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); margin-top: 40px;">ไม่มีข้อมูลสำหรับนำเสนอในช่วงเวลานี้</div>';
        return;
    }`);

content = content.replace(/counter\.innerText = \`\$\{currentSlideIndex \+ 1\} \/ \$\{presentationSlides\.length\}\`;/, "");

fs.writeFileSync('admin/app.js', content);
console.log('Fixed app.js properly');
