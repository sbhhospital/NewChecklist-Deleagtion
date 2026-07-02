function doGet(e) {
  if (!e) {
    e = { parameter: {} }; // Initialize e if undefined
  }
  try {
    var params = e.parameter;
    
    // Handle username lookup request
    if (params.username) {
      return fetchUserEmail(params.username);
    }
    
    // Existing functionality
    if (params.sheet && params.action === 'fetch') {
      return fetchSheetData(params.sheet);
    } else if (params.sheet) {
      return fetchSheetData(params.sheet);
    }
    
    return ContentService.createTextOutput("Google Apps Script is running.")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    console.error("Error in doGet:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Existing function in your AppScript - NO CHANGES NEEDED
function fetchUserEmail(username) {
  try {
    const ss = SpreadsheetApp.openById("1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0");
    const sheet = ss.getSheetByName("master");
    const data = sheet.getDataRange().getValues();
    
    // Find column indices (assuming headers are in row 1)
    const headers = data[0];
    const usernameColIndex = headers.findIndex(header => header === "Username" || header === "C");
    const emailColIndex = headers.findIndex(header => header === "Email" || header === "F");
    
    if (usernameColIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: "Username column not found" 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (emailColIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: "Email column not found" 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Search for username (skip header row)
    for (let i = 1; i < data.length; i++) {
      if (data[i][usernameColIndex] === username) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          email: data[i][emailColIndex] 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: "Username not found" 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}


function fetchSheetData(sheetName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    var range = sheet.getDataRange();
    var values = range.getValues();
    
    console.log("Fetching data from sheet: " + sheetName);
    console.log("Total rows found: " + values.length);
    
    var result = {
      table: {
        cols: [
          {label: "Timestamp", type: "string"},
          {label: "Task ID", type: "string"},
          {label: "Firm", type: "string"},
          {label: "Given By", type: "string"},
          {label: "Name", type: "string"},
          {label: "Task Description", type: "string"},
          {label: "Task Start Date", type: "string"}, // FIXED: Changed from "date" to "string"
          {label: "Freq", type: "string"},
          {label: "Enable Reminders", type: "string"},
          {label: "Require Attachment", type: "string"},
          {label: "Task End Date", type: "string"},  // Column K - Task End Date for DELEGATION
          {label: "Column L", type: "string"},
          {label: "Status", type: "string"},
          {label: "Remarks", type: "string"},
          {label: "Uploaded Image", type: "string"}
        ],
        rows: values.map(function(row, index) {
          if (index < 5) {
            console.log("Row " + index + " data:", JSON.stringify(row));
          }
          
          return {
            c: row.map(function(cell) {
              return {v: cell};
            })
          };
        })
      }
    };
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// UPDATED: Enhanced date conversion function to handle different date formats
function convertDateToGoogleSheets(dateValue) {
  try {
    console.log("Converting date value:", dateValue, "Type:", typeof dateValue);
    
    // If it's already a Date object, return it
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // If it's a timestamp number
    if (typeof dateValue === 'number') {
      return new Date(dateValue);
    }
    
    // If it's a string
    if (typeof dateValue === 'string' && dateValue.trim() !== '') {
      // Handle DD/MM/YYYY format
      if (dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const parts = dateValue.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        console.log("Converted DD/MM/YYYY:", dateValue, "to Date:", date);
        return date;
      }
      
      // Handle YYYY-MM-DD format (from HTML date input)
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(dateValue + 'T00:00:00');
        console.log("Converted YYYY-MM-DD:", dateValue, "to Date:", date);
        return date;
      }
      
      // Handle MM/DD/YYYY format
      if (dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          console.log("Converted MM/DD/YYYY:", dateValue, "to Date:", date);
          return date;
        }
      }
      
      // Try to parse as generic date
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        console.log("Converted generic date:", dateValue, "to Date:", parsed);
        return parsed;
      }
    }
    
    console.log("Could not convert date, returning original:", dateValue);
    return dateValue; // Return original if conversion fails
  } catch (error) {
    console.error("Error converting date:", error);
    return dateValue;
  }
}

// NEW: Function to format date as DD/MM/YYYY string for Google Sheets
function formatDateDDMMYYYY(date) {
  if (!date) return '';
  
  try {
    if (!(date instanceof Date)) {
      date = convertDateToGoogleSheets(date);
    }
    
    if (date instanceof Date && !isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return day + '/' + month + '/' + year;
    }
  } catch (error) {
    console.error("Error formatting date:", error);
  }
  
  return date; // Return original if formatting fails
}

function convertDDMMYYYYToDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return dateString;
  
  if (dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    var parts = dateString.split('/');
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  
  return dateString;
}

function doPost(e) {
  try {
    console.log("Received POST request with parameters:", JSON.stringify(e.parameter));
    var params = e.parameter;
    
    if (params.action === 'uploadFile') {
      var base64Data = params.base64Data;
      var fileName = params.fileName;
      var mimeType = params.mimeType;
      var folderId = params.folderId;
      
      if (!base64Data || !fileName || !mimeType || !folderId) {
        throw new Error("Missing required parameters for file upload");
      }
      
      var fileUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileUrl: fileUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (params.action === 'updateTaskData') {
      return updateTaskData(params);
    }
    
    if (params.action === 'updateSalesData') {
      return updateSalesData(params);
    }

    if (params.action === 'uploadProfilePhoto') {
  var result = uploadProfilePhoto(params);
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
    
    // NEW: Add updateAdminDone action handling
    if (params.action === 'updateAdminDone') {
      var result = updateAdminDone(params.sheetName, params.rowData);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // NEW: Handle login recording actions
    if (params.action === 'recordLogin') {
      var result = recordLogin(params.username, params.ip, params.browser, params.device);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (params.action === 'recordLogout') {
      var result = recordLogout(params.username);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (params.action === 'runDailyLoginCheck') {
      var result = runDailyLoginCheck();
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheetName = params.sheetName;
    var action = params.action || 'insert';
    if (action === 'add') action = 'insert';
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    if (action === 'insert') {
      var rowData;
      try {
        rowData = JSON.parse(params.rowData);
        console.log("Parsed row data:", JSON.stringify(rowData));
      } catch (parseError) {
        console.error("Error parsing rowData:", parseError);
        throw new Error("Invalid rowData format: " + parseError.message);
      }
      
      // UPDATED: Handle date formatting based on metadata
      var dateMetadata = null;
      var timestampColumn = null;
      var nextTargetDateColumn = null;
      
      try {
        if (params.dateMetadata) {
          dateMetadata = JSON.parse(params.dateMetadata);
          console.log("Date metadata received:", JSON.stringify(dateMetadata));
        }
        if (params.timestampColumn) {
          timestampColumn = parseInt(params.timestampColumn);
        }
        if (params.nextTargetDateColumn) {
          nextTargetDateColumn = parseInt(params.nextTargetDateColumn);
        }
      } catch (metaError) {
        console.log("No date metadata provided or error parsing:", metaError);
      }
      
      if (params.batchInsert === 'true' && Array.isArray(rowData)) {
        console.log("Processing batch insert for " + rowData.length + " tasks");
        
        // UPDATED: Date conversion added to batch insert
        var dataToInsert = rowData.map(task => {
          // Convert dates properly
          var convertedTimestamp = task.timestamp ? convertDDMMYYYYToDate(task.timestamp) : task.timestamp;
var convertedStartDate = task.startDate ? convertDDMMYYYYToDate(task.startDate) : task.startDate;
          
          console.log("Original startDate:", task.startDate);
          console.log("Converted startDate:", convertedStartDate);
          
          // Check if this is for DELEGATION sheet (one-time tasks)
          if (sheetName === "DELEGATION") {
            return [
              convertedTimestamp,
              task.taskId,
              task.firm,
              task.givenBy,
              task.name,
              task.description,
              convertedStartDate,
              task.freq,
              task.enableReminders,
              task.requireAttachment,
              task.endDate || ""  // Column K - Task End Date for one-time tasks
            ];
          } else {
            // For other department sheets, use the original format
            return [
              convertedTimestamp,
              task.taskId,
              task.firm,
              task.givenBy,
              task.name,
              task.description,
              convertedStartDate,
              task.freq,
              task.enableReminders,
              task.requireAttachment
            ];
          }
        });
        
        console.log("Prepared data for batch insertion:", JSON.stringify(dataToInsert));
        
        var lastRow = sheet.getLastRow();
        if (dataToInsert.length > 0) {
          sheet.getRange(lastRow + 1, 1, dataToInsert.length, dataToInsert[0].length)
               .setValues(dataToInsert);
          
          // ADDED: Format the date columns properly
          var startDateColumn = 7; // Column G (Task Start Date)
          var timestampColumn = 1; // Column A (Timestamp)
          
          // Format timestamp column (date only, no time)
          sheet.getRange(lastRow + 1, timestampColumn, dataToInsert.length, 1)
               .setNumberFormat('dd/mm/yyyy');
          
          // Format start date column
          sheet.getRange(lastRow + 1, startDateColumn, dataToInsert.length, 1)
               .setNumberFormat('dd/mm/yyyy');
          
          console.log("Successfully inserted " + dataToInsert.length + " rows starting at row " + (lastRow + 1));
        }
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true,
          message: "Batch insert completed successfully",
          rowsInserted: dataToInsert.length,
          totalRows: sheet.getLastRow(),
          sheetName: sheetName
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        console.log("Processing single row insert");
        console.log("Original row data:", JSON.stringify(rowData));
        
        if (!Array.isArray(rowData) || rowData.length === 0) {
          throw new Error("Invalid or empty row data array");
        }
        
        // UPDATED: Enhanced date conversion for single row insert
        var convertedRowData = rowData.map((value, index) => {
          console.log("Processing column " + index + " with value:", value);
          
          // Handle timestamp column (index 0)
          if (index === 0 && timestampColumn === 0) {
            var convertedDate = convertDateToGoogleSheets(value);
            console.log("Converted timestamp from", value, "to", convertedDate);
            return convertedDate;
          }
          
          // Handle next target date column (index 3 for DELEGATION DONE sheet)
          if (index === 3 && nextTargetDateColumn === 3) {
            if (value && value.trim() !== '') {
              var convertedDate = convertDateToGoogleSheets(value);
              console.log("Converted next target date from", value, "to", convertedDate);
              return convertedDate;
            }
            return value;
          }
          
          // Handle other date columns based on metadata
          if (dateMetadata && dateMetadata.columns && dateMetadata.columns[index]) {
            if (dateMetadata.columns[index].type === 'date') {
              var convertedDate = convertDateToGoogleSheets(value);
              console.log("Converted date column " + index + " from", value, "to", convertedDate);
              return convertedDate;
            }
          }
          
          return value;
        });
        
        console.log("Final converted row data:", JSON.stringify(convertedRowData));
        
        sheet.appendRow(convertedRowData);
        
        // UPDATED: Format the date columns for single row
        var lastRow = sheet.getLastRow();
        
        // Format timestamp column (Column A)
        if (timestampColumn === 0) {
          sheet.getRange(lastRow, 1).setNumberFormat('dd/mm/yyyy');
          console.log("Applied date format to timestamp column A at row", lastRow);
        }
        
        // Format next target date column (Column D)
        if (nextTargetDateColumn === 3) {
          sheet.getRange(lastRow, 4).setNumberFormat('dd/mm/yyyy');
          console.log("Applied date format to next target date column D at row", lastRow);
        }
        
        // Format other date columns based on metadata
        if (dateMetadata && dateMetadata.columns) {
          Object.keys(dateMetadata.columns).forEach(function(colIndex) {
            var colNum = parseInt(colIndex) + 1; // Convert to 1-based index
            if (dateMetadata.columns[colIndex].type === 'date') {
              sheet.getRange(lastRow, colNum).setNumberFormat('dd/mm/yyyy');
              console.log("Applied date format to column", colNum, "at row", lastRow);
            }
          });
        }
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true,
          message: "Single row added successfully",
          rowCount: sheet.getLastRow(),
          insertedAt: lastRow,
          formattedColumns: {
            timestamp: timestampColumn === 0,
            nextTargetDate: nextTargetDateColumn === 3
          }
        })).setMimeType(ContentService.MimeType.JSON);
      }
    } 
    else if (action === 'update') {
      var rowIndex = parseInt(params.rowIndex);
      var rowData = JSON.parse(params.rowData);
      
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index for update: " + rowIndex);
      }
      
      for (var i = 0; i < rowData.length; i++) {
        if (rowData[i] !== '') {
          // UPDATED: Enhanced date conversion during update
          var valueToSet = rowData[i];
          
          // Convert dates for specific columns
          if (i === 0 || i === 6) { // Timestamp or Start Date columns
            valueToSet = convertDateToGoogleSheets(rowData[i]);
          }
          
          var cell = sheet.getRange(rowIndex, i + 1);
          cell.setValue(valueToSet);
          
          // Format date columns
          if (i === 0) {
            cell.setNumberFormat('dd/mm/yyyy'); // Timestamp (date only)
          } else if (i === 6) {
            cell.setNumberFormat('dd/mm/yyyy');
          }
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        message: "Row updated successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    } 
    else if (action === 'processChecklist') {
      // NEW ACTION: Process checklist and generate tasks
      var result = processChecklistAndGenerateTasks();
      return ContentService.createTextOutput(JSON.stringify(result));
    } 
    
    else {
      throw new Error("Unknown action: " + action);
    }
  } catch (error) {
    console.error("Error in doPost:", error.message, error.stack);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to process request: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// NEW: Add this function to handle Admin Done updates
function updateAdminDone(sheetName, rowDataString) {
  try {
    console.log("updateAdminDone called with sheetName:", sheetName, "rowData:", rowDataString);
    
    var rowData = JSON.parse(rowDataString);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet '" + sheetName + "' not found");
    }
    
    var updatedCount = 0;
    
    // Process each item in the rowData array
    for (var i = 0; i < rowData.length; i++) {
      var item = rowData[i];
      var rowIndex = item.rowIndex;
      var adminDoneStatus = item.adminDoneStatus;
      
      if (!rowIndex || !adminDoneStatus) {
        console.log("Skipping item due to missing data: rowIndex=" + rowIndex + ", adminDoneStatus=" + adminDoneStatus);
        continue;
      }
      
      // Update Column P (index 16) with "Done" text
      sheet.getRange(rowIndex, 16).setValue(adminDoneStatus);
      
      console.log("Updated row " + rowIndex + " - Column P set to: " + adminDoneStatus);
      updatedCount++;
    }
    
    return {
      success: true,
      message: "Successfully updated " + updatedCount + " items as Admin Done"
    };
    
  } catch (error) {
    console.error("Error in updateAdminDone:", error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

function updateTaskData(params) {
  try {
    var sheetName = params.sheetName;
    var rowDataArray = JSON.parse(params.rowData);
    
    console.log("Processing task data update for sheet:", sheetName);
    console.log("Row data array:", JSON.stringify(rowDataArray));
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    var updateResults = [];
    
    rowDataArray.forEach(function(taskData, index) {
      console.log("Processing task " + (index + 1) + ":", JSON.stringify(taskData));
      
      var rowIndex = parseInt(taskData.rowIndex);
      
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index: " + taskData.rowIndex + " (must be >= 2)");
      }
      
      // Verify Task ID matches
      var currentTaskId = sheet.getRange(rowIndex, 2).getValue();
      if (currentTaskId.toString().trim() !== taskData.taskId.toString().trim()) {
        var correctRow = findRowByTaskId(sheet, taskData.taskId);
        if (correctRow > 0) {
          rowIndex = correctRow;
        } else {
          throw new Error("Task ID mismatch and could not find correct row for Task ID: " + taskData.taskId);
        }
      }
      
      // Prepare update details
      var rowUpdates = {
        rowIndex: rowIndex,
        taskId: taskData.taskId,
        updates: []
      };
      
      // Handle column K (Actual) update with proper timestamp formatting
  // Handle column K (Actual) update - store as dd/mm/yyyy string
if (taskData.actualDate) {
  var actualCell = sheet.getRange(rowIndex, 11);
  
  // Store the date string directly without converting to Date object
  actualCell.setValue(taskData.actualDate);
  
  rowUpdates.updates.push("Column K (Actual): " + taskData.actualDate);
}
      
      // Update other columns as before
      if (taskData.status) {
        sheet.getRange(rowIndex, 13).setValue(taskData.status);
        rowUpdates.updates.push("Column M (Status): " + taskData.status);
      }
      
      if (taskData.remarks) {
        sheet.getRange(rowIndex, 14).setValue(taskData.remarks);
        rowUpdates.updates.push("Column N (Remarks): " + taskData.remarks);
      }
      
      if (taskData.imageUrl) {
        sheet.getRange(rowIndex, 15).setValue(taskData.imageUrl);
        rowUpdates.updates.push("Column O (Image): " + taskData.imageUrl);
      }
      
      updateResults.push(rowUpdates);
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Task data updated successfully with timestamp",
      updatedRows: rowDataArray.length,
      updateDetails: updateResults
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error("Error updating task data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to update task data: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateSalesData(params) {
  try {
    var sheetName = params.sheetName;
    var rowDataArray = JSON.parse(params.rowData);
    
    console.log("Processing sales data update (marking as done) for sheet:", sheetName);
    console.log("Row data array:", JSON.stringify(rowDataArray));
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    var updateResults = [];
    
    rowDataArray.forEach(function(taskData, index) {
      console.log("Processing history task " + (index + 1) + " for marking as done:", JSON.stringify(taskData));
      
      var rowIndex = parseInt(taskData.rowIndex);
      
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index: " + taskData.rowIndex);
      }
      
      var currentTaskId = sheet.getRange(rowIndex, 2).getValue();
      console.log("Verifying Task ID for history item at row " + rowIndex + ":");
      console.log("  Current Task ID: '" + currentTaskId + "'");
      console.log("  Expected Task ID: '" + taskData.taskId + "'");
      
      if (currentTaskId.toString().trim() !== taskData.taskId.toString().trim()) {
        var correctRow = findRowByTaskId(sheet, taskData.taskId);
        if (correctRow > 0) {
          console.log("Found correct row for Task ID " + taskData.taskId + " at row " + correctRow);
          rowIndex = correctRow;
        } else {
          throw new Error("Task ID mismatch for: " + taskData.taskId);
        }
      }
      
      if (taskData.doneStatus) {
        console.log("Marking Task ID " + taskData.taskId + " as " + taskData.doneStatus + " at row " + rowIndex);
        sheet.getRange(rowIndex, 13).setValue(taskData.doneStatus);
      }
      
      updateResults.push({
        rowIndex: rowIndex,
        taskId: taskData.taskId,
        status: taskData.doneStatus
      });
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Sales data updated successfully",
      updatedRows: rowDataArray.length,
      updateDetails: updateResults
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error("Error updating sales data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to update sales data: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function findRowByTaskId(sheet, taskId) {
  try {
    var lastRow = sheet.getLastRow();
    console.log("Searching for Task ID '" + taskId + "' in " + lastRow + " rows");
    
    for (var i = 2; i <= lastRow; i++) {
      var cellValue = sheet.getRange(i, 2).getValue();
      if (cellValue && cellValue.toString().trim() === taskId.toString().trim()) {
        console.log("Found Task ID '" + taskId + "' at row " + i);
        return i;
      }
    }
    
    console.log("Task ID '" + taskId + "' not found in any row");
    return -1;
  } catch (error) {
    console.error("Error searching for Task ID:", error);
    return -1;
  }
}

function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
  try {
    console.log("Uploading file to Google Drive:");
    console.log("  File name: " + fileName);
    console.log("  MIME type: " + mimeType);
    console.log("  Folder ID: " + folderId);
    
    let fileData = base64Data;
    if (base64Data.indexOf('base64,') !== -1) {
      fileData = base64Data.split('base64,')[1];
    }
    
    const decoded = Utilities.base64Decode(fileData);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const folder = DriveApp.getFolderById(folderId);
    const file = folder.createFile(blob);
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
    console.log("File uploaded successfully. URL: " + fileUrl);
    
    return fileUrl;
  } catch (error) {
    console.error("Error uploading file: " + error.toString());
    return null;
  }
}

// Add this function to your Google Apps Script
function uploadProfilePhoto(params) {
  try {
    var base64Data = params.base64Data;
    var fileName = params.fileName;
    var mimeType = params.mimeType;
    var folderId = params.folderId;
    var username = params.username;
    
    if (!base64Data || !fileName || !mimeType || !folderId || !username) {
      throw new Error("Missing required parameters for profile photo upload");
    }
    
    // Upload file to Google Drive
    var fileUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId);
    
    if (!fileUrl) {
      throw new Error("Failed to upload file to Google Drive");
    }
    
    // Update WhatsApp sheet Column H with the file URL
    var ss = SpreadsheetApp.openById("1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0");
    var whatsappSheet = ss.getSheetByName("Whatsapp");
    
    if (!whatsappSheet) {
      throw new Error("WhatsApp sheet not found");
    }
    
    // Find the row with matching username in Column C
    var data = whatsappSheet.getDataRange().getValues();
    var rowToUpdate = -1;
    
    for (var i = 1; i < data.length; i++) { // Skip header row
      if (data[i][2] && data[i][2].toString().toLowerCase() === username.toLowerCase()) {
        rowToUpdate = i + 1; // Convert to 1-based index
        break;
      }
    }
    
    if (rowToUpdate === -1) {
      throw new Error("Username not found in WhatsApp sheet Column C");
    }
    
    // Update Column H (index 8) with the file URL
    whatsappSheet.getRange(rowToUpdate, 8).setValue(fileUrl);
    
    return {
      success: true,
      fileUrl: fileUrl,
      message: "Profile photo uploaded and WhatsApp sheet updated successfully"
    };
    
  } catch (error) {
    console.error("Error in uploadProfilePhoto:", error);
    return {
      success: false,
      error: error.toString()
    };
  }
}


function processChecklistAndGenerateTasks() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Get sheets
    var checklistSheet = ss.getSheetByName("Unique");
    var workingCalendarSheet = ss.getSheetByName("Working Day Calendar");
    
    if (!checklistSheet) {
      throw new Error("CHECKLIST sheet not found");
    }
    if (!workingCalendarSheet) {
      throw new Error("WORKING DAY CALENDAR sheet not found");
    }
    
    // Get checklist data
    var checklistData = checklistSheet.getDataRange().getValues();
    if (checklistData.length < 1) {
      throw new Error("Checklist sheet is empty");
    }
    
    // Get today's date in DD/MM/YYYY format
    var today = new Date();
    var todayString = Utilities.formatDate(today, Session.getScriptTimeZone(), "dd/MM/yyyy");
    
    // Get ALL working dates from column A of working calendar
    var calendarData = workingCalendarSheet.getDataRange().getValues();
    var workingDates = [];
    
    // Extract all working dates from column A (index 0) of working calendar
    for (var i = 1; i < calendarData.length; i++) {
      if (calendarData[i][0]) {
        var dateValue = calendarData[i][0];
        var formattedDate;
        if (dateValue instanceof Date) {
          formattedDate = Utilities.formatDate(dateValue, Session.getScriptTimeZone(), "dd/MM/yyyy");
        } else {
          // Try to parse if it's a string
          try {
            var parsedDate = new Date(dateValue);
            formattedDate = Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), "dd/MM/yyyy");
          } catch (e) {
            formattedDate = dateValue.toString();
          }
        }
        workingDates.push(formattedDate);
      }
    }
    
    // Check if today is a working day
    var isTodayWorkingDay = workingDates.includes(todayString);
    
    var tasksGenerated = 0;
    var processedItems = [];
    
    // Process each row in checklist for new tasks (skip header)
    for (var i = 2; i < checklistData.length; i++) {
      var row = checklistData[i];
      
      // Extract data from columns
      var department = row[2]; // Column C (index 2)
      var frequency = row[7]; // Column I (index 8) 
      var existingTaskId = row[1] || (i + 1); // Column B or fallback to row number
      var lastGeneratedDate = row[16]; // Column S (index 18) - Last generated date
      
      // Only process if department exists
      if (department) {
        // Get department sheet
        var departmentSheetName = department.toUpperCase();
        var departmentSheet = ss.getSheetByName("Checklist");
        
        if (!departmentSheet) {
          Logger.log("Department sheet not found: " + departmentSheetName);
          continue;
        }
        
        // Determine if we should generate task
        var shouldGenerateTask = false;
        var taskDueDate = "";
        
        // Only proceed if today is a working day
        if (isTodayWorkingDay) {
          // Check frequency and last generated date
          if (!lastGeneratedDate) {
            // If never generated before, generate today
            shouldGenerateTask = true;
            taskDueDate = todayString;
          } else {
            var lastDate = parseDate(lastGeneratedDate);
            if (!lastDate) continue; // Skip if can't parse date
            
            switch (frequency.toLowerCase()) {
              case 'daily':
                // Generate every working day
                // Check if we haven't already generated for today
                if (!isSameDate(today, lastDate)) {
                  shouldGenerateTask = true;
                  taskDueDate = todayString;
                }
                break;
                
              case 'weekly':
                // Generate if it's been 7+ days since last generation
                var daysDifference = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
                if (daysDifference >= 7) {
                  shouldGenerateTask = true;
                  taskDueDate = todayString;
                }
                break;
                
              case 'monthly':
                // Generate if it's a new month
                if (today.getMonth() !== lastDate.getMonth() || 
                    today.getFullYear() !== lastDate.getFullYear()) {
                  shouldGenerateTask = true;
                  taskDueDate = todayString;
                }
                break;
                
              case 'yearly':
                // Generate if it's a new year
                if (today.getFullYear() !== lastDate.getFullYear()) {
                  shouldGenerateTask = true;
                  taskDueDate = todayString;
                }
                break;
                
              default:
                // Unknown frequency - don't generate
                break;
            }
          }
        }
        
        if (shouldGenerateTask && taskDueDate) {
          // Prepare task data
          var taskData = [
            // row[0] || "", // Column A (Timestamp)
            new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            // existingTaskId, // Column B (Task ID)
            "",
            row[2] || "", // Column C (Department)
            row[3] || "", // Column D (Given By)
            row[4] || "", // Column E (Doer)
            row[5] || "", // Column G (Description)
            taskDueDate, // Column H (Due Date)
            row[7] || "", // Column I (Frequency)
            row[8] || "", // Column J (Enable Reminders)
            row[9] || "" // Column K (Require Attachment)
          ];
          
          // Add the task to department sheet
          departmentSheet.appendRow(taskData);
          
          // Update last generated date in CHECKLIST sheet (Column S)
          checklistSheet.getRange(i + 1, 17).setValue(taskDueDate);
          
          tasksGenerated++;
          
          processedItems.push({
            department: department,
            frequency: frequency,
            taskId: existingTaskId,
            dateGenerated: taskDueDate
          });
        }
      }
    }
    
    return {
      success: true,
      message: "Checklist processed successfully",
      tasksGenerated: tasksGenerated,
      processedItems: processedItems,
      isTodayWorkingDay: isTodayWorkingDay,
      todayDate: todayString
    };
    
  } catch (error) {
    Logger.log("Error in processChecklistAndGenerateTasks: " + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

function isDuplicateTaskExists(departmentSheet, taskId, dueDate) {
  try {
    var data = departmentSheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) { // Skip header row
      var rowTaskId = data[i][1]; // Column B (Task ID)
      var rowDueDate = data[i][6]; // Column H (Due Date)
      
      // Format the row due date if it's a Date object
      var formattedRowDueDate = rowDueDate;
      if (rowDueDate instanceof Date) {
        formattedRowDueDate = Utilities.formatDate(rowDueDate, Session.getScriptTimeZone(), "dd/MM/yyyy");
      }
      
      // Check if both task ID and due date match
      if (rowTaskId == taskId && formattedRowDueDate == dueDate) {
        return true; // Duplicate found
      }
    }
    
    return false; // No duplicate found
  } catch (error) {
    Logger.log("Error checking for duplicates: " + error.toString());
    return false; // If error, assume no duplicate to be safe
  }
}

function findNextWorkingDate(currentDate, workingDates) {
  try {
    var currentDateObj = parseDate(currentDate);
    if (!currentDateObj) return null;
    
    // Look ahead up to 30 days to find next working day
    for (var i = 1; i <= 30; i++) {
      var nextDate = new Date(currentDateObj);
      nextDate.setDate(nextDate.getDate() + i);
      
      var nextDateString = Utilities.formatDate(nextDate, Session.getScriptTimeZone(), "dd/MM/yyyy");
      
      if (workingDates.includes(nextDateString)) {
        return nextDateString;
      }
    }
    
    return null; // No working day found in next 30 days
  } catch (error) {
    Logger.log("Error finding next working date: " + error.toString());
    return null;
  }
}

// Helper function to parse date string in DD/MM/YYYY format
function parseDate(dateString) {
  try {
    if (!dateString) return null;
    if (dateString instanceof Date) return dateString;
    
    var parts = dateString.split('/');
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Helper function to compare dates (ignoring time)
function isSameDate(date1, date2) {
  return date1.getDate() === date2.getDate() && 
         date1.getMonth() === date2.getMonth() && 
         date1.getFullYear() === date2.getFullYear();
}

// Helper function to calculate next task date based on frequency
function calculateNextTaskDate(currentDate, frequency, workingDates) {
  var nextDate = new Date(currentDate);
  
  switch (frequency.toLowerCase()) {
    case 'daily':
      // Add 1 day and find next working day
      nextDate.setDate(nextDate.getDate() + 1);
      break;
      
    case 'weekly':
      // Add 7 days
      nextDate.setDate(nextDate.getDate() + 7);
      break;
      
    case 'monthly':
      // Add 1 month
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
      
    case 'quarterly':
      // Add 3 months
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
      
    case 'yearly':
      // Add 1 year
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
      
    default:
      // Default to daily if frequency not recognized
      nextDate.setDate(nextDate.getDate() + 1);
      break;
  }
  
  // Find the next available working day
  var maxAttempts = 365; // Prevent infinite loop
  var attempts = 0;
  
  while (attempts < maxAttempts) {
    var dateString = Utilities.formatDate(nextDate, Session.getScriptTimeZone(), "dd/MM/yyyy");
    
    if (workingDates.includes(dateString)) {
      return dateString;
    }
    
    // If not a working day, try the next day
    nextDate.setDate(nextDate.getDate() + 1);
    attempts++;
  }
  
  // If no working day found within a year, return the calculated date anyway
  return Utilities.formatDate(nextDate, Session.getScriptTimeZone(), "dd/MM/yyyy");
}

// TEST FUNCTION: Run this to test the checklist processing immediately
function testChecklistProcessing() {
  Logger.log("🧪 Starting test of checklist processing...");
  
  try {
    var result = processChecklistAndGenerateTasks();
    
    Logger.log("✅ Test completed successfully!");
    Logger.log("📊 Result: " + JSON.stringify(result, null, 2));
    
    if (result.success) {
      Logger.log("🎉 Tasks generated: " + result.tasksGenerated);
      Logger.log("🧹 SENT items cleared: " + result.clearedSentItems);
      Logger.log("📋 Processed items: " + result.processedItems.length);
      Logger.log("📅 Today's date: " + result.todayDate);
    } else {
      Logger.log("❌ Error: " + result.error);
    }
    
    return result;
  } catch (error) {
    Logger.log("💥 Test failed with error: " + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

// SETUP FUNCTION: Run this ONCE to create automatic daily trigger
function setupDailyTrigger() {
  try {
    // Delete existing triggers for checklist processing
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'dailyChecklistProcessor') {
        ScriptApp.deleteTrigger(triggers[i]);
        Logger.log("Deleted existing trigger");
      }
    }
    
    // Create new automatic daily trigger at 12:00 PM (to match your manual trigger setting)
    var trigger = ScriptApp.newTrigger('dailyChecklistProcessor')
      .timeBased()
      .everyDays(1)
      .atHour(12) // 12 PM (noon) - matches your 12pm to 1pm setting
      .create();
    
    Logger.log("✅ Automatic daily trigger created successfully!");
    Logger.log("⏰ Will run dailyChecklistProcessor every day at 9:00 AM");
    Logger.log("🆔 Trigger ID: " + trigger.getUniqueId());
    
    // Test run immediately
    Logger.log("🧪 Running test to verify functionality...");
    var result = processChecklistAndGenerateTasks();
    Logger.log("✅ Test completed: " + JSON.stringify(result));
    
    return {
      success: true,
      message: "✅ Automatic daily trigger set up successfully! Will run every day at 9:00 AM",
      triggerId: trigger.getUniqueId(),
      testResult: result
    };
    
  } catch (error) {
    Logger.log("❌ Error setting up daily trigger: " + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Daily trigger function
function dailyChecklistProcessor() {
  try {
    var result = processChecklistAndGenerateTasks();
    Logger.log("Daily checklist processing result: " + JSON.stringify(result));
    
    // Auto check daily logins and mark absents / deduct points
    var loginResult = runDailyLoginCheck();
    Logger.log("Daily login check result: " + JSON.stringify(loginResult));
    
    return {
      success: true,
      checklistResult: result,
      loginResult: loginResult
    };
  } catch (error) {
    Logger.log("Error in daily checklist processor: " + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}


function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

function doOptions(e) {
  var response = ContentService.createTextOutput('');
  return setCorsHeaders(response);
}

// ==========================================
// NEW: Login Tracking & Deductions Log System
// ==========================================

function getFormattedDate(date) {
  var d = date || new Date();
  var day = d.getDate().toString().padStart(2, "0");
  var month = (d.getMonth() + 1).toString().padStart(2, "0");
  var year = d.getFullYear();
  return day + "/" + month + "/" + year;
}

function recordLogin(username, ip, browser, device) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Attendance");
    if (!sheet) {
      sheet = ss.insertSheet("Attendance");
      sheet.appendRow(["Date", "Username", "Status", "Login Time", "IP Address", "Browser", "Device"]);
    }
    
    var now = new Date();
    var dateStr = getFormattedDate(now);
    var timeStr = now.toLocaleTimeString();
    
    var data = sheet.getDataRange().getValues();
    var alreadyRecorded = false;
    for (var i = 1; i < data.length; i++) {
      var rowDate = data[i][0];
      if (!rowDate) continue; // Skip blank/cleared rows
      var rowDateStr = (rowDate instanceof Date) ? getFormattedDate(rowDate) : String(rowDate).trim();
      var rowUser = String(data[i][1] || "").trim();
      if (!rowUser) continue; // Skip blank/cleared usernames
      if (rowDateStr === dateStr && rowUser.toLowerCase() === username.trim().toLowerCase()) {
        alreadyRecorded = true;
        break;
      }
    }
    
    if (!alreadyRecorded) {
      sheet.appendRow([dateStr, username, "Present", timeStr, ip || "—", browser || "—", device || "—"]);
    }
    
    var historySheet = ss.getSheetByName("Login History");
    if (!historySheet) {
      historySheet = ss.insertSheet("Login History");
      historySheet.appendRow(["Date", "Username", "Login Time", "Logout Time", "IP Address", "Browser", "Device"]);
    }
    historySheet.appendRow([dateStr, username, timeStr, "", ip || "—", browser || "—", device || "—"]);
    
    return { success: true, message: "Login recorded successfully" };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function recordLogout(username) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Login History");
    if (!sheet) return { success: false, error: "Login History sheet not found" };
    
    var data = sheet.getDataRange().getValues();
    var now = new Date();
    var dateStr = getFormattedDate(now);
    var timeStr = now.toLocaleTimeString();
    
    for (var i = data.length - 1; i >= 1; i--) {
      var rowDate = data[i][0];
      var rowDateStr = (rowDate instanceof Date) ? getFormattedDate(rowDate) : String(rowDate).trim();
      if (data[i][1] === username && rowDateStr === dateStr && data[i][3] === "") {
        sheet.getRange(i + 1, 4).setValue(timeStr);
        return { success: true, message: "Logout recorded successfully" };
      }
    }
    return { success: false, error: "Active login record not found for today" };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function runDailyLoginCheck() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var masterSheet = ss.getSheetByName("master");
    if (!masterSheet) return { success: false, error: "master sheet not found" };
    
    var deductionsSheet = ss.getSheetByName("Point Deductions");
    if (!deductionsSheet) {
      deductionsSheet = ss.insertSheet("Point Deductions");
      deductionsSheet.appendRow(["Date", "Username", "Reason", "Points Deducted", "Current Balance"]);
    }

    var attendanceSheet = ss.getSheetByName("Attendance");
    if (!attendanceSheet) {
      attendanceSheet = ss.insertSheet("Attendance");
      attendanceSheet.appendRow(["Date", "Username", "Status", "Login Time", "IP Address", "Browser", "Device"]);
    }
    
    var today = new Date();
    var dateStr = getFormattedDate(today);
    
    var masterData = masterSheet.getDataRange().getValues();
    var headers = masterData[0];
    var usernameColIndex = headers.findIndex(function(h) { return String(h).trim().toLowerCase() === "username"; });
    var roleColIndex = headers.findIndex(function(h) { return String(h).trim().toLowerCase() === "role"; });
    var emailColIndex = headers.findIndex(function(h) { return String(h).trim().toLowerCase() === "email"; });
    var deptColIndex = headers.findIndex(function(h) { return String(h).trim().toLowerCase() === "department"; });
    var phoneColIndex = headers.findIndex(function(h) { return String(h).trim().toLowerCase() === "phone" || String(h).trim().toLowerCase() === "mobile" || String(h).trim().toLowerCase() === "mobile number"; });
    
    if (usernameColIndex === -1) usernameColIndex = 2; 
    if (roleColIndex === -1) roleColIndex = 4; 
    if (emailColIndex === -1) emailColIndex = 5; 
    if (deptColIndex === -1) deptColIndex = 1; 
    if (phoneColIndex === -1) phoneColIndex = 3; 

    var activeUsers = [];
    var userEmails = {};
    var userDepts = {};
    var userPhones = {};
    for (var i = 1; i < masterData.length; i++) {
      var username = String(masterData[i][usernameColIndex]).trim();
      var role = String(masterData[i][roleColIndex]).trim().toLowerCase();
      var email = String(masterData[i][emailColIndex]).trim();
      var dept = String(masterData[i][deptColIndex]).trim();
      var phone = String(masterData[i][phoneColIndex]).trim();
      
      if (username && role !== "inactive" && role !== "in active") {
        activeUsers.push(username);
        userEmails[username] = email;
        userDepts[username] = dept;
        userPhones[username] = phone;
      }
    }
    
    var attendanceData = attendanceSheet.getDataRange().getValues();
    var presentUsersToday = {};
    for (var j = 1; j < attendanceData.length; j++) {
      var rowDate = attendanceData[j][0];
      var rowDateStr = (rowDate instanceof Date) ? getFormattedDate(rowDate) : String(rowDate).trim();
      if (rowDateStr === dateStr && String(attendanceData[j][2]).toLowerCase() === "present") {
        presentUsersToday[String(attendanceData[j][1]).trim().toLowerCase()] = true;
      }
    }
    
    var deductionsData = deductionsSheet.getDataRange().getValues();
    var results = [];
    
    activeUsers.forEach(function(user) {
      var userKey = user.toLowerCase();
      var deptName = userDepts[user] || "—";
      var employeePhone = userPhones[user] || "";
      
      if (presentUsersToday[userKey]) {
        results.push({ username: user, status: "present" });
      } else {
        // Mark as Absent in Attendance sheet if not logged in
        attendanceSheet.appendRow([dateStr, user, "Absent", "—", "—", "—", "—"]);

        var consecutiveMissed = 1;
        var checkDate = new Date();
        var limitDate = new Date(2026, 6, 1); // July 1, 2026
        limitDate.setHours(0,0,0,0);
        
        while (true) {
          checkDate.setDate(checkDate.getDate() - 1);
          if (checkDate < limitDate) {
            break;
          }
          var checkDateStr = getFormattedDate(checkDate);
          var foundPresent = false;
          for (var h = 1; h < attendanceData.length; h++) {
            var rowDate = attendanceData[h][0];
            var rowDateStr = (rowDate instanceof Date) ? getFormattedDate(rowDate) : String(rowDate).trim();
            if (rowDateStr === checkDateStr && String(attendanceData[h][1]).trim().toLowerCase() === userKey && String(attendanceData[h][2]).toLowerCase() === "present") {
              foundPresent = true;
              break;
            }
          }
          if (foundPresent) {
            break;
          } else {
            consecutiveMissed++;
            if (consecutiveMissed > 10) break;
          }
        }

        var pointsToDeduct = 50;
        if (consecutiveMissed === 1) {
          pointsToDeduct = 50;
        } else if (consecutiveMissed === 2) {
          pointsToDeduct = 50; 
        } else if (consecutiveMissed === 3) {
          pointsToDeduct = 200; 
        } else if (consecutiveMissed >= 4) {
          pointsToDeduct = 100; 
        }

        var balance = 1000;
        for (var k = deductionsData.length - 1; k >= 1; k--) {
          if (String(deductionsData[k][1]).trim().toLowerCase() === userKey) {
            balance = parseInt(deductionsData[k][4]);
            break;
          }
        }
        var newBalance = balance - pointsToDeduct;
        deductionsSheet.appendRow([dateStr, user, "Login Missed (" + consecutiveMissed + " Days)", pointsToDeduct, newBalance]);

        // WhatsApp Notification & Escalation Rules (No Emails)
        if (consecutiveMissed === 1) {
          // Alert Employee
          if (employeePhone) {
            sendWhatsAppNotification(employeePhone, "🚨 *ATTENDANCE COMPLIANCE REMINDER* 🚨\n\nDear *" + user + "*,\n\nYou have missed logging into the *SBH Group of Hospitals Delegation Management System* today (" + dateStr + ").\n\nAs per company policy, *50 points* have been deducted from your performance rating. Please ensure timely login tomorrow to maintain your compliance status.\n\n*Best Regards,*\n*Team SBH HOSPITAL*");
          }
          // Alert Manager
          sendWhatsAppNotification("+919039080203", "⚠️ *STAFF LOGIN NON-COMPLIANCE ALERT* ⚠️\n\n*Employee Name:* " + user + "\n*Department:* " + deptName + "\n*Status:* Did not log in yesterday (" + dateStr + ").\n\n*Best Regards,*\n*Team SBH HOSPITAL*");
        } else if (consecutiveMissed >= 2 && consecutiveMissed <= 5) {
          // Alert Manager
          sendWhatsAppNotification("+919039080203", "⚠️ *STAFF LOGIN NON-COMPLIANCE ALERT* ⚠️\n\n*Employee Name:* " + user + "\n*Department:* " + deptName + "\n*Status:* Missed login for *" + consecutiveMissed + " consecutive days*.\n\n*Best Regards,*\n*Team SBH HOSPITAL*");
        } else if (consecutiveMissed > 5) {
          // Escalate alert to higher authority
          sendWhatsAppNotification("+919644404741", "🚨 *CRITICAL COMPLIANCE ESCALATION* 🚨\n\n*Employee Name:* " + user + "\n*Department:* " + deptName + "\n*Status:* Missed login for *" + consecutiveMissed + " consecutive days*.\n\nImmediate review is required as per compliance protocol.\n\n*Best Regards,*\n*Team SBH HOSPITAL*");
        }
        
        results.push({ username: user, status: "absent", consecutiveMissed: consecutiveMissed });
      }
    });
    
    return { success: true, processedCount: results.length, results: results };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function sendWhatsAppNotification(phoneNumber, message) {
  Logger.log("WhatsApp Notification Sent to " + phoneNumber + ": " + message);
  try {
    var cleanPhone = String(phoneNumber).replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }
    
    var encodedMessage = encodeURIComponent(message);
    var url = "https://app.ceoitbox.com/message/new?username=SBH%20HOSPITAL&password=123456789&receiverMobileNo=" + cleanPhone + "&receiverName=User&message=" + encodedMessage;
    
    var response = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true
    });
    Logger.log("WhatsApp Response status: " + response.getResponseCode() + ", Body: " + response.getContentText());
  } catch (e) {
    Logger.log("WhatsApp send error: " + e.toString());
  }
}

function sendSameDayLoginReminder() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var masterSheet = ss.getSheetByName("master");
    if (!masterSheet) return { success: false, error: "master sheet not found" };
    
    var attendanceSheet = ss.getSheetByName("Attendance");
    if (!attendanceSheet) return { success: false, error: "Attendance sheet not found" };
    
    var today = new Date();
    var dateStr = getFormattedDate(today);
    
    var masterData = masterSheet.getDataRange().getValues();
    var headers = masterData[0];
    var usernameColIndex = headers.findIndex(function(h) { return String(h).trim().toLowerCase() === "username"; });
    var phoneColIndex = headers.findIndex(function(h) { return String(h).trim().toLowerCase() === "phone" || String(h).trim().toLowerCase() === "mobile" || String(h).trim().toLowerCase() === "mobile number"; });
    var roleColIndex = headers.findIndex(function(h) { return String(h).trim().toLowerCase() === "role"; });
    
    if (usernameColIndex === -1) usernameColIndex = 2;
    if (phoneColIndex === -1) phoneColIndex = 3;
    if (roleColIndex === -1) roleColIndex = 4;
    
    var activeUsers = [];
    var userPhones = {};
    for (var i = 1; i < masterData.length; i++) {
      var username = String(masterData[i][usernameColIndex]).trim();
      var role = String(masterData[i][roleColIndex]).trim().toLowerCase();
      var phone = String(masterData[i][phoneColIndex]).trim();
      
      if (username && role !== "inactive" && role !== "in active") {
        activeUsers.push(username);
        userPhones[username] = phone;
      }
    }
    
    var attendanceData = attendanceSheet.getDataRange().getValues();
    var presentUsersToday = {};
    for (var j = 1; j < attendanceData.length; j++) {
      var rowDate = attendanceData[j][0];
      var rowDateStr = (rowDate instanceof Date) ? getFormattedDate(rowDate) : String(rowDate).trim();
      if (rowDateStr === dateStr && String(attendanceData[j][2]).toLowerCase() === "present") {
        presentUsersToday[String(attendanceData[j][1]).trim().toLowerCase()] = true;
      }
    }
    
    var count = 0;
    activeUsers.forEach(function(user) {
      var userKey = user.toLowerCase();
      if (!presentUsersToday[userKey]) {
        var phone = userPhones[user];
        if (phone) {
          sendWhatsAppNotification(phone, "⚠️ *OFFICIAL LOGIN COMPLIANCE REMINDER* ⚠️\n\nDear *" + user + "*,\n\nThis is to notify you that your daily check-in on the *SBH Group of Hospitals Delegation & Checklist Management System* is currently pending for today (" + dateStr + ").\n\nPlease log in immediately to complete your pending delegations and checklists to prevent score deductions.\n\n*Best Regards,*\n*Team SBH HOSPITAL*");
          count++;
        }
      }
    });
    
    return { success: true, remindedCount: count };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}