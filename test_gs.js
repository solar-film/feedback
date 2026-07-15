
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
      "Reward Eligible",
      "Admin Comment",
      "Sales Comment",
      "Technician Comment"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#eef3f8");
  }
  
  try {
    var data = JSON.parse(e.postData.contents);
    
    // ตรวจสอบว่าเป็นการส่งอัปเดตสถานะหรือไม่
    if (data.action === "updateStatus") {
      var logSheetName = "GFS_Status_Log";
      var logSheet = doc.getSheetByName(logSheetName);
      if (!logSheet) {
        logSheet = doc.insertSheet(logSheetName);
        var logHeaders = ["ID", "Status", "Timestamp"];
        logSheet.appendRow(logHeaders);
        logSheet.getRange(1, 1, 1, logHeaders.length).setFontWeight("bold").setBackground("#eef3f8");
      }
      logSheet.appendRow([data.id || "", data.status || "", new Date()]);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Status updated successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ตรวจสอบว่าเป็นการส่งอัปเดตการกดรีวิว Google Maps หรือไม่
    if (data.action === "updateReviewStatus") {
      var fbSheet = doc.getSheetByName(sheetName);
      if (fbSheet) {
        var dataRange = fbSheet.getDataRange();
        var values = dataRange.getValues();
        for (var i = 1; i < values.length; i++) {
          if (values[i][0] === data.id) {
            fbSheet.getRange(i + 1, 16).setValue("Yes"); // Column P
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Review status updated successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
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
    var adminComment = data.teamFeedback ? data.teamFeedback.adminComment : "";
    var salesComment = data.teamFeedback ? data.teamFeedback.salesComment : "";
    var techComment = data.teamFeedback ? data.teamFeedback.technicianComment : "";
    
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
      rewardEligible,
      adminComment,
      salesComment,
      techComment
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
  var logRows = getSheetData("GFS_Status_Log");
  
  if (!dataRows) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "ไม่พบชีต Data" })).setMimeType(ContentService.MimeType.JSON);
  
  // แปลง GFS_Status_Log เป็น dictionary เพื่อดึงสถานะล่าสุด
  var statusLogDict = {};
  if (logRows) {
    for (var i = 0; i < logRows.length; i++) {
      var lId = logRows[i]["ID"] || "";
      if (lId) {
        statusLogDict[lId] = logRows[i]["Status"] || "Unsent";
      }
    }
  }
  
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
            admin: f["Admin Comment"] || "", 
            sales: f["Sales Comment"] || "", 
            tech: f["Technician Comment"] || "" 
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
    var sentStatus = statusLogDict[id] || "Unsent";
    var status = feedback ? "Completed" : sentStatus;
    
    return {
      id: id,
      company: r["Company"] || r["บริษัท"] || r["_col_9"] || "-",
      name: r["Name"] || r["ชื่อผู้ติดต่อ"] || r["ชื่อลูกค้า"] || "",
      phone: r["Phone"] || r["เบอร์โทรศัพท์"] || r["เบอร์ติดต่อ"] || "",
      lineAt: r["Line@"] || r["LINE"] || r["Line @"] || "-",
      siteType: r["_col_16"] || r["SiteType"] || r["ประเภทหน้างาน"] || r["สถานที่"] || "",
      installDate: r["InstallDate"] || r["วันที่ติดตั้ง"] || "",
      filmModel: r["FilmModel"] || r["รุ่นฟิล์ม"] || r["รุ่นฟิล์ม / พื้นที่ติดตั้ง"] || "",
      sales: r["Sales"] || r["เซลล์ผู้ดูแล"] || r["ฝ่ายขาย"] || "-",
      tech: r["Tech"] || r["ช่างติดตั้ง"] || r["ทีมช่าง"] || "-",
      adminName: r["_col_17"] || r["Admin"] || r["แอดมิน"] || "-",
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
