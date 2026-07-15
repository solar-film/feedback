const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const targetStr = `<a id="google-review-link" href="https://g.page/r/CXyrHfNQMLB8EAI/review" target="_blank" onclick="clickGoogleMaps()" style="position: absolute; top: 42.5%; left: 16%; width: 68%; height: 6%; cursor: pointer; border-radius: 50px;"></a>`;

const replacementStr = `<a id="google-review-link-gfs" href="https://g.page/r/CXyrHfNQMLB8EAI/review" target="_blank" onclick="clickGoogleMaps()" style="display: none; position: absolute; top: 42.5%; left: 16%; width: 68%; height: 6%; cursor: pointer; border-radius: 50px;"></a>
                <a id="google-review-link-mhl" href="https://g.page/r/CRkVPWjmECaEEAI/review" target="_blank" onclick="clickGoogleMaps()" style="display: none; position: absolute; top: 42.5%; left: 16%; width: 68%; height: 6%; cursor: pointer; border-radius: 50px;"></a>`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync('index.html', content);
    console.log("Success");
} else {
    console.log("String not found. Cannot replace.");
}
