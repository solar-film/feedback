const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

const regex = /const\s+reviewGfs\s*=\s*document\.getElementById\('google-review-link-gfs'\);\s*const\s+reviewMhl\s*=\s*document\.getElementById\('google-review-link-mhl'\);\s*if\s*\(reviewGfs\s*&&\s*reviewMhl\)\s*\{\s*if\s*\(c\.company\s*===\s*'MHL'\)\s*\{\s*reviewMhl\.style\.display\s*=\s*'block';\s*\}\s*else\s*\{\s*reviewGfs\.style\.display\s*=\s*'block';\s*\}\s*\}/;

const newLogic = `const reviewGfs = document.getElementById('google-review-link-gfs');
                    const reviewMhl = document.getElementById('google-review-link-mhl');
                    if (reviewGfs && reviewMhl) {
                        if (c.company === 'MHL' || window.location.href.includes('MHL')) {
                            reviewMhl.style.display = 'block';
                        } else {
                            reviewGfs.style.display = 'block';
                        }
                    }`;

if (regex.test(content)) {
    content = content.replace(regex, newLogic);
    fs.writeFileSync('app.js', content);
    console.log("Success app.js replacement 2");
} else {
    console.log("Regex 2 failed.");
}
