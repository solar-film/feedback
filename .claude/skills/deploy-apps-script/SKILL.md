---
name: deploy-apps-script
description: Deploy Code.gs from this repo to the live Apps Script project Feeback_Care_Quest without changing the web app URL. Use when พี่ออย asks to deploy, publish, or update the backend / Apps Script / Code.gs.
---

# Deploy Code.gs to Apps Script

The site calls one fixed web app URL:
`https://script.google.com/macros/s/AKfycbx6KYO_vGxUN11eZO7u-QU7OFcZr_VMfAodv2mvj2YXlSdGSV83J6IDYwp4nYH5DHhYyA/exec`
It belongs to deployment "V.x" of project **Feeback_Care_Quest**
(`https://script.google.com/home/projects/1VedFywWrl1IdogcWh7mFGM7ni8Anhlh7aQOkbrg9NBdIvX_9kzqYC-XN/edit`).
Always edit that deployment with a new version; never create a new deployment, which would change the URL.

## Steps

1. Run the tests first: `node --test tests/*.cjs`. All must pass.
2. Open the project in the built-in browser. If a sign-in page appears, ask พี่ออย to sign in; never type credentials.
3. Before replacing anything, hash what is in the editor and compare it with the code you expect is live (the previous deploy). If it differs, someone edited it online: stop and show พี่ออย the difference.
   ```js
   const t = monaco.editor.getModels()[0].getValue().replace(/\r/g,'');
   [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(x=>x.toString(16).padStart(2,'0')).join('')
   ```
4. Insert the new code with `javascript_tool`: embed the file as ``String.raw`...` `` (Code.gs must contain no backticks or `${`), check its SHA-256 against `node -e` on the local file, then `model.pushEditOperations([], [{range: model.getFullModelRange(), text: code}], () => null)`. Fetching from a localhost server is blocked by the page.
5. Click the editor, press Ctrl+S, wait, re-hash to confirm the saved text.
6. Deploy menu (การทำให้ใช้งานได้) → จัดการการทำให้ใช้งานได้ (click by coordinates; the menuitem ref does not open it). Wait for the dialog to load; if it spins for over ~15 s, cancel and reload the page.
7. Check the URL in the dialog matches the one above. Click the pencil (แก้ไข), open the version combobox, choose the option found by `find("เวอร์ชันใหม่")`. Do not press Escape (it closes the whole dialog). Update the description to the next V number, then click การทำให้ใช้งานได้ and confirm "อัปเดตการทำให้ใช้งานได้เรียบร้อยแล้ว" with the new version number.
8. Smoke-test only read-only GETs with curl: plain ping, `action=getPresentationData`, `action=getAllCustomers` (do not print names), `action=getCustomer&id=<real id>`. Write curl output to the scratchpad, not /tmp (Git Bash and Node disagree about /tmp). Ask พี่ออย to open the admin page to check login-protected parts.
9. Record the new version in `DESIGN.md` (ประวัติ) and in memory.

Front-end files (index.html, app.js, admin/*) are served from GitHub `solar-film/feedback`; pushing there is a separate step that needs พี่ออย's OK.
