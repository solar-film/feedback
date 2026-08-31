// Goodfilm Care Quest / Customer Feedback API
// วางโค้ดนี้แทน Code.gs เดิมใน Google Apps Script ที่ผูกกับ Google Sheet

function getAdminPassword() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || '';
}
var FEEDBACK_SHEET = 'GFS_Care_Quest';
var STATUS_SHEET = 'GFS_Status_Log';
var GIFT_SHEET = 'Gift';
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
    if (action === 'getCustomer') return handleGetCustomer(params.id);
    if (action === 'getAllCustomers') return handleGetAllCustomers();

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
      'updateStatus',
      'updateGiftStatus',
      'deleteGiftStatus',
      'getAllCustomersDetailed',
      'savePresentationOverride'
    ];

    var adminPassword = getAdminPassword();
    if (protectedActions.indexOf(action) !== -1 && (!adminPassword || data.password !== adminPassword)) {
      return jsonResponse({ status: 'error', message: 'Unauthorized: Invalid Password' });
    }

    if (action === 'getAllCustomersDetailed') return handleGetAllCustomersDetailed();
    if (action === 'updateStatus') return updateStatus(data);
    if (action === 'updateGiftStatus') return updateGiftStatus(data);
    if (action === 'deleteGiftStatus') return deleteGiftStatus(data.id);
    if (action === 'savePresentationOverride') return savePresentationOverride(data);
    if (action === 'updateReviewStatus') return updateReviewStatus(data.id);

    // ไม่มี action คือการส่งแบบประเมินจากหน้าลูกค้า
    return saveFeedback(data);
  } catch (error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
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

function getSheetData(sheetName) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return sheet ? [] : null;

  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var timezone = getSpreadsheet().getSpreadsheetTimeZone();
  var rows = [];

  for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
    var row = {};
    for (var columnIndex = 0; columnIndex < headers.length; columnIndex++) {
      var value = values[rowIndex][columnIndex];
      if (value instanceof Date) {
        value = Utilities.formatDate(value, timezone, 'dd/MM/yyyy HH:mm:ss');
      }
      row[headers[columnIndex]] = value;
      row['_col_' + columnIndex] = value;
    }
    rows.push(row);
  }
  return rows;
}

function findSheetRowById(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var targetId = getText(id);
  for (var index = 0; index < values.length; index++) {
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
  var sheet = ensureSheet(STATUS_SHEET, ['ID', 'Status', 'Timestamp']);
  sheet.appendRow([data.id || '', data.status || '', new Date()]);
  return jsonResponse({ status: 'success', message: 'Status updated successfully' });
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
  var headers = ['Customer ID', 'Admin', 'Sales', 'Technician', 'Worksite Type', 'Updated At'];
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

  return sheet;
}

function normalisePresentationOverride(value) {
  return getText(value).replace(/\s+/g, ' ');
}

function savePresentationOverride(data) {
  var id = getText(data.id);
  if (!id) return jsonResponse({ status: 'error', message: 'ไม่พบ Customer ID' });

  var input = data.presentationOverrides || {};
  var overrides = {
    admin: normalisePresentationOverride(input.admin),
    sales: normalisePresentationOverride(input.sales),
    tech: normalisePresentationOverride(input.tech),
    worksiteType: normalisePresentationOverride(input.worksiteType)
  };
  var hasOverride = overrides.admin || overrides.sales || overrides.tech || overrides.worksiteType;
  var sheet = ensurePresentationOverridesSheet();
  var row = findSheetRowById(sheet, id);

  // เมื่อรีเซ็ตครบทุกช่อง ลบแถว override เพื่อกลับไปใช้ข้อมูลจากชีต Data ทั้งหมด
  if (!hasOverride) {
    if (row) sheet.deleteRow(row);
    return jsonResponse({ status: 'success', message: 'Presentation overrides reset successfully' });
  }

  var rowData = [id, overrides.admin, overrides.sales, overrides.tech, overrides.worksiteType, new Date()];
  if (row) {
    sheet.getRange(row, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return jsonResponse({ status: 'success', message: 'Presentation override saved successfully' });
}

function getPresentationOverridesById() {
  // Run the lightweight schema upgrade before reading values from this sheet.
  ensurePresentationOverridesSheet();
  var rows = getSheetData(PRESENTATION_OVERRIDES_SHEET);
  var result = {};
  if (!rows) return result;

  for (var index = 0; index < rows.length; index++) {
    var row = rows[index];
    var id = getFirstText([row['Customer ID'], row['ID'], row['รหัสลูกค้า']]);
    if (!id) continue;

    // Presentation Overrides is always the first source for these four values.
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
      worksiteType: worksiteType || previous.worksiteType || ''
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

function getStatusLogTimestamp(row) {
  return getFirstText([
    row['Timestamp'],
    row['วันที่/เวลาส่งลิงก์'],
    row['วันที่ส่งลิงก์'],
    row['วันที่เวลา'],
    row['_col_2']
  ]);
}

function buildStatusDataById(rows) {
  var result = {};
  if (!rows) return result;

  for (var index = 0; index < rows.length; index++) {
    var row = rows[index];
    var id = getFirstText([row['ID'], row['รหัสลูกค้า'], row['รหัส ID']]);
    if (!id) continue;

    // GFS_Status_Log is append-only. Keep its latest status and the timestamp
    // of the latest event where the survey link was sent.
    var previous = result[id] || {};
    var status = getFirstText([row['Status'], row['สถานะ']]) || previous.status || 'Unsent';
    var timestamp = getStatusLogTimestamp(row);
    result[id] = {
      status: status,
      linkSentAt: isSurveyLinkSentStatus(status) && timestamp
        ? timestamp
        : (previous.linkSentAt || '')
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

function mapCustomer(row, feedbackById, statusDataById, giftById, overridesById) {
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
    filmModel: getFirstText([row['_col_33'], row['รุ่นฟิล์มที่ติดตั้ง'], row['FilmModel']]) || '-',
    sales: getFirstText([row['Sales'], row['เซลล์ผู้ดูแล'], row['ฝ่ายขาย']]) || '-',
    tech: getFirstText([row['Tech'], row['ช่างติดตั้ง'], row['ทีมช่าง']]) || '-',
    adminName: getFirstText([row['_col_17'], row['Admin'], row['แอดมิน']]) || '-',
    // Col O มี index 14 เพราะระบบนับ index จาก 0
    jobType: getFirstText([row['_col_14'], row['ประเภทหน้างาน'], row['JobType'], row['ประเภทงาน']]) || '-',
    bill: getFirstText([row['_col_30'], row['Bill'], row['เลขที่บิล']]) || '-',
    status: status,
    linkSentAt: statusData.linkSentAt || '',
    feedback: feedback,
    giftData: giftById[id] || null,
    presentationOverrides: overridesById[id] || null,
    addressFromData: getFirstText([row['_col_16'], row['Address'], row['ที่อยู่']]),
    filterDate: getText(row['_col_26']) || ''
  };
}

function handleGetAllCustomersDetailed() {
  var dataRows = getSheetData('Data');
  if (!dataRows) return jsonResponse({ status: 'error', message: 'ไม่พบชีต Data' });

  var feedbackById = buildFeedbackById(getSheetData(FEEDBACK_SHEET));
  var statusDataById = buildStatusDataById(getSheetData(STATUS_SHEET));
  var giftById = buildGiftById(getSheetData(GIFT_SHEET));
  var overridesById = getPresentationOverridesById();
  var customers = [];

  for (var index = 0; index < dataRows.length; index++) {
    customers.push(mapCustomer(dataRows[index], feedbackById, statusDataById, giftById, overridesById));
  }

  return jsonResponse({
    status: 'success',
    presentationOverridesEnabled: true,
    data: customers
  });
}

function handleGetCustomer(id) {
  var rows = getSheetData('Data');
  if (!rows) return jsonResponse({ status: 'error', message: 'ไม่พบชีต Data' });

  var requestedId = getText(id);
  for (var index = 0; index < rows.length; index++) {
    if (getCustomerId(rows[index]) !== requestedId) continue;

    var row = rows[index];
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
  var rows = getSheetData('Data');
  if (!rows) return jsonResponse({ status: 'error', message: 'ไม่พบชีต Data' });

  var customers = [];
  for (var index = 0; index < rows.length; index++) {
    customers.push({
      id: getCustomerId(rows[index]),
      name: getFirstText([rows[index]['Name'], rows[index]['ชื่อผู้ติดต่อ'], rows[index]['ชื่อลูกค้า']])
    });
  }
  return jsonResponse({ status: 'success', data: customers });
}
