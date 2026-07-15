const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace top: 31.5%; left: 5%; width: 90%; height: 56%; gap: 2%;
// with top: 20.5%; left: 5.5%; width: 89%; height: 54%; gap: 2.5%;

const oldStyle = 'top: 31.5%; left: 5%; width: 90%; height: 56%; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 2%;';
const newStyle = 'top: 20.5%; left: 5.5%; width: 89%; height: 54.5%; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 2.5%;';

html = html.replace(oldStyle, newStyle);

fs.writeFileSync('index.html', html, 'utf8');
console.log("Updated M2 grid position.");
