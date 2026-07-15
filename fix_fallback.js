const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

const regex = /const\s+reviewGfs\s*=\s*document\.getElementById\('google-review-link-gfs'\);\s*const\s+reviewMhl\s*=\s*document\.getElementById\('google-review-link-mhl'\);\s*if\s*\(reviewGfs\s*&&\s*reviewMhl\)\s*\{\s*\/\/[^\n]*\s*const\s+isMHL\s*=\s*\(state\.formData\.id\s*&&\s*state\.formData\.id\.includes\('MHL'\)\);\s*if\s*\(isMHL\)\s*\{\s*reviewMhl\.style\.display\s*=\s*'block';\s*reviewGfs\.style\.display\s*=\s*'none';\s*\}\s*else\s*\{\s*reviewGfs\.style\.display\s*=\s*'block';\s*reviewMhl\.style\.display\s*=\s*'none';\s*\}\s*\}/;

const newLogic = `const reviewGfs = document.getElementById('google-review-link-gfs');
    const reviewMhl = document.getElementById('google-review-link-mhl');
    if (reviewGfs && reviewMhl) {
        // Fallback: Check state, check URL params, check full URL string
        const urlParams = new URLSearchParams(window.location.search);
        let currentId = state.formData.id || urlParams.get('id');
        
        // Extreme fallback for weird browser URL issues
        if (!currentId && window.location.href.includes('MHL')) {
            currentId = 'MHL';
        }

        const isMHL = (currentId && currentId.includes('MHL'));
        
        if (isMHL) {
            reviewMhl.style.display = 'block';
            reviewGfs.style.display = 'none';
        } else {
            reviewGfs.style.display = 'block';
            reviewMhl.style.display = 'none';
        }
    }`;

if (regex.test(content)) {
    content = content.replace(regex, newLogic);
    fs.writeFileSync('app.js', content);
    console.log("Success app.js replacement");
} else {
    console.log("Regex failed. Checking if it matches without the alert.");
    // Because I reverted app.js, the alert is GONE! So this regex WILL match!
}
