const fs = require('fs');

let md = fs.readFileSync('google_sheets_setup.md', 'utf8');

// 1. Add updateGiftStatus and deleteGiftStatus to doPost
const reviewStatusEnd = `      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Review status updated successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    }`;

const newGiftEndpoints = `
    // ตรวจสอบว่าเป็นการส่งอัปเดตสถานะของขวัญหรือไม่
    if (data.action === "updateGiftStatus") {
      var giftSheetName = "Gift";
      var giftSheet = doc.getSheetByName(giftSheetName);
      if (!giftSheet) {
        giftSheet = doc.insertSheet(giftSheetName);
        var giftHeaders = ["ID", "Status", "Address", "Gift", "Remark", "Timestamp"];
        giftSheet.appendRow(giftHeaders);
        giftSheet.getRange(1, 1, 1, giftHeaders.length).setFontWeight("bold").setBackground("#eef3f8");
      }
      
      var dataRange = giftSheet.getDataRange();
      var values = dataRange.getValues();
      var found = false;
      for (var i = 1; i < values.length; i++) {
        if (values[i][0] === data.id) {
          giftSheet.getRange(i + 1, 2).setValue(data.status);
          giftSheet.getRange(i + 1, 3).setValue(data.address);
          giftSheet.getRange(i + 1, 4).setValue(data.gift);
          giftSheet.getRange(i + 1, 5).setValue(data.remark);
          giftSheet.getRange(i + 1, 6).setValue(new Date());
          found = true;
          break;
        }
      }
      if (!found) {
        giftSheet.appendRow([data.id, data.status, data.address, data.gift, data.remark, new Date()]);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Gift status updated successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ตรวจสอบว่าเป็นการลบข้อมูลของขวัญหรือไม่
    if (data.action === "deleteGiftStatus") {
      var giftSheetName = "Gift";
      var giftSheet = doc.getSheetByName(giftSheetName);
      if (giftSheet) {
        var dataRange = giftSheet.getDataRange();
        var values = dataRange.getValues();
        for (var i = 1; i < values.length; i++) {
          if (values[i][0] === data.id) {
            giftSheet.deleteRow(i + 1);
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Gift status deleted successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    }
`;

if (md.indexOf('if (data.action === "updateGiftStatus")') === -1) {
    md = md.replace(reviewStatusEnd, reviewStatusEnd + newGiftEndpoints);
}

// 2. Update handleGetAllCustomersDetailed
const dataRowsDecl = `  var dataRows = getSheetData("Data");
  var fbRows = getSheetData("GFS_Care_Quest");
  var logRows = getSheetData("GFS_Status_Log");`;

const giftDictDecl = `
  var giftRows = getSheetData("Gift");
  var giftDict = {};
  if (giftRows) {
    for (var i = 0; i < giftRows.length; i++) {
      var gId = giftRows[i]["ID"] || "";
      if (gId) {
        giftDict[gId] = {
          status: giftRows[i]["Status"] || "",
          address: giftRows[i]["Address"] || "",
          gift: giftRows[i]["Gift"] || "",
          remark: giftRows[i]["Remark"] || "",
          timestamp: giftRows[i]["Timestamp"] || ""
        };
      }
    }
  }
`;

if (md.indexOf('var giftRows = getSheetData("Gift");') === -1) {
    md = md.replace(dataRowsDecl, dataRowsDecl + giftDictDecl);
}

// 3. Map giftData and addressFromData
const mapStart = `  var result = dataRows.map(function(r) {
    var id = r["ID"] || r["รหัสลูกค้า"] || r["รหัส ID"] || "";
    var feedback = feedbackDict[id] || null;
    var sentStatus = statusLogDict[id] || "Unsent";
    var status = feedback ? "Completed" : sentStatus;`;

const mapUpdates = `
    var giftData = giftDict[id] || null;
    var addressFromData = r["_col_16"] || ""; // Column Q
`;

if (md.indexOf('var giftData = giftDict[id] || null;') === -1) {
    md = md.replace(mapStart, mapStart + mapUpdates);
}

const returnObj = `      status: status,
      feedback: feedback
    };`;

const returnObjUpdates = `      status: status,
      feedback: feedback,
      giftData: giftData,
      addressFromData: addressFromData
    };`;

if (md.indexOf('giftData: giftData,') === -1) {
    md = md.replace(returnObj, returnObjUpdates);
}

fs.writeFileSync('google_sheets_setup.md', md);
console.log('Update GS done');
