const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

// We want to replace background and border for the overlay classes to make them RED.
// We can just replace:
// background: transparent !important;
// border: 2px solid transparent !important;
// with red versions.

const oldBg = 'background: transparent !important;';
const newBg = 'background: rgba(255, 0, 0, 0.4) !important;';
const oldBorder = 'border: 2px solid transparent !important;';
const newBorder = 'border: 2px solid red !important;';

// But wait, there are also ".img-overlay-chip.selected { background-color: transparent !important; ... }"
// Let's just do a global replace for the background properties of these overlays.
// It's safer to just replace all `background: transparent !important;` that are part of these classes.

css = css.replace(/\.img-overlay-chip\s*\{[\s\S]*?\}/, match => {
    return match.replace(/background:\s*transparent\s*!important;/, newBg).replace(/border:\s*2px solid transparent\s*!important;/, newBorder);
});

css = css.replace(/\.img-overlay-mvp\s*\{[\s\S]*?\}/, match => {
    return match.replace(/background:\s*transparent\s*!important;/, newBg).replace(/border:\s*2px solid transparent\s*!important;/, newBorder);
});

css = css.replace(/\.img-overlay-m3\s*\{[\s\S]*?\}/, match => {
    return match.replace(/background:\s*transparent\s*!important;/, newBg).replace(/border:\s*2px solid transparent\s*!important;/, newBorder);
});

css = css.replace(/\.img-overlay-m5\s*\{[\s\S]*?\}/, match => {
    return match.replace(/background:\s*transparent\s*!important;/, newBg).replace(/border:\s*2px solid transparent\s*!important;/, newBorder);
});


fs.writeFileSync('style.css', css, 'utf8');
console.log("Updated style.css to force red hitboxes.");
