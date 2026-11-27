// Usage: node .claude/scripts/keep-eol.cjs <original file> <edited file>
// Rewrites the edited file so lines unchanged from the original keep their
// exact line endings; inserted lines take the ending of the original line
// before them. GitHub holds some files (admin/app.js) with mixed CRLF/LF, and
// editors normalise them, which would turn a small edit into a whole-file diff.
// Typical use: git show HEAD:app.js > /tmp/orig.js && node .claude/scripts/keep-eol.cjs /tmp/orig.js app.js
// Uses a longest-common-subsequence line diff, so runs of blank lines align.
const fs = require('fs');
const orig = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const mine = fs.readFileSync(process.argv[3], 'utf8').replace(/\r\n/g, '\n').split('\n');
const a = orig.map(l => l.replace(/\r$/, ''));
const b = mine;
const n = a.length, m = b.length;
const lcs = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
  lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
}
const out = [];
let i = 0, j = 0, lastEol = (orig[0] || '').endsWith('\r') ? '\r' : '';
while (i < n || j < m) {
  if (i < n && j < m && a[i] === b[j]) { out.push(orig[i]); lastEol = orig[i].endsWith('\r') ? '\r' : ''; i++; j++; }
  else if (j < m && (i >= n || lcs[i][j + 1] >= lcs[i + 1][j])) { out.push(b[j] + (j === m - 1 ? '' : lastEol)); j++; }
  else { i++; }
}
fs.writeFileSync(process.argv[3], out.join('\n'));
