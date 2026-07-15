const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace top: 20.5%; left: 5.5%; width: 89%; height: 54.5%; gap: 2.5%;
// with top: 22%; left: 5.5%; width: 89%; height: 50%; gap: 3.5%;

const oldStyle = 'top: 20.5%; left: 5.5%; width: 89%; height: 54.5%; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 2.5%;';
const newStyle = 'top: 22%; left: 5.5%; width: 89%; height: 50%; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 3.5%;';

html = html.replace(oldStyle, newStyle);

fs.writeFileSync('index.html', html, 'utf8');
console.log("Updated M2 grid position again.");
