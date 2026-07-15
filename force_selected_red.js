const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

const newBg = 'background-color: rgba(255, 0, 0, 0.4) !important;';
const newBorder = 'border-color: red !important;';

// Force .selected to also be red
css = css.replace(/\.img-overlay-chip\.selected\s*\{[\s\S]*?\}/, match => {
    return match.replace(/background-color:\s*transparent\s*!important;/, newBg).replace(/border-color:\s*transparent\s*!important;/, newBorder);
});

css = css.replace(/\.img-overlay-mvp\.selected\s*\{[\s\S]*?\}/, match => {
    return match.replace(/background-color:\s*transparent\s*!important;/, newBg).replace(/border-color:\s*transparent\s*!important;/, newBorder);
});

css = css.replace(/\.img-overlay-m5\.selected\s*\{[\s\S]*?\}/, match => {
    return match.replace(/background-color:\s*transparent\s*!important;/, newBg).replace(/border-color:\s*transparent\s*!important;/, newBorder);
});

fs.writeFileSync('style.css', css, 'utf8');
console.log("Forced .selected hitboxes to be red.");
