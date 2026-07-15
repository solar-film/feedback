const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace style="position: absolute; with style="background-color: rgba(255, 0, 0, 0.4); border: 2px solid red; position: absolute;
// We only want to do this for the transparent overlays we found.
// Let's target lines containing "position: absolute" AND "onclick" OR "img-overlay"

const lines = html.split('\n');
const modifiedLines = lines.map(line => {
    if ((line.includes('onclick') || line.includes('img-overlay')) && line.includes('position: absolute') && !line.includes('rgba(255, 0, 0, 0.4)')) {
        return line.replace(/style="position:\s*absolute;/, 'style="background-color: rgba(255, 0, 0, 0.4); border: 2px solid red; position: absolute;');
    }
    return line;
});

fs.writeFileSync('index.html', modifiedLines.join('\n'), 'utf8');
console.log("Turned hitboxes RED for debugging.");
