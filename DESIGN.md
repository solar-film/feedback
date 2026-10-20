# Goodfilm Care Quest — Design notes

ไฟล์นี้เก็บดีไซน์และข้อตกลงของระบบ อัปเดตทุกครั้งที่หน้าตาหรือ API เปลี่ยน

## หน้าจอ

| หน้า | ไฟล์ | หมายเหตุ |
|---|---|---|
| แบบประเมินลูกค้า | `index.html`, `app.js`, `style.css` | เปิดด้วย `/?id=<รหัสลูกค้า>` เป็นเกมทีละด่าน: intro → m2 ผลลัพธ์ฟิล์ม → m3 ให้คะแนนแอดมิน/เซลล์/ช่าง → m4 MVP → m5 อารมณ์รวมและเรื่องที่ต้องติดตาม → thank you (😍/😊 แสดงปุ่มรีวิว Google Maps แยก GFS/MHL) |
| แอดมิน | `admin/index.html`, `admin/app.js`, `admin/style.css` | แท็บ dashboard, database, kanban, gifts, presentation เปิดแท็บตรงได้ด้วย `?tab=` |
| นำเสนอสาธารณะ | `/admin/?presentation=public` | ไม่ต้องล็อกอิน แสดงเฉพาะข้อมูลที่ขึ้นสไลด์ |

## โทนสีและตัวอักษร

- สีหลัก `--primary #1b437c` (น้ำเงินเข้ม), `--secondary #005eb8`, พื้นอ่อน `--primary-light #eef3f8`
- หน้าลูกค้า: พื้น `#f0f8ff`/`#f4f7fa`, มุมโค้งใหญ่ 32px/14px, เงาบาง `rgba(27,67,124,.04)`, สีเน้น `#ffd700`
- หน้าแอดมิน: พื้น `#f8fafc`, เส้นขอบ `#e2e8f0`, สถานะ success `#10b981` / warning `#f59e0b` / danger `#ef4444` / info `#06b6d4`, มุมโค้ง 20/12/8px
- ฟอนต์ Kanit (หัวข้อ), Sarabun (เนื้อหา), Inter (ตัวเลข/อังกฤษ) จาก Google Fonts
- ไอคอน Lucide, กราฟ Chart.js 4.4.2
- หัวคอลัมน์ที่ระบบสร้างในชีต: ตัวหนา พื้น `#eef3f8`

## API (Apps Script `Code.gs`)

- GET `getCustomer`, `getAllCustomers`, `getPresentationData` (สาธารณะ)
- POST ไม่มี action = ส่งแบบประเมิน, `updateReviewStatus` (สาธารณะ)
- POST ต้องมี `password`: `checkPassword` (เช็กรหัสอย่างเดียว ไม่อ่านชีต ใช้ตอน login บนเครื่องที่มีข้อมูลเก็บไว้แล้ว), `getAllCustomersDetailed` (`fresh: true` = ข้ามแคช), `updateStatus`, `logLinkCopy`, `saveRemark`, `updateGiftStatus`, `deleteGiftStatus`, `savePresentationOverride`
- แคช: นำเสนอสาธารณะ 60 วินาที, ข้อมูลแอดมิน 30 วินาที ล้างทันทีเมื่อมีการบันทึกผ่าน API ค่าใหญ่แบ่งเป็นก้อนละ 30,000 ตัวอักษร
- ชีต `Data` อ่านหลายช่องตามตำแหน่งคอลัมน์ (`_col_9` บริษัท, `_col_14` ประเภทงาน, `_col_16` ที่อยู่, `_col_17` แอดมิน, `_col_26` วันที่กรอง, `_col_30` บิล, `_col_32`/`_col_33` ยี่ห้อ/รุ่นฟิล์ม, `_col_37` พื้นที่ติดตั้ง) ห้ามแทรก/ย้ายคอลัมน์ในชีตนี้

## ประวัติ

- 2026-10-20 login ครั้งถัดไปบนเครื่องเดิมไม่ต้องรอ Apps Script: เก็บ hash ของรหัสผ่าน (มี salt) ใน `admin_login_verifier` ถ้าเซิร์ฟเวอร์ปฏิเสธรหัสที่เก็บไว้ จะกลับไปหน้า login วัดจริง: คำขอเล็กๆ ไป Apps Script ใช้เวลา 3–13 วินาทีจากเบราว์เซอร์ แม้เซิร์ฟเวอร์ประมวลผลแค่ 0.3–0.8 วินาที
- 2026-10-20 Apps Script เวอร์ชัน 57 (deployment "V.17 - Quick password check at login"): login บนเครื่องที่เคยเข้าแล้วเช็กแค่รหัสผ่าน แล้วเปิดหน้าแอดมินด้วยข้อมูลที่เก็บไว้ทันที ข้อมูลล่าสุดโหลดตามมาเบื้องหลัง วัดจริงก่อนแก้: โหลดข้อมูลแอดมิน 10–17 วินาทีฝั่งเซิร์ฟเวอร์, ข้อมูลประมาณ 943,000 ตัวอักษร, ชีต Data 1,548×39 ผ่าน IMPORTRANGE
- 2026-10-20 Apps Script เวอร์ชัน 56 (deployment "V.16 - Faster backend and admin cache"): ปรับความเร็วหลังบ้าน ผลลัพธ์เหมือนเดิมทุกจุด
