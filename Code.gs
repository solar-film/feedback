// Goodfilm Care Quest / Customer Feedback API
// วางโค้ดนี้แทน Code.gs เดิมใน Google Apps Script ที่ผูกกับ Google Sheet

function getAdminPassword() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || '';
}
var FEEDBACK_SHEET = 'GFS_Care_Quest';
var STATUS_SHEET = 'GFS_Status_Log';
var GIFT_SHEET = 'Gift';
var REMARK_SHEET = 'remark';
var PRESENTATION_OVERRIDES_SHEET = 'Presentation Overrides';

var FEEDBACK_HEADERS = [
  'ID', 'Timestamp', 'ผลลัพธ์ของฟิล์ม', 'Admin Score', 'Admin Tags',
  'Sales Score', 'Sales Tags', 'Technician Score', 'Technician Tags',
  'MVP Team', 'Customer Comment', 'Overall Mood', 'Need Follow-up',
  'Follow-up Issue', 'Follow-up Details', 'Google Review Clicked',
  'Reward Eligible', 'Admin Comment', 'Sales Comment', 'Technician Comment'
];

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = params.action || '';

  try {
    if (action === 'getPresentationData') return handleGetPublicPresentationData();
    if (action === 'getCustomer') return handleGetCustomer(params.id);
    if (action === 'getAllCustomers') return handleGetAllCustomers();

    if (action) {
      return jsonResponse({ status: 'error', message: 'Unsupported GET action: ' + action + '. Admin requests require POST.' });
    }

    return jsonResponse({
      status: 'success',
      message: 'Goodfilm Care Quest API is running.'
    });
  } catch (error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

function doPost(e) {
  try {
    var body = e && e.postData && e.postData.contents;
    if (!body) return jsonResponse({ status: 'error', message: 'ไม่พบข้อมูลที่ส่งมา' });

    var data = JSON.parse(body);
    var action = data.action || '';
    var protectedActions = [
      'checkPassword',
      'updateStatus',
      'updateGiftStatus',
      'deleteGiftStatus',
      'getAllCustomersDetailed',
      'savePresentationOverride',
      'saveRemark',
      'logLinkCopy'
    ];

    var adminPassword = getAdminPassword();
    if (protectedActions.indexOf(action) !== -1 && (!adminPassword || data.password !== adminPassword)) {
      return jsonResponse({ status: 'error', message: 'Unauthorized: Invalid Password' });
    }

    // Login on a device with saved dashboard data only needs the password
    // check above; the data then loads in the background.
    if (action === 'checkPassword') return jsonResponse({ status: 'success' });
    if (action === 'getAllCustomersDetailed') return handleGetAllCustomersDetailed(data.fresh === true);

    // Every other POST may change a sheet, so the cached admin data is
    // retired once it finishes, whether it succeeded or not.
    try {
      if (action === 'updateStatus') return updateStatus(data);
      if (action === 'updateGiftStatus') return updateGiftStatus(data);
      if (action === 'deleteGiftStatus') return deleteGiftStatus(data.id);
      if (action === 'savePresentationOverride') return savePresentationOverride(data);
      if (action === 'saveRemark') return saveRemark(data);
      if (action === 'logLinkCopy') return logLinkCopy(data);
      if (action === 'updateReviewStatus') return updateReviewStatus(data.id);

      if (action) return jsonResponse({ status: 'error', message: 'Unsupported POST action: ' + action });

      // ไม่มี action คือการส่งแบบประเมินจากหน้าลูกค้า
      return saveFeedback(data);
    } finally {
      invalidateAdminData();
    }
  } catch (error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

// Each Spreadsheet service call is a round trip, so reuse the spreadsheet and
// its time zone for the rest of the current request.
var cachedSpreadsheet = null;
var cachedTimezone = null;

function getSpreadsheet() {
  if (!cachedSpreadsheet) cachedSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return cachedSpreadsheet;
}

function getSpreadsheetTimezone() {
  if (!cachedTimezone) cachedTimezone = getSpreadsheet().getSpreadsheetTimeZone();
  return cachedTimezone;
}

function ensureSheet(sheetName, headers) {
  var spreadsheet = getSpreadsheet();
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#eef3f8');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getText(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function getFirstText(values) {
  for (var i = 0; i < values.length; i++) {
    var value = getText(values[i]);
    if (value) return value;
  }
  return '';
}

function formatCellValue(value, timezone) {
  return value instanceof Date ? Utilities.formatDate(value, timezone, 'dd/MM/yyyy HH:mm:ss') : value;
}

function buildSheetRow(headers, values, timezone) {
  var row = {};
  for (var columnIndex = 0; columnIndex < headers.length; columnIndex++) {
    var value = formatCellValue(values[columnIndex], timezone);
    row[headers[columnIndex]] = value;
    row['_col_' + columnIndex] = value;
  }
  return row;
}

function getSheetData(sheetName) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return null;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var headers = values[0];
  var timezone = getSpreadsheetTimezone();
  var rows = [];
  for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
    rows.push(buildSheetRow(headers, values[rowIndex], timezone));
  }
  return rows;
}

// Reads only the columns whose header is listed in names. Lookups that need a
// couple of columns avoid transferring the whole, wide Data sheet. When a
// header appears twice, the right-most column wins, as it does in getSheetData.
function readSheetColumns(sheetName, names) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return null;

  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return { sheet: sheet, headers: [], rows: [] };

  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var columns = {};
  for (var column = 0; column < headers.length; column++) {
    var key = String(headers[column]);
    if (names.indexOf(key) !== -1) columns[key] = column;
  }

  // Read each wanted column on its own so columns far apart do not pull in
  // everything between them.
  var rowCount = lastRow - 1;
  var columnValues = {};
  for (var name in columns) {
    columnValues[name] = sheet.getRange(2, columns[name] + 1, rowCount, 1).getValues();
  }

  var timezone = getSpreadsheetTimezone();
  var rows = [];
  for (var rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    var row = { _rowNumber: rowIndex + 2 };
    for (var columnName in columnValues) {
      row[columnName] = formatCellValue(columnValues[columnName][rowIndex][0], timezone);
    }
    rows.push(row);
  }
  return { sheet: sheet, headers: headers, rows: rows };
}

function findSheetRowById(sheet, id, latest) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var targetId = getText(id);
  for (var offset = 0; offset < values.length; offset++) {
    var index = latest ? values.length - 1 - offset : offset;
    if (getText(values[index][0]) === targetId) return index + 2;
  }
  return 0;
}

function saveFeedback(data) {
  var sheet = ensureSheet(FEEDBACK_SHEET, FEEDBACK_HEADERS);
  var team = data.teamFeedback || {};
  var overall = data.overall || {};

  sheet.appendRow([
    data.id || '',
    new Date(),
    Array.isArray(data.filmResult) ? data.filmResult.join(', ') : '',
    team.adminScore || '',
    Array.isArray(team.adminTags) ? team.adminTags.join(', ') : '',
    team.salesScore || '',
    Array.isArray(team.salesTags) ? team.salesTags.join(', ') : '',
    team.technicianScore || '',
    Array.isArray(team.technicianTags) ? team.technicianTags.join(', ') : '',
    team.mvpTeam || '',
    team.customerComment || '',
    overall.overallMood || '',
    overall.needFollowUp || '',
    Array.isArray(overall.followUpIssue) ? overall.followUpIssue.join(', ') : '',
    overall.followUpDetails || '',
    overall.googleReviewClicked || '',
    overall.rewardEligible || '',
    team.adminComment || '',
    team.salesComment || '',
    team.technicianComment || ''
  ]);

  return jsonResponse({ status: 'success', message: 'Data saved successfully' });
}

function updateReviewStatus(id) {
  var sheet = getSpreadsheet().getSheetByName(FEEDBACK_SHEET);
  if (sheet) {
    var row = findSheetRowById(sheet, id);
    if (row) sheet.getRange(row, 16).setValue('Yes'); // Column P
  }
  return jsonResponse({ status: 'success', message: 'Review status updated successfully' });
}

function updateStatus(data) {
  var id = getText(data.id);
  var status = getText(data.status);
  if (!id) return jsonResponse({ status: 'error', message: 'ไม่พบรหัสลูกค้า' });
  if (status !== 'Sent' && status !== 'Unsent') {
    return jsonResponse({ status: 'error', message: 'สถานะการส่งลิงก์ไม่ถูกต้อง' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = ensureSheet(STATUS_SHEET, ['ID', 'Status', 'Timestamp']);
    sheet.appendRow([id, status, new Date()]);
    SpreadsheetApp.flush();
    var statusData = buildStatusDataById(getSheetData(STATUS_SHEET))[id];
    return jsonResponse({ status: 'success', statusData: statusData, message: 'Status updated successfully' });
  } finally {
    lock.releaseLock();
  }
}

function getNextCopyTimestampColumn(sheet, row, rowValues) {
  var lastColumn = Math.max(sheet.getLastColumn(), 3);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  // Read the customer's row once instead of one cell per Timestamp column.
  if (!rowValues || rowValues.length < lastColumn) rowValues = sheet.getRange(row, 1, 1, lastColumn).getValues()[0];
  var largestTimestampNumber = 0;

  for (var column = 0; column < headers.length; column++) {
    var match = String(headers[column] || '').trim().match(/^timestamp(\d*)$/i);
    if (!match) continue;

    var timestampNumber = match[1] ? Number(match[1]) : 1;
    largestTimestampNumber = Math.max(largestTimestampNumber, timestampNumber);

    // Reuse the first empty timestamp cell. This starts with Timestamp, then
    // Timestamp2, Timestamp3, and so on for later copies of the same link.
    if (!rowValues[column]) return column + 1;
  }

  var newColumn = lastColumn + 1;
  sheet.insertColumnAfter(lastColumn);
  sheet.getRange(1, newColumn)
    .setValue('Timestamp' + Math.max(largestTimestampNumber + 1, 2))
    .setFontWeight('bold')
    .setBackground('#eef3f8');
  return newColumn;
}

function logLinkCopy(data) {
  var id = getText(data.id);
  if (!id) return jsonResponse({ status: 'error', message: 'ไม่พบรหัสลูกค้า' });

  // A lock prevents two very close clicks from selecting the same Timestamp
  // column before either one has written its copy time.
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = ensureSheet(STATUS_SHEET, ['ID', 'Status', 'Timestamp']);
    var row = findSheetRowById(sheet, id, true);
    var copiedAt = new Date();
    var rowValues = row ? sheet.getRange(row, 1, 1, Math.max(sheet.getLastColumn(), 3)).getValues()[0] : null;

    if (!row || !isSurveyLinkSentStatus(rowValues[1])) {
      // Start a new sent event after a manual reset. Preserve the reset row
      // and its timestamp instead of treating it as a previous link copy.
      sheet.appendRow([id, 'Sent', copiedAt]);
    } else {
      var timestampColumn = getNextCopyTimestampColumn(sheet, row, rowValues);
      sheet.getRange(row, timestampColumn).setValue(copiedAt);
    }

    return jsonResponse({ status: 'success', message: 'Link copy logged successfully' });
  } finally {
    lock.releaseLock();
  }
}

function saveRemark(data) {
  var id = getText(data.id);
  var remark = getText(data.remark);
  if (!id || !remark) {
    return jsonResponse({ status: 'error', message: 'กรุณาระบุรหัสลูกค้าและหมายเหตุ' });
  }

  // Keep every note as a separate row so the remark sheet is a complete history.
  var sheet = ensureSheet(REMARK_SHEET, ['ID', 'Remark', 'Timestamp']);
  sheet.appendRow([id, remark, new Date()]);
  return jsonResponse({ status: 'success', message: 'Remark saved successfully' });
}

function updateGiftStatus(data) {
  var headers = ['ID', 'Timestamp', 'Status', 'ชื่อลูกค้า', 'เบอร์ติดต่อ', 'Address', 'Gift', 'Review Name'];
  var sheet = ensureSheet(GIFT_SHEET, headers);
  var rowData = [
    data.id || '',
    new Date(),
    data.status || '',
    data.customerName || '',
    data.phone || '',
    data.address || '',
    data.gift || '',
    data.remark || ''
  ];
  var row = findSheetRowById(sheet, data.id);
  if (row) {
    sheet.getRange(row, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return jsonResponse({ status: 'success', message: 'Gift status updated successfully' });
}

function deleteGiftStatus(id) {
  var sheet = getSpreadsheet().getSheetByName(GIFT_SHEET);
  if (sheet) {
    var row = findSheetRowById(sheet, id);
    if (row) sheet.deleteRow(row);
  }
  return jsonResponse({ status: 'success', message: 'Gift status deleted successfully' });
}

function normalisePresentationHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function findPresentationHeaderColumn(headers, aliases) {
  for (var column = 0; column < headers.length; column++) {
    if (aliases.indexOf(normalisePresentationHeader(headers[column])) !== -1) {
      return column + 1;
    }
  }
  return 0;
}

function ensurePresentationOverridesSheet() {
  var headers = ['Customer ID', 'Admin', 'Sales', 'Technician', 'Worksite Type', 'Updated At', 'Film Brand', 'Film Model'];
  var sheet = ensureSheet(PRESENTATION_OVERRIDES_SHEET, headers);
  var headerValues = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getDisplayValues()[0];
  var worksiteTypeColumn = findPresentationHeaderColumn(headerValues, [
    'worksite type', 'ประเภทหน้างาน', 'ประเภทงาน'
  ]);

  // Older versions had only five columns; column E was Updated At. Insert the
  // missing Worksite Type column before it so existing timestamps remain intact.
  if (!worksiteTypeColumn) {
    var updatedAtColumn = findPresentationHeaderColumn(headerValues, [
      'updated at', 'updatedat', 'แก้ไขล่าสุด'
    ]);
    var insertAt = updatedAtColumn || 5;
    sheet.insertColumnBefore(insertAt);
    sheet.getRange(1, insertAt).setValue('Worksite Type').setFontWeight('bold').setBackground('#eef3f8');

    // The legacy sheet could have an unlabelled timestamp column. Preserve it
    // as Updated At instead of allowing it to be read as a worksite type.
    if (!updatedAtColumn) {
      sheet.getRange(1, insertAt + 1).setValue('Updated At').setFontWeight('bold').setBackground('#eef3f8');
    }
  }

  // Film columns sit after every existing column. Their presence does not
  // depend on the Worksite Type insertion above, so the first header read is
  // enough and an up-to-date sheet needs no further reads.
  var missingFilmHeaders = ['Film Brand', 'Film Model'].filter(function (header) {
    return !findPresentationHeaderColumn(headerValues, [header.toLowerCase()]);
  });
  if (missingFilmHeaders.length) {
    var nextColumn = sheet.getLastColumn() + 1;
    missingFilmHeaders.forEach(function (header, offset) {
      sheet.getRange(1, nextColumn + offset).setValue(header).setFontWeight('bold').setBackground('#eef3f8');
    });
  }
  return sheet;
}

function normalisePresentationOverride(value) {
  return getText(value).replace(/\s+/g, ' ');
}

function savePresentationOverride(data) {
  var id = getText(data.id);
  if (!id) return jsonResponse({ status: 'error', message: 'ไม่พบ Customer ID' });

  var input = data.presentationOverrides || {};
  var existing = getPresentationOverridesById(false)[id] || {};
  var overrides = {
    admin: normalisePresentationOverride(input.admin),
    sales: normalisePresentationOverride(input.sales),
    tech: normalisePresentationOverride(input.tech),
    worksiteType: normalisePresentationOverride(input.worksiteType),
    filmBrand: normalisePresentationOverride(Object.prototype.hasOwnProperty.call(input, 'filmBrand') ? input.filmBrand : existing.filmBrand),
    filmModel: getText(Object.prototype.hasOwnProperty.call(input, 'filmModel') ? input.filmModel : existing.filmModel)
  };
  var hasOverride = overrides.admin || overrides.sales || overrides.tech || overrides.worksiteType || overrides.filmBrand || overrides.filmModel;
  var sheet = ensurePresentationOverridesSheet();
  var row = findSheetRowById(sheet, id);

  // เมื่อรีเซ็ตครบทุกช่อง ลบแถว override เพื่อกลับไปใช้ข้อมูลจากชีต Data ทั้งหมด
  if (!hasOverride) {
    if (row) sheet.deleteRow(row);
    try { CacheService.getScriptCache().remove('public-presentation-v2'); } catch (error) {}
    return jsonResponse({ status: 'success', presentationOverrides: overrides, message: 'Presentation overrides reset successfully' });
  }

  var rowData = [id, overrides.admin, overrides.sales, overrides.tech, overrides.worksiteType, new Date()];
  if (row) {
    sheet.getRange(row, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  var savedRow = row || sheet.getLastRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  sheet.getRange(savedRow, findPresentationHeaderColumn(headers, ['film brand'])).setValue(overrides.filmBrand);
  sheet.getRange(savedRow, findPresentationHeaderColumn(headers, ['film model'])).setValue(overrides.filmModel);
  try { CacheService.getScriptCache().remove('public-presentation-v2'); } catch (error) {}
  return jsonResponse({ status: 'success', presentationOverrides: overrides, message: 'Presentation override saved successfully' });
}

function getPresentationOverridesById(ensureSchema) {
  // The admin route may upgrade the schema. Public viewing remains read-only.
  if (ensureSchema !== false) ensurePresentationOverridesSheet();
  var rows = getSheetData(PRESENTATION_OVERRIDES_SHEET);
  var result = {};
  if (!rows) return result;

  for (var index = 0; index < rows.length; index++) {
    var row = rows[index];
    var id = getFirstText([row['Customer ID'], row['ID'], row['รหัสลูกค้า']]);
    if (!id) continue;

    // Presentation Overrides is the first source for the slide display values.
    // Support both the standard headers created by this script and Thai headers
    // when the sheet has been edited manually.
    var previous = result[id] || {};
    var admin = getFirstText([row['Admin'], row['แอดมิน'], row['ชื่อแอดมิน'], row['_col_1']]);
    var sales = getFirstText([row['Sales'], row['ฝ่ายขาย'], row['เซลล์'], row['_col_2']]);
    var tech = getFirstText([row['Technician'], row['Tech'], row['ทีมช่าง'], row['ช่าง'], row['_col_3']]);
    var worksiteType = getFirstText([
      row['Worksite Type'], row['ประเภทหน้างาน'], row['ประเภทงาน']
    ]);

    result[id] = {
      admin: admin || previous.admin || '',
      sales: sales || previous.sales || '',
      tech: tech || previous.tech || '',
      worksiteType: worksiteType || previous.worksiteType || '',
      filmBrand: getFirstText([row['Film Brand'], row['ยี่ห้อฟิล์ม']]) || previous.filmBrand || '',
      filmModel: getFirstText([row['Film Model'], row['รุ่นฟิล์มที่ติดตั้ง']]) || previous.filmModel || ''
    };
  }
  return result;
}

function buildFeedbackById(rows) {
  var result = {};
  if (!rows) return result;

  for (var index = 0; index < rows.length; index++) {
    var row = rows[index];
    var id = getText(row['ID']);
    if (!id) continue;

    result[id] = {
      timestamp: row['Timestamp'] || '',
      benefits: getText(row['ผลลัพธ์ของฟิล์ม']) ? String(row['ผลลัพธ์ของฟิล์ม']).split(', ') : [],
      ratings: {
        admin: parseFloat(row['Admin Score']) || 0,
        sales: parseFloat(row['Sales Score']) || 0,
        tech: parseFloat(row['Technician Score']) || 0
      },
      details: {
        admin: getText(row['Admin Tags']) ? String(row['Admin Tags']).split(', ') : [],
        sales: getText(row['Sales Tags']) ? String(row['Sales Tags']).split(', ') : [],
        tech: getText(row['Technician Tags']) ? String(row['Technician Tags']).split(', ') : []
      },
      comments: {
        admin: row['Admin Comment'] || '',
        sales: row['Sales Comment'] || '',
        tech: row['Technician Comment'] || ''
      },
      mvp: row['MVP Team'] || '',
      mvpComment: row['Customer Comment'] || '',
      overallMood: row['Overall Mood'] || '',
      supportNeeds: getText(row['Follow-up Issue']) ? String(row['Follow-up Issue']).split(', ') : [],
      supportDetails: row['Follow-up Details'] || '',
      googleReviewClicked: row['Google Review Clicked'] || '',
      rewardEligible: row['Reward Eligible'] || ''
    };
  }
  return result;
}

function isSurveyLinkSentStatus(status) {
  var normalizedStatus = getText(status).toLowerCase();
  return normalizedStatus === 'sent'
    || normalizedStatus === 'send'
    || normalizedStatus === 'ส่งแล้ว'
    || normalizedStatus === 'ส่งลิงก์แล้ว'
    || normalizedStatus === 'ส่งแบบประเมินแล้ว'
    || normalizedStatus === 'ส่งแบบประเมิน';
}

function getStatusLogTimestamps(row) {
  var timestampColumns = [
    row['Timestamp'],
    row['Timestamp2'],
    row['Timestamp3'],
    row['Timestamp4'],
    row['Timestamp5'],
    row['Timestamp6'],
    row['Timestamp7'],
    row['Timestamp8'],
    row['Timestamp9'],
    row['Timestamp10'],
    row['วันที่/เวลาส่งลิงก์'],
    row['วันที่ส่งลิงก์'],
    row['วันที่เวลา'],
    row['_col_2']
  ];
  var timestamps = [];

  for (var index = 0; index < timestampColumns.length; index++) {
    var timestamp = getText(timestampColumns[index]);
    if (timestamp && timestamps.indexOf(timestamp) === -1) timestamps.push(timestamp);
  }
  return timestamps;
}

function appendUniqueStatusLogTimestamps(existing, additions) {
  var allTimestamps = existing.slice();
  for (var index = 0; index < additions.length; index++) {
    if (allTimestamps.indexOf(additions[index]) === -1) allTimestamps.push(additions[index]);
  }
  return allTimestamps;
}

function buildStatusDataById(rows) {
  var result = {};
  if (!rows) return result;

  for (var index = 0; index < rows.length; index++) {
    var row = rows[index];
    var id = getFirstText([row['ID'], row['รหัสลูกค้า'], row['รหัส ID']]);
    if (!id) continue;

    // GFS_Status_Log is append-only. Keep the complete list of timestamps from
    // every sent-link event, including Timestamp2 through Timestamp10.
    var previous = result[id] || {};
    var status = getFirstText([row['Status'], row['สถานะ']]) || previous.status || 'Unsent';
    var previousTimestamps = previous.linkSentAtHistory || (previous.linkSentAt ? [previous.linkSentAt] : []);
    var rowTimestamps = isSurveyLinkSentStatus(status) ? getStatusLogTimestamps(row) : [];
    var linkSentAtHistory = appendUniqueStatusLogTimestamps(previousTimestamps, rowTimestamps);
    result[id] = {
      status: status,
      linkSentAt: linkSentAtHistory.length ? linkSentAtHistory[linkSentAtHistory.length - 1] : '',
      linkSentAtHistory: linkSentAtHistory
    };
  }
  return result;
}

function buildLatestRemarkById(rows) {
  var result = {};
  if (!rows) return result;

  // The remark sheet is append-only. Each later row is a newer edit, so the
  // table shows the latest remark while the sheet retains the full history.
  for (var index = 0; index < rows.length; index++) {
    var row = rows[index];
    var id = getFirstText([row['ID'], row['รหัสลูกค้า'], row['รหัส ID']]);
    if (!id) continue;
    result[id] = {
      remark: getFirstText([row['Remark'], row['หมายเหตุ'], row['_col_1']]),
      timestamp: getFirstText([row['Timestamp'], row['วันที่/เวลา'], row['_col_2']])
    };
  }
  return result;
}

function buildGiftById(rows) {
  var result = {};
  if (!rows) return result;

  for (var index = 0; index < rows.length; index++) {
    var row = rows[index];
    var id = getText(row['ID']);
    if (!id) continue;
    result[id] = {
      status: row['Status'] || '',
      customerName: row['ชื่อลูกค้า'] || '',
      phone: row['เบอร์ติดต่อ'] || '',
      address: row['Address'] || row['ที่อยู่สำหรับจัดส่ง'] || '',
      gift: row['Gift'] || row['ของรางวัล'] || '',
      remark: row['Review Name'] || row['ชื่อที่ใช้รีวิว'] || row['Remark'] || '',
      timestamp: row['Timestamp'] || ''
    };
  }
  return result;
}

function getCustomerId(row) {
  return getFirstText([row['ID'], row['รหัสลูกค้า'], row['รหัส ID']]);
}

function mapCustomer(row, feedbackById, statusDataById, giftById, remarksById, overridesById) {
  var id = getCustomerId(row);
  var feedback = feedbackById[id] || null;
  var statusData = statusDataById[id] || {};
  var status = feedback ? 'Completed' : (statusData.status || 'Unsent');

  return {
    id: id,
    company: getFirstText([row['Company'], row['บริษัท'], row['_col_9']]) || '-',
    name: getFirstText([row['Name'], row['ชื่อผู้ติดต่อ'], row['ชื่อลูกค้า']]),
    phone: getFirstText([row['Phone'], row['เบอร์โทรศัพท์'], row['เบอร์ติดต่อ']]),
    lineAt: getFirstText([row['_col_11'], row['Line@'], row['LINE'], row['Line Name']]) || '-',
    contactChannel: getText(row['_col_10']) || '-',
    siteType: getFirstText([row['_col_37'], row['พื้นที่ที่ติดตั้ง'], row['SiteType']]) || '-',
    installDate: getFirstText([row['InstallDate'], row['วันที่ติดตั้ง']]),
    filmBrand: getFirstText([row['_col_32'], row['ยี่ห้อฟิล์ม'], row['FilmBrand']]) || '-',
    filmModel: getFirstText([row['_col_33'], row['รุ่นฟิล์มที่ติดตั้ง'], row['FilmModel']]) || '-',
    sales: getFirstText([row['Sales'], row['เซลล์ผู้ดูแล'], row['ฝ่ายขาย']]) || '-',
    tech: getFirstText([row['Tech'], row['ช่างติดตั้ง'], row['ทีมช่าง']]) || '-',
    adminName: getFirstText([row['_col_17'], row['Admin'], row['แอดมิน']]) || '-',
    // Col O มี index 14 เพราะระบบนับ index จาก 0
    jobType: getFirstText([row['_col_14'], row['ประเภทหน้างาน'], row['JobType'], row['ประเภทงาน']]) || '-',
    bill: getFirstText([row['_col_30'], row['Bill'], row['เลขที่บิล']]) || '-',
    status: status,
    linkSentAt: statusData.linkSentAt || '',
    linkSentAtHistory: statusData.linkSentAtHistory || [],
    remarkData: remarksById[id] || null,
    feedback: feedback,
    giftData: giftById[id] || null,
    presentationOverrides: overridesById[id] || null,
    addressFromData: getFirstText([row['_col_16'], row['Address'], row['ที่อยู่']]),
    filterDate: getText(row['_col_26']) || ''
  };
}

var ADMIN_DATA_CACHE_KEY = 'admin-detailed-v1';
var ADMIN_DATA_CACHE_SECONDS = 30;
var ADMIN_DATA_VERSION_KEY = 'admin-detailed-version';
var CACHE_LONGEST_SECONDS = 21600;

// Cached admin data is stored under the current version. A write replaces the
// version, so a read that began before the write can never serve its result
// afterwards, even if it finishes storing it later.
function getAdminDataVersion(cache) {
  var version = cache.get(ADMIN_DATA_VERSION_KEY);
  if (!version) {
    version = String(Date.now()) + '-' + Math.floor(Math.random() * 1e6);
    cache.put(ADMIN_DATA_VERSION_KEY, version, CACHE_LONGEST_SECONDS);
  }
  return version;
}

function invalidateAdminData() {
  try {
    CacheService.getScriptCache().put(ADMIN_DATA_VERSION_KEY, String(Date.now()) + '-' + Math.floor(Math.random() * 1e6), CACHE_LONGEST_SECONDS);
  } catch (error) {
    // Without a cache the admin data is always read live.
  }
}

function handleGetAllCustomersDetailed(fresh) {
  // Writes made through this API appear at once. Edits typed directly into the
  // sheet appear within ADMIN_DATA_CACHE_SECONDS, or at once with fresh=true
  // (the refresh button).
  var cache = null;
  var cacheKey = '';
  try {
    cache = CacheService.getScriptCache();
    cacheKey = ADMIN_DATA_CACHE_KEY + ':' + getAdminDataVersion(cache);
    var cached = fresh ? null : readChunkedCache(cache, cacheKey);
    if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    cache = null;
  }

  var dataRows = getSheetData('Data');
  if (!dataRows) return jsonResponse({ status: 'error', message: 'ไม่พบชีต Data' });

  var feedbackById = buildFeedbackById(getSheetData(FEEDBACK_SHEET));
  var statusDataById = buildStatusDataById(getSheetData(STATUS_SHEET));
  var giftById = buildGiftById(getSheetData(GIFT_SHEET));
  var remarksById = buildLatestRemarkById(getSheetData(REMARK_SHEET));
  var overridesById = getPresentationOverridesById();
  var customers = [];

  for (var index = 0; index < dataRows.length; index++) {
    customers.push(mapCustomer(dataRows[index], feedbackById, statusDataById, giftById, remarksById, overridesById));
  }

  var serialized = JSON.stringify({
    status: 'success',
    presentationOverridesEnabled: true,
    presentationFilmOverridesEnabled: true,
    data: customers
  });
  try {
    if (cache) writeChunkedCache(cache, cacheKey, serialized, ADMIN_DATA_CACHE_SECONDS);
  } catch (error) {
    // Very large responses or cache errors fall back to the normal response.
  }
  return ContentService.createTextOutput(serialized).setMimeType(ContentService.MimeType.JSON);
}

var PUBLIC_PRESENTATION_CACHE_KEY = 'public-presentation-v2';
var PUBLIC_PRESENTATION_CACHE_SECONDS = 60;
// Apps Script limits each cache value to 100 KB. Thai text takes 3 bytes per
// character in UTF-8, so 30,000 characters keeps every chunk below 90 KB.
var CACHE_CHUNK_CHARACTERS = 30000;
var CACHE_MAX_CHUNKS = 60;

// The main key holds either a small payload directly or a pointer such as
// "chunks:3:<stamp>" to its pieces. Removing the main key, as
// savePresentationOverride does, therefore invalidates every chunk at once.
function readChunkedCache(cache, key) {
  var head = cache.get(key);
  if (!head || head.indexOf('chunks:') !== 0) return head;

  var parts = head.split(':');
  var count = Number(parts[1]);
  var keys = [];
  for (var index = 0; index < count; index++) keys.push(key + ':' + parts[2] + ':' + index);
  var chunks = cache.getAll(keys);
  var text = '';
  for (var chunkIndex = 0; chunkIndex < keys.length; chunkIndex++) {
    if (typeof chunks[keys[chunkIndex]] !== 'string') return null;
    text += chunks[keys[chunkIndex]];
  }
  return text;
}

function writeChunkedCache(cache, key, text, seconds) {
  if (text.length <= CACHE_CHUNK_CHARACTERS) {
    cache.put(key, text, seconds);
    return;
  }

  var count = Math.ceil(text.length / CACHE_CHUNK_CHARACTERS);
  if (count > CACHE_MAX_CHUNKS) return;
  var stamp = String(Date.now());
  var values = {};
  for (var index = 0; index < count; index++) {
    values[key + ':' + stamp + ':' + index] = text.substr(index * CACHE_CHUNK_CHARACTERS, CACHE_CHUNK_CHARACTERS);
  }
  // Chunks outlive the pointer slightly so a reader never sees the pointer
  // after its chunks have expired.
  cache.putAll(values, seconds + 30);
  cache.put(key, 'chunks:' + count + ':' + stamp, seconds);
}

// Public, read-only endpoint for the presentation screen. It intentionally
// returns only the fields rendered by a slide, never phone, gift, status-log,
// remarks, or other admin-only customer data.
function handleGetPublicPresentationData() {
  var cacheKey = PUBLIC_PRESENTATION_CACHE_KEY;
  var cache;
  try {
    cache = CacheService.getScriptCache();
    var cached = readChunkedCache(cache, cacheKey);
    if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    // Cache availability must never prevent a live read.
  }
  var dataRows = getSheetData('Data');
  if (!dataRows) return jsonResponse({ status: 'error', message: 'ไม่พบชีต Data' });

  var feedbackById = buildFeedbackById(getSheetData(FEEDBACK_SHEET));
  var overridesById = getPresentationOverridesById(false);
  var customers = [];

  for (var index = 0; index < dataRows.length; index++) {
    var row = dataRows[index];
    var id = getCustomerId(row);
    var feedback = feedbackById[id];
    if (!feedback) continue;

    customers.push({
      id: id,
      company: getFirstText([row['Company'], row['บริษัท'], row['_col_9']]) || '-',
      name: getFirstText([row['Name'], row['ชื่อผู้ติดต่อ'], row['ชื่อลูกค้า']]),
      installDate: getFirstText([row['InstallDate'], row['วันที่ติดตั้ง']]),
      filmBrand: getFirstText([row['_col_32'], row['ยี่ห้อฟิล์ม'], row['FilmBrand']]) || '-',
      filmModel: getFirstText([row['_col_33'], row['รุ่นฟิล์มที่ติดตั้ง'], row['FilmModel']]) || '-',
      sales: getFirstText([row['Sales'], row['เซลล์ผู้ดูแล'], row['ฝ่ายขาย']]) || '-',
      tech: getFirstText([row['Tech'], row['ช่างติดตั้ง'], row['ทีมช่าง']]) || '-',
      adminName: getFirstText([row['_col_17'], row['Admin'], row['แอดมิน']]) || '-',
      jobType: getFirstText([row['_col_14'], row['ประเภทหน้างาน'], row['JobType'], row['ประเภทงาน']]) || '-',
      addressFromData: getFirstText([row['_col_16'], row['Address'], row['ที่อยู่']]),
      feedback: feedback,
      presentationOverrides: overridesById[id] || null
    });
  }

  var payload = { status: 'success', data: customers, generatedAt: Date.now() };
  var serialized = JSON.stringify(payload);
  try {
    if (cache) writeChunkedCache(cache, cacheKey, serialized, PUBLIC_PRESENTATION_CACHE_SECONDS);
  } catch (error) {
    // Very large responses or cache errors fall back to the normal response.
  }
  return ContentService.createTextOutput(serialized).setMimeType(ContentService.MimeType.JSON);
}

var CUSTOMER_ID_HEADERS = ['ID', 'รหัสลูกค้า', 'รหัส ID'];
var CUSTOMER_NAME_HEADERS = ['Name', 'ชื่อผู้ติดต่อ', 'ชื่อลูกค้า'];

function handleGetCustomer(id) {
  // The survey page opens with this lookup. Find the row from the ID columns
  // first, then read only that row instead of the whole Data sheet.
  var table = readSheetColumns('Data', CUSTOMER_ID_HEADERS);
  if (!table) return jsonResponse({ status: 'error', message: 'ไม่พบชีต Data' });

  var requestedId = getText(id);
  for (var index = 0; index < table.rows.length; index++) {
    if (getCustomerId(table.rows[index]) !== requestedId) continue;

    var rowValues = table.sheet.getRange(table.rows[index]._rowNumber, 1, 1, table.headers.length).getValues()[0];
    var row = buildSheetRow(table.headers, rowValues, getSpreadsheetTimezone());
    return jsonResponse({
      status: 'success',
      data: {
        id: getCustomerId(row),
        company: getFirstText([row['Company'], row['บริษัท'], row['_col_9']]) || '-',
        name: getFirstText([row['Name'], row['ชื่อผู้ติดต่อ'], row['ชื่อลูกค้า']]),
        phone: getFirstText([row['Phone'], row['เบอร์โทรศัพท์'], row['เบอร์ติดต่อ']]),
        siteType: getFirstText([row['_col_14'], row['ประเภทหน้างาน'], row['JobType']]),
        installDate: getFirstText([row['InstallDate'], row['วันที่ติดตั้ง']]),
        filmModel: getFirstText([row['_col_33'], row['รุ่นฟิล์มที่ติดตั้ง'], row['FilmModel']])
      }
    });
  }
  return jsonResponse({ status: 'error', message: 'ไม่พบข้อมูลลูกค้ารหัสนี้' });
}

function handleGetAllCustomers() {
  var table = readSheetColumns('Data', CUSTOMER_ID_HEADERS.concat(CUSTOMER_NAME_HEADERS));
  if (!table) return jsonResponse({ status: 'error', message: 'ไม่พบชีต Data' });
  var rows = table.rows;

  var customers = [];
  for (var index = 0; index < rows.length; index++) {
    customers.push({
      id: getCustomerId(rows[index]),
      name: getFirstText([rows[index]['Name'], rows[index]['ชื่อผู้ติดต่อ'], rows[index]['ชื่อลูกค้า']])
    });
  }
  return jsonResponse({ status: 'success', data: customers });
}
