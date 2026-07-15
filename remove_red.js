const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace inline red styles globally
html = html.replace(/background-color:\s*rgba\(255,\s*0,\s*0,\s*0\.4\);\s*border:\s*2px\s*solid\s*red;\s*/g, '');

fs.writeFileSync('index.html', html, 'utf8');
console.log("Removed red debugging styles from index.html.");
