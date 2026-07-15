const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

// Use regex to match regardless of whitespace
const regex1 = /const\s+reviewLinkElem\s*=\s*document\.getElementById\('google-review-link'\);\s*if\s*\(reviewLinkElem\)\s*\{\s*if\s*\(c\.company\s*===\s*'MHL'\)\s*\{\s*reviewLinkElem\.href\s*=\s*'https:\/\/g\.page\/r\/CRkVPWjmECaEEAI\/review';\s*\}\s*else\s*\{\s*reviewLinkElem\.href\s*=\s*'https:\/\/g\.page\/r\/CXyrHfNQMLB8EAI\/review';\s*\}\s*\}/;

const regex2 = /const\s+reviewLinkElem\s*=\s*document\.getElementById\('google-review-link'\);\s*if\s*\(reviewLinkElem\)\s*\{\s*\/\/[^\n]*\s*const\s+isMHL\s*=\s*\(state\.formData\.id\s*&&\s*state\.formData\.id\.includes\('MHL'\)\);\s*if\s*\(isMHL\)\s*\{\s*reviewLinkElem\.href\s*=\s*'https:\/\/g\.page\/r\/CRkVPWjmECaEEAI\/review';\s*\}\s*else\s*\{\s*reviewLinkElem\.href\s*=\s*'https:\/\/g\.page\/r\/CXyrHfNQMLB8EAI\/review';\s*\}\s*\}/;

const newLogic1 = `const reviewGfs = document.getElementById('google-review-link-gfs');
                    const reviewMhl = document.getElementById('google-review-link-mhl');
                    if (reviewGfs && reviewMhl) {
                        if (c.company === 'MHL') {
                            reviewMhl.style.display = 'block';
                        } else {
                            reviewGfs.style.display = 'block';
                        }
                    }`;

const newLogic2 = `const reviewGfs = document.getElementById('google-review-link-gfs');
    const reviewMhl = document.getElementById('google-review-link-mhl');
    if (reviewGfs && reviewMhl) {
        // Double check display state based on ID directly before showing
        const isMHL = (state.formData.id && state.formData.id.includes('MHL'));
        if (isMHL) {
            reviewMhl.style.display = 'block';
            reviewGfs.style.display = 'none';
        } else {
            reviewGfs.style.display = 'block';
            reviewMhl.style.display = 'none';
        }
    }`;

let r1 = false;
let r2 = false;

if (regex1.test(content)) {
    content = content.replace(regex1, newLogic1);
    r1 = true;
} else {
    console.log("regex1 failed");
}

if (regex2.test(content)) {
    content = content.replace(regex2, newLogic2);
    r2 = true;
} else {
    console.log("regex2 failed");
}

if (r1 && r2) {
    fs.writeFileSync('app.js', content);
    console.log("Success app.js replaced with regex");
}
