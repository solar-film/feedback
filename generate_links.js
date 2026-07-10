/**
 * Goodfilm Care Quest - Standalone Customer Link Generator Script
 * 
 * วิธีใช้งาน:
 * 1. ติดตั้ง Node.js ลงในเครื่องคอมพิวเตอร์ของคุณ
 * 2. กรอกลิงก์ Google Apps Script Web App ของคุณลงในตัวแปร APPS_SCRIPT_URL ด้านล่าง
 * 3. รันสคริปต์นี้ใน Terminal ด้วยคำสั่ง:
 *    node generate_links.js
 * 4. สคริปต์จะดึงข้อมูลลูกค้าจากชีต Data และสร้างผลลัพธ์เป็นไฟล์ `customer_survey_links.txt`
 */

const fs = require('fs');
const http = require('http');
const https = require('https');

// ==========================================
// ⚙️ ตั้งค่าข้อมูลเชื่อมต่อหลังบ้านตรงนี้ค่ะ
// ==========================================
const APPS_SCRIPT_URL = ""; // ป้อน Web App URL (ลงท้ายด้วย /exec) ที่ได้จาก Google Apps Script
const BASE_SURVEY_URL = "http://localhost:8080/"; // หรือแทนที่ด้วยโดเมนจริงของคุณเมื่ออัปโหลดขึ้นเซิร์ฟเวอร์

if (!APPS_SCRIPT_URL) {
    console.error("❌ กรุณาป้อนลิงก์ APPS_SCRIPT_URL ในไฟล์ generate_links.js ก่อนรันสคริปต์นะคะ");
    process.exit(1);
}

console.log("⏳ กำลังเริ่มเชื่อมต่อเพื่อดึงรายชื่อลูกค้าจากชีต Data บน Google Sheet...");

const fetchUrl = `${APPS_SCRIPT_URL}?action=getAllCustomers`;

// ตัวช่วยส่งคำขอแบบ GET ติดตาม Redirect (302) ของ Google Apps Script
function getJSON(url, callback) {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
            // เดินหน้าตามลิงก์ Redirect
            getJSON(response.headers.location, callback);
            return;
        }

        let body = '';
        response.on('data', (chunk) => body += chunk);
        response.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                callback(null, parsed);
            } catch (err) {
                callback(new Error("การอ่านข้อมูล JSON ล้มเหลว: " + err.message));
            }
        });
    }).on('error', (err) => {
        callback(err);
    });
}

getJSON(fetchUrl, (error, response) => {
    if (error) {
        console.error("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ:", error.message);
        return;
    }

    if (response.status !== 'success' || !response.data) {
        console.error("❌ ดึงข้อมูลล้มเหลว:", response.message || "ไม่ทราบสาเหตุ");
        return;
    }

    const customers = response.data;
    if (customers.length === 0) {
        console.log("ℹ️ ไม่พบรายชื่อลูกค้าใด ๆ ในชีต Data");
        return;
    }

    console.log(`\n🎉 ดึงรายชื่อลูกค้าสำเร็จทั้งหมด ${customers.length} คน!`);
    console.log("⏳ กำลังเริ่มแปลงรหัสเป็นลิงก์สั้นเฉพาะบุคคล...");

    let textContent = "=========================================================\n";
    textContent += "   รายชื่อลิงก์ประเมินความพึงพอใจ Goodfilm Care Quest\n";
    textContent += `   ดึงข้อมูล ณ วันที่: ${new Date().toLocaleString('th-TH')}\n`;
    textContent += "=========================================================\n\n";

    customers.forEach((c, idx) => {
        const shortUrl = `${BASE_SURVEY_URL}?id=${encodeURIComponent(c.id)}`;
        textContent += `${idx + 1}. ลูกค้า: ${c.name} (รหัสสัญญา: ${c.id})\n`;
        textContent += `   🔗 ลิงก์ย่อ: ${shortUrl}\n`;
        textContent += "---------------------------------------------------------\n";
    });

    const outputFilename = "customer_survey_links.txt";
    fs.writeFile(outputFilename, textContent, 'utf8', (err) => {
        if (err) {
            console.error("❌ เกิดข้อผิดพลาดในการบันทึกไฟล์:", err.message);
            return;
        }
        console.log(`\n✅ บันทึกรายชื่อลิงก์เสร็จสิ้นลงในไฟล์: ${outputFilename}`);
        console.log("คุณสามารถเปิดไฟล์นี้เพื่อคัดลอกลิงก์ส่งให้ลูกค้าได้ทันทีเลยค่ะ!");
    });
});
