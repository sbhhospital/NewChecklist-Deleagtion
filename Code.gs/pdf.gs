function generatePendingTaskPDF() {
  // Spreadsheet IDs
  var mainSpreadsheetId = '1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0';
  var pdfFolderId = '1j11hxe8vLvePP1j43GnxnxmnhJxq5DuB';
  
  // Open spreadsheets
  var mainSpreadsheet = SpreadsheetApp.openById(mainSpreadsheetId);
  var pendingTaskSheet = mainSpreadsheet.getSheetByName('Pending Task PDF');
  var checklistSheet = mainSpreadsheet.getSheetByName('Checklist');
  
  // Get all data from Checklist sheet
  // E=Name, F=Task Descriptions, G=Task Start Date, K=Actual
  var checklistData = checklistSheet.getRange('E2:K' + checklistSheet.getLastRow()).getValues();
  
  // Current timestamp
  var currentTimestamp = new Date();
  
  // Collect all pending tasks (without grouping by person)
  var allPendingTasks = [];
  var uniqueDescriptions = {}; // To track unique task descriptions
  
  // Process all rows in Checklist
  for (var j = 0; j < checklistData.length; j++) {
    var taskName = checklistData[j][0]; // Column E (Name)
    var taskDescription = checklistData[j][1]; // Column F (Task Descriptions)
    var taskStartDate = checklistData[j][2]; // Column G (Task Start Date)
    var actual = checklistData[j][6]; // Column K (Actual)
    
    // Check conditions: Task Start Date not null AND Actual is null (Pending)
    if (taskStartDate !== '' && taskStartDate !== null &&
        (actual === '' || actual === null) &&
        taskName !== '' && taskName !== null) {
      
      // Check for unique task description to avoid duplicates
      var uniqueKey = taskName + '|' + taskDescription;
      if (!uniqueDescriptions[uniqueKey]) {
        allPendingTasks.push({
          name: taskName,
          description: taskDescription,
          startDate: taskStartDate,
          timestamp: currentTimestamp
        });
        uniqueDescriptions[uniqueKey] = true;
      }
    }
  }
  
  // Generate PDF if there are pending tasks
  if (allPendingTasks.length > 0) {
    var pdfUrl = createPendingTaskPDF(allPendingTasks, pdfFolderId, currentTimestamp);
    
    // Update PDF link (Column B) and Timestamp (Column A) in first row
    // You can modify this to update specific rows if needed
    pendingTaskSheet.getRange(2, 2).setValue(pdfUrl); // Column B, Row 2
    pendingTaskSheet.getRange(2, 1).setValue(currentTimestamp); // Column A, Row 2
    
    Logger.log('PDF generated successfully: ' + pdfUrl);
    Logger.log('Total pending tasks: ' + allPendingTasks.length);
  } else {
    Logger.log('No pending tasks found');
  }
  
  SpreadsheetApp.flush();
  Logger.log('PDF generation completed!');
}

function createPendingTaskPDF(allPendingTasks, folderId, timestamp) {
  // Create temporary Google Doc
  var fileName = 'Pending_Tasks_Report_' + Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  var tempDoc = DocumentApp.create(fileName);
  var docId = tempDoc.getId();
  var docBody = tempDoc.getBody();
  docBody.clear();
  
  // Add title and header
  var title = docBody.appendParagraph('PENDING TASKS REPORT');
  title.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  title.setBold(true);
  
  docBody.appendParagraph('');
  
  var summaryPara = docBody.appendParagraph(
    'Generated: ' + Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm:ss') + '\n' +
    'Total Pending Tasks: ' + allPendingTasks.length
  );
  summaryPara.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
  
  docBody.appendHorizontalRule();
  docBody.appendParagraph('');
  
  // Create single table with all pending tasks
  var table = docBody.appendTable();
  var headerRow = table.appendTableRow();
  
  // Table headers: S.No., Timestamp, Name, Task Description, Status
  var headerCell1 = headerRow.appendTableCell('S.No.');
  var headerCell2 = headerRow.appendTableCell('Timestamp');
  var headerCell3 = headerRow.appendTableCell('Name');
  var headerCell4 = headerRow.appendTableCell('Task Description');
  var headerCell5 = headerRow.appendTableCell('Status');
  
  // Style header row
  headerCell1.setBackgroundColor('#4CAF50').setWidth(40);
  headerCell2.setBackgroundColor('#4CAF50').setWidth(110);
  headerCell3.setBackgroundColor('#4CAF50').setWidth(80);
  headerCell4.setBackgroundColor('#4CAF50').setWidth(240);
  headerCell5.setBackgroundColor('#4CAF50').setWidth(60);
  
  // Make header text white and bold
  var headerCells = [headerCell1, headerCell2, headerCell3, headerCell4, headerCell5];
  for (var h = 0; h < headerCells.length; h++) {
    headerCells[h].getChild(0).asText().setForegroundColor('#FFFFFF').setBold(true);
  }
  
  // Add all pending tasks rows
  for (var j = 0; j < allPendingTasks.length; j++) {
    var task = allPendingTasks[j];
    var dataRow = table.appendTableRow();
    
    // S.No.
    dataRow.appendTableCell((j + 1).toString());
    
    // Timestamp
    var timestampFormatted = Utilities.formatDate(task.timestamp, Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm:ss');
    dataRow.appendTableCell(timestampFormatted);
    
    // Name
    dataRow.appendTableCell(task.name.toString());
    
    // Task Description
    dataRow.appendTableCell(task.description.toString());
    
    // Status (Always "Pending")
    var statusCell = dataRow.appendTableCell('Pending');
    statusCell.setBackgroundColor('#FFF3CD');
    statusCell.getChild(0).asText().setForegroundColor('#856404').setBold(true);
  }
  
  // Add footer
  docBody.appendParagraph('');
  docBody.appendParagraph('');
  var footer = docBody.appendParagraph('This report was automatically generated from Checklist data.');
  footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  var footerStyle = {};
  footerStyle[DocumentApp.Attribute.FONT_SIZE] = 8;
  footerStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = '#888888';
  footerStyle[DocumentApp.Attribute.ITALIC] = true;
  footer.setAttributes(footerStyle);
  
  tempDoc.saveAndClose();
  
  // Convert to PDF
  var docFile = DriveApp.getFileById(docId);
  var pdfBlob = docFile.getAs('application/pdf');
  pdfBlob.setName(fileName + '.pdf');
  
  // Save PDF to folder
  var folder = DriveApp.getFolderById(folderId);
  
  // Delete old PDFs with similar names (keeps folder clean)
  var searchPattern = 'Pending_Tasks_Report_';
  var existingFiles = folder.getFiles();
  while (existingFiles.hasNext()) {
    var file = existingFiles.next();
    if (file.getName().indexOf(searchPattern) === 0) {
      file.setTrashed(true);
    }
  }
  
  var pdfFile = folder.createFile(pdfBlob);
  
  // Delete temporary doc
  docFile.setTrashed(true);
  
  // Return PDF URL
  return pdfFile.getUrl();
}

// Preview function to check pending tasks before generating PDF
function previewPendingTasks() {
  var mainSpreadsheetId = '1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0';
  
  var mainSpreadsheet = SpreadsheetApp.openById(mainSpreadsheetId);
  var checklistSheet = mainSpreadsheet.getSheetByName('Checklist');
  
  var checklistData = checklistSheet.getRange('E2:K' + checklistSheet.getLastRow()).getValues();
  
  Logger.log('=== PENDING TASKS PREVIEW ===');
  Logger.log('Conditions: Task Start Date NOT NULL & Actual IS NULL');
  Logger.log('');
  
  var pendingTasks = [];
  var uniqueDescriptions = {};
  
  for (var j = 0; j < checklistData.length; j++) {
    var taskName = checklistData[j][0]; // Column E
    var taskDescription = checklistData[j][1]; // Column F
    var taskStartDate = checklistData[j][2]; // Column G
    var actual = checklistData[j][6]; // Column K
    
    if (taskStartDate !== '' && taskStartDate !== null &&
        (actual === '' || actual === null) &&
        taskName !== '' && taskName !== null) {
      
      var uniqueKey = taskName + '|' + taskDescription;
      if (!uniqueDescriptions[uniqueKey]) {
        var startDate = taskStartDate instanceof Date ? 
          Utilities.formatDate(taskStartDate, Session.getScriptTimeZone(), 'dd-MM-yyyy') : 
          taskStartDate;
        
        pendingTasks.push({
          name: taskName,
          description: taskDescription,
          startDate: startDate
        });
        uniqueDescriptions[uniqueKey] = true;
      }
    }
  }
  
  Logger.log('Total Pending Tasks Found: ' + pendingTasks.length);
  Logger.log('');
  
  for (var k = 0; k < pendingTasks.length; k++) {
    Logger.log((k+1) + '. ' + pendingTasks[k].name + ' | ' + pendingTasks[k].description + ' | Start: ' + pendingTasks[k].startDate);
  }
}