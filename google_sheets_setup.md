# คู่มือการตั้งค่า Google Sheet สำหรับ Goodfilm Care Quest

เพื่อบันทึกข้อมูลแบบสอบถามจากเว็บแอปพลิเคชันเข้าสู่ Google Sheet ที่คุณระบุ:
📄 **[https://docs.google.com/spreadsheets/d/1IRU1ZjQIUbpBmz_MAzVtXdQQ93eQbJNJO9nC7fGvAKs](https://docs.google.com/spreadsheets/d/1IRU1ZjQIUbpBmz_MAzVtXdQQ93eQbJNJO9nC7fGvAKs/edit?gid=0#gid=0)**

โปรดทำตามขั้นตอนการตั้งค่า **Google Apps Script** ด้านล่างนี้ค่ะ:

---

## 🛠️ ขั้นตอนการติดตั้ง Apps Script

1. เปิดเบราว์เซอร์ไปที่ Google Sheet ของคุณ
2. ที่เมนูด้านบน เลือก **ส่วนขยาย (Extensions)** -> **Apps Script**
3. ลบโค้ดเดิมทั้งหมดในไฟล์ `รหัส.gs` (หรือ `Code.gs`) ออก
4. คัดลอกโค้ดด้านล่างนี้ไปวางแทนที่:

```javascript
function doPost(e) {
  var sheetName = "GFS_Care_Quest";
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName(sheetName);
  
  // สร้างชีตใหม่หากยังไม่มีชีตชื่อ GFS_Care_Quest
  if (!sheet) {
    sheet = doc.insertSheet(sheetName);
    var headers = [
      "ID",
      "Timestamp",
      "ผลลัพธ์ของฟิล์ม",
      "Admin Score",
      "Admin Tags",
      "Sales Score",
      "Sales Tags",
      "Technician Score",
      "Technician Tags",
      "MVP Team",
      "Customer Comment",
      "Overall Mood",
      "Need Follow-up",
      "Follow-up Issue",
      "Follow-up Details",
      "Google Review Clicked",
      "Reward Eligible"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#eef3f8");
  }
  
  try {
    var data = JSON.parse(e.postData.contents);
    
    // ดึงค่าแยกตามหมวดหมู่โครงสร้างเว็บแอปพลิเคชัน
    var id = data.id || "";
    
    var filmResult = data.filmResult ? data.filmResult.join(", ") : "";
    
    var adminScore = data.teamFeedback ? data.teamFeedback.adminScore : "";
    var adminTags = data.teamFeedback && data.teamFeedback.adminTags ? data.teamFeedback.adminTags.join(", ") : "";
    var salesScore = data.teamFeedback ? data.teamFeedback.salesScore : "";
    var salesTags = data.teamFeedback && data.teamFeedback.salesTags ? data.teamFeedback.salesTags.join(", ") : "";
    var techScore = data.teamFeedback ? data.teamFeedback.technicianScore : "";
    var techTags = data.teamFeedback && data.teamFeedback.technicianTags ? data.teamFeedback.technicianTags.join(", ") : "";
    var mvpTeam = data.teamFeedback ? data.teamFeedback.mvpTeam : "";
    var customerComment = data.teamFeedback ? data.teamFeedback.customerComment : "";
    
    var overallMood = data.overall ? data.overall.overallMood : "";
    var needFollowUp = data.overall ? data.overall.needFollowUp : "";
    var followUpIssue = data.overall && data.overall.followUpIssue ? data.overall.followUpIssue.join(", ") : "";
    var followUpDetails = data.overall ? data.overall.followUpDetails : "";
    var googleReviewClicked = data.overall ? data.overall.googleReviewClicked : "";
    var rewardEligible = data.overall ? data.overall.rewardEligible : "";
    
    var timestamp = new Date();
    
    var row = [
      id,
      timestamp,
      filmResult,
      adminScore,
      adminTags,
      salesScore,
      salesTags,
      techScore,
      techTags,
      mvpTeam,
      customerComment,
      overallMood,
      needFollowUp,
      followUpIssue,
      followUpDetails,
      googleReviewClicked,
      rewardEligible
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data saved successfully to sheet " + sheetName
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// -------------------------------------------------------------
// ฟังก์ชัน doGet สำหรับดึงข้อมูลกลับไปแสดงผลบน Admin Dashboard
// -------------------------------------------------------------
function doGet(e) {
  var action = e.parameter.action;
  
  if (action === "getAllCustomersDetailed") {
    return handleGetAllCustomersDetailed();
  } else if (action === "getCustomer") {
    return handleGetCustomer(e.parameter.id);
  } else if (action === "getAllCustomers") {
    return handleGetAllCustomers();
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "success", 
    message: "API is running properly. Please provide an action parameter." 
  })).setMimeType(ContentService.MimeType.JSON);
}

// ตัวช่วยอ่านข้อมูลจากชีต (รองรับทั้งภาษาไทยและอังกฤษ)
function getSheetData(sheetName) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName(sheetName);
  if (!sheet) return null;
  
  var data = sheet.getDataRange().getDisplayValues();
  if (data.length < 2) return [];
  
  var headers = data[0];
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
      obj["_col_" + j] = data[i][j]; // Store by raw column index (e.g., _col_9 for Col J)
    }
    rows.push(obj);
  }
  return rows;
}

// สร้าง API ตอบกลับตามโครงสร้างที่ Dashboard ต้องการ
function handleGetAllCustomersDetailed() {
  var dataRows = getSheetData("Data");
  var fbRows = getSheetData("GFS_Care_Quest");
  
  if (!dataRows) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "ไม่พบชีต Data" })).setMimeType(ContentService.MimeType.JSON);
  
  // แปลง GFS_Care_Quest เป็น dictionary (key = ID)
  var feedbackDict = {};
  if (fbRows) {
    for (var i = 0; i < fbRows.length; i++) {
      var f = fbRows[i];
      var fId = f["ID"] || "";
      if (fId) {
        feedbackDict[fId] = {
          timestamp: f["Timestamp"] || "",
          benefits: f["ผลลัพธ์ของฟิล์ม"] ? f["ผลลัพธ์ของฟิล์ม"].split(', ') : [],
          ratings: {
            admin: parseInt(f["Admin Score"]) || 0,
            sales: parseInt(f["Sales Score"]) || 0,
            tech: parseInt(f["Technician Score"]) || 0
          },
          details: {
            admin: f["Admin Tags"] ? f["Admin Tags"].split(', ') : [],
            sales: f["Sales Tags"] ? f["Sales Tags"].split(', ') : [],
            tech: f["Technician Tags"] ? f["Technician Tags"].split(', ') : []
          },
          comments: {
            admin: "", 
            sales: "", 
            tech: "" 
          },
          mvp: f["MVP Team"] || "",
          mvpComment: f["Customer Comment"] || "",
          overallMood: f["Overall Mood"] || "",
          supportNeeds: f["Follow-up Issue"] ? f["Follow-up Issue"].split(', ') : [],
          supportDetails: f["Follow-up Details"] || ""
        };
      }
    }
  }
  
  var result = dataRows.map(function(r) {
    var id = r["ID"] || r["รหัสลูกค้า"] || r["รหัส ID"] || "";
    var feedback = feedbackDict[id] || null;
    var status = feedback ? "Completed" : "Unsent";
    
    return {
      id: id,
      company: r["Company"] || r["บริษัท"] || r["_col_9"] || "-",
      name: r["Name"] || r["ชื่อผู้ติดต่อ"] || r["ชื่อลูกค้า"] || "",
      phone: r["Phone"] || r["เบอร์โทรศัพท์"] || r["เบอร์ติดต่อ"] || "",
      lineAt: r["Line@"] || r["LINE"] || r["Line @"] || "-",
      siteType: r["SiteType"] || r["ประเภทหน้างาน"] || "",
      installDate: r["InstallDate"] || r["วันที่ติดตั้ง"] || "",
      filmModel: r["FilmModel"] || r["รุ่นฟิล์ม"] || r["รุ่นฟิล์ม / พื้นที่ติดตั้ง"] || "",
      sales: r["Sales"] || r["เซลล์ผู้ดูแล"] || r["ฝ่ายขาย"] || "-",
      tech: r["Tech"] || r["ช่างติดตั้ง"] || "-",
      bill: r["Bill"] || r["เลขที่บิล"] || "-",
      status: status,
      feedback: feedback
    };
  });
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetCustomer(id) {
  var rows = getSheetData("Data");
  if (!rows) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "ไม่พบชีต Data" })).setMimeType(ContentService.MimeType.JSON);
  
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var rId = r["ID"] || r["รหัสลูกค้า"] || r["รหัส ID"] || "";
    if (rId.toString() === id.toString()) {
      var customer = {
        id: rId,
        company: r["Company"] || r["บริษัท"] || r["_col_9"] || "-",
        name: r["Name"] || r["ชื่อผู้ติดต่อ"] || r["ชื่อลูกค้า"] || "",
        phone: r["Phone"] || r["เบอร์โทรศัพท์"] || r["เบอร์ติดต่อ"] || "",
        siteType: r["SiteType"] || r["ประเภทหน้างาน"] || "",
        installDate: r["InstallDate"] || r["วันที่ติดตั้ง"] || "",
        filmModel: r["FilmModel"] || r["รุ่นฟิล์ม"] || r["รุ่นฟิล์ม / พื้นที่ติดตั้ง"] || ""
      };
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: customer })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "ไม่พบข้อมูลลูกค้ารหัสนี้" })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetAllCustomers() {
  var rows = getSheetData("Data");
  if (!rows) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "ไม่พบชีต Data" })).setMimeType(ContentService.MimeType.JSON);
  
  var result = rows.map(function(r) {
    return {
      id: r["ID"] || r["รหัสลูกค้า"] || r["รหัส ID"] || "",
      name: r["Name"] || r["ชื่อผู้ติดต่อ"] || r["ชื่อลูกค้า"] || ""
    };
  });
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result })).setMimeType(ContentService.MimeType.JSON);
}
```

5. กดไอคอน 💾 **บันทึกโครงการ (Save)** ด้านบน
6. กดปุ่ม **การทำให้ใช้งานได้ (Deploy)** -> **การทำให้ใช้งานได้ใหม่ (New deployment)**
7. เลือกประเภทการจัดจำหน่ายเป็น **เว็บแอป (Web app)**
8. ตั้งค่ารายละเอียดดังนี้:
   * **คำอธิบาย (Description)**: Goodfilm Care Quest API
   * **เรียกใช้งานในฐานะ (Execute as)**: ฉัน (Me - อีเมลของคุณ)
   * **ผู้ที่มีสิทธิ์เข้าถึง (Who has access)**:ทุกคน (Anyone) *(สำคัญมาก! เพื่อให้ฟรอนต์เอนด์สามารถส่ง POST เข้ามาบันทึกได้)*
9. กดปุ่ม **ทำให้ใช้งานได้ (Deploy)**
10. ระบบอาจขอสิทธิ์เข้าถึงบัญชี ให้กด **ให้สิทธิ์เข้าถึง (Authorize Access)** -> เลือกบัญชีจีเมลของคุณ -> กด **Advanced** -> กด **Go to ... (unsafe)** -> กด **Allow**
11. เมื่อเสร็จสิ้น คุณจะได้รับ **URL ของเว็บแอป (Web App URL)** เช่น `https://script.google.com/macros/s/.../exec`
12. คัดลอกลิงก์นั้นไว้

---

## 🔗 วิธีนำมาเชื่อมต่อกับหน้าเว็บแบบประเมิน

1. เปิดหน้าเว็บ Goodfilm Care Quest ขึ้นมา (เช่น `http://localhost:8080`)
2. คลิกปุ่มสีดำ **Admin Dashboard 📊** ที่มุมล่างซ้าย
3. ในกล่องหัวข้อ **"ตั้งค่าเชื่อมต่อ Google Sheets 📊"**
4. วางลิงก์ Web App URL ที่คุณคัดลอกมาลงในช่องกรอก
5. กดปิดหน้าต่างแดชบอร์ด ระบบจะบันทึกการตั้งค่าของคุณลงในเบราว์เซอร์อัตโนมัติ

**🎉 เสร็จเรียบร้อย!** เมื่อมีลูกค้าตอบแบบประเมินและกดส่ง ระบบจะส่งข้อมูลไปบันทึกลงในแท็บชีต `GFS_Care_Quest` ทันทีแบบ Real-time พร้อมแสดงผลลัพธ์ในตารางสวยงาม
