const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const oldStyle = 'top: 26%; left: 5.5%; width: 89%; height: 48%; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 2.5%;';
const newStyle = 'top: 25%; left: 5.5%; width: 89%; height: 45.5%; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 2.5%;';

html = html.replace(oldStyle, newStyle);

fs.writeFileSync('index.html', html, 'utf8');
console.log("Updated M2 grid position.");
