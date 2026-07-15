const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace bottom: 3% with bottom: 0% for prompt-banner-m2
html = html.replace(
    /<div id="prompt-banner-m2" style="position: absolute; bottom: 3%;/g,
    '<div id="prompt-banner-m2" style="position: absolute; bottom: 0%;'
);

// Replace bottom: 3% with bottom: 0% for unlock-banner-m2
html = html.replace(
    /<div class="success-unlock-banner" id="unlock-banner-m2" style="position: absolute; bottom: 3%;/g,
    '<div class="success-unlock-banner" id="unlock-banner-m2" style="position: absolute; bottom: 0%;'
);

fs.writeFileSync('index.html', html, 'utf8');
console.log("Updated bottom spacing for M2 banners.");
