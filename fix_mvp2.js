const fs = require('fs');
let code = fs.readFileSync('admin/app.js', 'utf8');
code = code.replace(
    /\$\{\(showMvp \|\| customerComment\) \? `\s*<div class="pp-mvp-banner">/,
    '${(showMvp && customerComment) ? `\n            <div class="pp-mvp-banner">'
);
fs.writeFileSync('admin/app.js', code);
console.log('Replaced successfully');
