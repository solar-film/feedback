const fs = require('fs');
const md = fs.readFileSync('google_sheets_setup.md', 'utf8');
const match = md.match(/```javascript([\s\S]+?)```/);
if (match) {
    fs.writeFileSync('test_gs.js', match[1]);
    console.log("Extracted JS");
} else {
    console.log("No JS found");
}
