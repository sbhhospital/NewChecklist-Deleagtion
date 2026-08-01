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
      var bypass = params.bypassCache === 'true' || params.sheet === 'Unique' || params.sheet === 'master';
      return fetchSheetData(params.sheet, bypass);
    } else if (params.sheet) {
      var bypass = params.sheet === 'Unique' || params.sheet === 'master';
      return fetchSheetData(params.sheet, bypass);
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


function clearSheetCache(sheetName) {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove("sheet_data_" + sheetName);
    console.log("Cleared cache for: " + sheetName);
  } catch (e) {
    console.warn("Failed to clear cache: " + e.message);
  }
}

function clearAllCaches() {
  try {
    var cache = CacheService.getScriptCache();
    var sheets = ["Unique", "Checklist", "master", "Whatsapp", "Attendance", "Point Deductions", "Login History"];
    sheets.forEach(function(s) {
      cache.remove("sheet_data_" + s);
    });
    console.log("Cleared all sheet caches");
  } catch (e) {
    console.warn("Failed to clear all caches: " + e.message);
  }
}

function fetchSheetData(sheetName, bypassCache) {
  try {
    if (!bypassCache) {
      try {
        var cache = CacheService.getScriptCache();
        var cached = cache.get("sheet_data_" + sheetName);
        if (cached) {
          console.log("Returning cached data for: " + sheetName);
          return ContentService.createTextOutput(cached)
            .setMimeType(ContentService.MimeType.JSON);
        }
      } catch (e) {
        console.warn("Cache read error: " + e.message);
      }
    }

    var ss = SpreadsheetApp.openById("1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0");
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
    
    var resultString = JSON.stringify(result);
    if (resultString.length < 100000) {
      try {
        var cache = CacheService.getScriptCache();
        cache.put("sheet_data_" + sheetName, resultString, 300); // cache for 5 minutes
        console.log("Cached data for: " + sheetName);
      } catch (e) {
        console.warn("Cache write error: " + e.message);
      }
    }

    return ContentService.createTextOutput(resultString)
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
    clearAllCaches();
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
    
    if (params.action === 'manageUser') {
      var result = manageUser(params);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (params.action === 'manageUniqueChecklist') {
      var result = manageUniqueChecklist(params);
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
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    
    // NEW: Action to reset consecutive missed days to 0
    if (params.action === 'resetAttendanceCounters') {
      var result = resetAttendanceCounters();
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheetName = params.sheetName;
    var action = params.action || 'insert';
    if (action === 'add') action = 'insert';
    
    var ss = SpreadsheetApp.openById("1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0");
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
              task.endDate || "",  // Column K
              "", // Column L
              "", // Column M
              "", // Column N
              "", // Column O
              "", // Column P
              "", // Column Q
              "", // Column R
              "", // Column S
              "", // Column T
              "", // Column U
              task.taskValue || 3  // Column V (index 21) - Task Value Weight
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
    else if (action === 'batchInsertRows') {
      var rowsData;
      try {
        rowsData = JSON.parse(params.rowsData);
      } catch (parseError) {
        throw new Error("Invalid rowsData format: " + parseError.message);
      }
      
      if (!Array.isArray(rowsData)) {
        throw new Error("rowsData must be a 2D array");
      }
      
      var dateMetadata = null;
      var timestampColumn = null;
      var nextTargetDateColumn = null;
      try {
        if (params.dateMetadata) dateMetadata = JSON.parse(params.dateMetadata);
        if (params.timestampColumn) timestampColumn = parseInt(params.timestampColumn);
        if (params.nextTargetDateColumn) nextTargetDateColumn = parseInt(params.nextTargetDateColumn);
      } catch (metaError) {}

      var convertedRows = rowsData.map(function(row) {
        return row.map(function(value, index) {
          if (index === 0 && timestampColumn === 0) {
            return convertDateToGoogleSheets(value);
          }
          if (index === 3 && nextTargetDateColumn === 3) {
            if (value && value.trim() !== '') {
              return convertDateToGoogleSheets(value);
            }
            return value;
          }
          if (dateMetadata && dateMetadata.columns && dateMetadata.columns[index]) {
            if (dateMetadata.columns[index].type === 'date') {
              return convertDateToGoogleSheets(value);
            }
          }
          return value;
        });
      });

      var lastRow = sheet.getLastRow();
      if (convertedRows.length > 0) {
        sheet.getRange(lastRow + 1, 1, convertedRows.length, convertedRows[0].length).setValues(convertedRows);
        
        if (timestampColumn === 0) {
          sheet.getRange(lastRow + 1, 1, convertedRows.length, 1).setNumberFormat('dd/mm/yyyy');
        }
        if (nextTargetDateColumn === 3) {
          sheet.getRange(lastRow + 1, 4, convertedRows.length, 1).setNumberFormat('dd/mm/yyyy');
        }
        if (dateMetadata && dateMetadata.columns) {
          Object.keys(dateMetadata.columns).forEach(function(colIndex) {
            var colNum = parseInt(colIndex) + 1;
            if (dateMetadata.columns[colIndex].type === 'date') {
              sheet.getRange(lastRow + 1, colNum, convertedRows.length, 1).setNumberFormat('dd/mm/yyyy');
            }
          });
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        message: "Batch rows added successfully",
        rowCount: sheet.getLastRow(),
        rowsInserted: convertedRows.length
      })).setMimeType(ContentService.MimeType.JSON);
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
    var ss = SpreadsheetApp.openById("1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0");
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet '" + sheetName + "' not found");
    }
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { success: true, message: "No rows to update", updatedCount: 0 };
    }
    var lastCol = sheet.getLastColumn();
    var sheetData = sheet.getRange(1, 1, lastRow, lastCol).getValues();

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
      
      var currentTaskId = sheetData[rowIndex - 1] ? sheetData[rowIndex - 1][1] : "";
      if (currentTaskId.toString().trim() !== item.taskId.toString().trim()) {
        console.log("Task ID mismatch in updateAdminDone for row " + rowIndex + " expected " + item.taskId + " but got " + currentTaskId + ". Performing in-memory search.");
        var correctRow = -1;
        for (var r = sheetData.length - 1; r >= 1; r--) {
          if (sheetData[r][1] && sheetData[r][1].toString().trim() === item.taskId.toString().trim()) {
            correctRow = r + 1;
            break;
          }
        }
        if (correctRow > 0) {
          rowIndex = correctRow;
        } else {
          console.error("Task ID not found in sheet: " + item.taskId);
          continue;
        }
      }
      
      // Update Column P (index 16) with admin done text
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
    
    var ss = SpreadsheetApp.openById("1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0");
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    var updateResults = [];
    
    var dataRange = sheet.getDataRange();
    var sheetValues = dataRange.getValues();
    
    rowDataArray.forEach(function(taskData, index) {
      var rowIndex = parseInt(taskData.rowIndex) - 1; // 0-indexed for array
      
      if (isNaN(rowIndex) || rowIndex < 1 || rowIndex >= sheetValues.length) {
         rowIndex = -1;
      }
      
      // Verify Task ID matches (Column B is index 1)
      if (rowIndex >= 0 && sheetValues[rowIndex][1].toString().trim() !== taskData.taskId.toString().trim()) {
        rowIndex = -1;
      }
      
      if (rowIndex === -1) {
         // Fallback search: search from bottom to top to find the most recent matching PENDING task
         for (var i = sheetValues.length - 1; i >= 1; i--) {
            var rowTaskId = sheetValues[i][1] ? sheetValues[i][1].toString().trim() : "";
            var rowActualDate = sheetValues[i][10] ? sheetValues[i][10].toString().trim() : "";
            var rowStatus = sheetValues[i][12] ? sheetValues[i][12].toString().trim() : "";
            
            if (rowTaskId === taskData.taskId.toString().trim() && rowActualDate === "" && rowStatus !== "Done" && rowStatus !== "Admin Done") {
               rowIndex = i;
               break;
            }
         }
         
         // If still not found, do a relaxed search from bottom to top (just matching taskId)
         if (rowIndex === -1) {
           for (var i = sheetValues.length - 1; i >= 1; i--) {
              var rowTaskId = sheetValues[i][1] ? sheetValues[i][1].toString().trim() : "";
              if (rowTaskId === taskData.taskId.toString().trim()) {
                 rowIndex = i;
                 break;
              }
           }
         }
      }
      
      if (rowIndex === -1) {
         throw new Error("Task ID mismatch and could not find correct row for Task ID: " + taskData.taskId);
      }
      
      var rowUpdates = {
        rowIndex: rowIndex + 1,
        taskId: taskData.taskId,
        updates: []
      };
      
      // Target updates to specific cells/ranges rather than writing back the entire sheet
      if (taskData.actualDate) {
        sheet.getRange(rowIndex + 1, 11).setValue(taskData.actualDate); // Column K (index 10)
        rowUpdates.updates.push("Column K (Actual): " + taskData.actualDate);
      }
      
      // Columns M, N, O (indexes 12, 13, 14) are contiguous. We can update them together.
      var statusVal = (taskData.status !== undefined && taskData.status !== null) ? taskData.status : (sheetValues[rowIndex] && sheetValues[rowIndex][12] !== undefined ? sheetValues[rowIndex][12] : "");
      var remarksVal = (taskData.remarks !== undefined && taskData.remarks !== null) ? taskData.remarks : (sheetValues[rowIndex] && sheetValues[rowIndex][13] !== undefined ? sheetValues[rowIndex][13] : "");
      var imageUrlVal = (taskData.imageUrl !== undefined && taskData.imageUrl !== null) ? taskData.imageUrl : (sheetValues[rowIndex] && sheetValues[rowIndex][14] !== undefined ? sheetValues[rowIndex][14] : "");
      
      sheet.getRange(rowIndex + 1, 13, 1, 3).setValues([[statusVal, remarksVal, imageUrlVal]]);
      rowUpdates.updates.push("Columns M-O updated (Status, Remarks, Image)");
      
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
    
    var dataRange = sheet.getDataRange();
    var sheetValues = dataRange.getValues();
    var isModified = false;
    
    rowDataArray.forEach(function(taskData, index) {
      var rowIndex = parseInt(taskData.rowIndex) - 1; // 0-indexed
      
      if (isNaN(rowIndex) || rowIndex < 1 || rowIndex >= sheetValues.length) {
         rowIndex = -1;
      }
      
      if (rowIndex >= 0 && sheetValues[rowIndex][1].toString().trim() !== taskData.taskId.toString().trim()) {
        rowIndex = -1;
      }
      
      if (rowIndex === -1) {
         for (var i = 1; i < sheetValues.length; i++) {
            if (sheetValues[i][1].toString().trim() === taskData.taskId.toString().trim()) {
               rowIndex = i;
               break;
            }
         }
      }
      
      if (rowIndex === -1) {
         throw new Error("Task ID mismatch for: " + taskData.taskId);
      }
      
      if (taskData.doneStatus) {
        sheetValues[rowIndex][12] = taskData.doneStatus; // Col M
        isModified = true;
      }
      
      updateResults.push({
        rowIndex: rowIndex + 1,
        taskId: taskData.taskId,
        status: taskData.doneStatus
      });
    });
    
    if (isModified) {
      dataRange.setValues(sheetValues);
    }
    
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
    if (lastRow < 2) return -1;
    
    var lastCol = sheet.getLastColumn();
    var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    console.log("Searching in-memory for Task ID '" + taskId + "' in " + data.length + " rows");
    
    // Step 1: Search bottom-to-top for a pending task row
    for (var i = data.length - 1; i >= 0; i--) {
      var row = data[i];
      var cellValue = row[1]; // Column B is index 1
      if (cellValue && cellValue.toString().trim() === taskId.toString().trim()) {
        var actualDate = row[10]; // Column K is index 10
        var status = row[12]; // Column M is index 12
        if (!actualDate && status !== "Done" && status !== "Admin Done") {
          var rowIndex = i + 2;
          console.log("Found pending Task ID '" + taskId + "' at row " + rowIndex);
          return rowIndex;
        }
      }
    }
    
    // Step 2: Fallback search bottom-to-top for any matching task row
    for (var i = data.length - 1; i >= 0; i--) {
      var row = data[i];
      var cellValue = row[1]; // Column B is index 1
      if (cellValue && cellValue.toString().trim() === taskId.toString().trim()) {
        var rowIndex = i + 2;
        console.log("Found Task ID '" + taskId + "' at row " + rowIndex + " (fallback)");
        return rowIndex;
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
    
    // Load inactive users from Whatsapp sheet
    var whatsappSheet = ss.getSheetByName("Whatsapp");
    var inactiveUsers = {};
    if (whatsappSheet) {
      var whatsappData = whatsappSheet.getDataRange().getValues();
      for (var u = 1; u < whatsappData.length; u++) {
        var uName = String(whatsappData[u][2]).trim().toLowerCase(); // Column C is Username
        var uRole = String(whatsappData[u][4]).trim().toLowerCase(); // Column E is Role
        if (uName && (uRole === "inactive" || uRole === "in active")) {
          inactiveUsers[uName] = true;
        }
      }
    }
    
    // Load existing tasks from Checklist sheet into a map for fast lookup
    var existingTasksMap = {};
    var departmentSheet = ss.getSheetByName("Checklist");
    if (departmentSheet) {
      var deptData = departmentSheet.getDataRange().getValues();
      for (var d = 1; d < deptData.length; d++) {
        var rowTaskId = deptData[d][1]; // Column B (Task ID)
        var rowDueDate = deptData[d][6]; // Column G (Due Date)
        var formattedRowDueDate = rowDueDate;
        if (rowDueDate instanceof Date) {
          formattedRowDueDate = Utilities.formatDate(rowDueDate, Session.getScriptTimeZone(), "dd/MM/yyyy");
        }
        if (rowTaskId && formattedRowDueDate) {
          existingTasksMap[rowTaskId + "_" + formattedRowDueDate] = true;
        }
      }
    }
    
    var tasksGenerated = 0;
    var processedItems = [];
    var newTasksList = [];
    
    // Read all Column 17 (Column Q) values to update in bulk
    var lastGeneratedDatesCol = [];
    for (var r = 0; r < checklistData.length; r++) {
      lastGeneratedDatesCol.push([checklistData[r][16]]);
    }
    
    // Process each row in checklist for new tasks (skip header)
    for (var i = 2; i < checklistData.length; i++) {
      var row = checklistData[i];
      
      var doer = String(row[4]).trim().toLowerCase(); // Column E (index 4)
      if (doer && inactiveUsers[doer]) {
        Logger.log("Skipping checklist task generation for inactive user: " + doer);
        continue;
      }
      
      // Extract data from columns
      var department = row[2]; // Column C (index 2)
      var frequency = row[7]; // Column I (index 8) 
      var existingTaskId = row[1] || (i + 1); // Column B or fallback to row number
      var lastGeneratedDate = row[16]; // Column S (index 18) - Last generated date
      
        // Only process if department exists
      if (department) {
        // Determine if we should generate task
        var shouldGenerateTask = false;
        var taskDueDate = "";
        
        // Only proceed if today is a working day
        if (isTodayWorkingDay) {
          var startDateRaw = row[6]; // Column G (index 6) - Start Date
          var startDate = parseDate(startDateRaw);
          
          if (!startDate) {
            // Fallback to today if no valid start date
            startDate = new Date(today);
            startDate.setHours(0,0,0,0);
          }
          
          // Calculate expected occurrence date
          var expectedDate = getMostRecentOccurrence(startDate, today, frequency.toLowerCase());
          
          if (expectedDate) {
            if (!lastGeneratedDate) {
              // Never generated, but start date is valid and reached
              shouldGenerateTask = true;
              taskDueDate = todayString;
            } else {
              var lastDate = parseDate(lastGeneratedDate);
              if (lastDate && lastDate < expectedDate) {
                // Last generated date is older than the expected recent occurrence
                shouldGenerateTask = true;
                taskDueDate = todayString;
              }
            }
          }
        }
        
        if (shouldGenerateTask && taskDueDate) {
          // Check if task already generated for today in department sheet to prevent duplicates
          if (existingTasksMap[existingTaskId + "_" + taskDueDate]) {
            Logger.log("Duplicate task found for ID: " + existingTaskId + " and Date: " + taskDueDate + ". Skipping generation.");
            continue;
          }
 
          // Prepare task data
          var taskData = [
            new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), // Column A (Timestamp)
            existingTaskId, // Column B (Task ID)
            row[2] || "", // Column C (Department)
            row[3] || "", // Column D (Given By)
            row[4] || "", // Column E (Doer)
            row[5] || "", // Column F (Description)
            taskDueDate, // Column G (Due Date)
            row[7] || "", // Column H (Frequency)
            row[8] || "", // Column I (Enable Reminders)
            row[9] || "" // Column J (Require Attachment)
          ];
          
          newTasksList.push(taskData);
          
          // Update last generated date in Column Q array
          lastGeneratedDatesCol[i] = [taskDueDate];
          
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
    
    // Bulk write new tasks to Checklist sheet
    if (newTasksList.length > 0) {
      var lastRow = departmentSheet.getLastRow();
      departmentSheet.getRange(lastRow + 1, 1, newTasksList.length, newTasksList[0].length).setValues(newTasksList);
    }
    
    // Bulk write last generated dates back to Unique sheet
    checklistSheet.getRange(1, 17, lastGeneratedDatesCol.length, 1).setValues(lastGeneratedDatesCol);
    
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

// Helper function to calculate the most recent occurrence of a recurring task
function getMostRecentOccurrence(startDate, today, frequency) {
  if (!startDate) return null;
  var sDate = new Date(startDate);
  sDate.setHours(0,0,0,0);
  var tDate = new Date(today);
  tDate.setHours(0,0,0,0);
  
  if (tDate < sDate) return null; // Hasn't started yet
  
  if (frequency === 'daily') {
    return tDate;
  }
  
  if (frequency === 'weekly') {
    var daysDiff = tDate.getDay() - sDate.getDay();
    if (daysDiff < 0) daysDiff += 7;
    var mostRecent = new Date(tDate);
    mostRecent.setDate(tDate.getDate() - daysDiff);
    return mostRecent;
  }
  
  if (frequency === 'fortnightly') {
    var d1 = sDate.getDate();
    var d2 = d1 <= 15 ? d1 + 15 : d1 - 15;
    var candidates = [
      new Date(tDate.getFullYear(), tDate.getMonth(), d1),
      new Date(tDate.getFullYear(), tDate.getMonth(), d2),
      new Date(tDate.getFullYear(), tDate.getMonth() - 1, d1),
      new Date(tDate.getFullYear(), tDate.getMonth() - 1, d2)
    ];
    var mostRecent = null;
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] <= tDate) {
        if (!mostRecent || candidates[i] > mostRecent) {
          mostRecent = candidates[i];
        }
      }
    }
    return mostRecent;
  }
  
  if (frequency === 'monthly') {
    var d = sDate.getDate();
    var mostRecent = new Date(tDate.getFullYear(), tDate.getMonth(), d);
    if (mostRecent > tDate) {
      mostRecent = new Date(tDate.getFullYear(), tDate.getMonth() - 1, d);
    }
    return mostRecent;
  }
  
  if (frequency === 'quarterly') {
    var d = sDate.getDate();
    var sMonth = sDate.getMonth();
    var mDiff = tDate.getMonth() - sMonth;
    var mDiffMod = mDiff >= 0 ? mDiff % 3 : (3 + (mDiff % 3)) % 3;
    var targetMonth = tDate.getMonth() - mDiffMod;
    var mostRecent = new Date(tDate.getFullYear(), targetMonth, d);
    if (mostRecent > tDate) {
      mostRecent = new Date(tDate.getFullYear(), targetMonth - 3, d);
    }
    return mostRecent;
  }
  
  if (frequency === 'yearly') {
    var d = sDate.getDate();
    var m = sDate.getMonth();
    var mostRecent = new Date(tDate.getFullYear(), m, d);
    if (mostRecent > tDate) {
      mostRecent = new Date(tDate.getFullYear() - 1, m, d);
    }
    return mostRecent;
  }
  
  return null;
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
    // Run the daily login and absent deduction check
    var loginResult = runDailyLoginCheck();
    Logger.log("Daily login check result: " + JSON.stringify(loginResult));
    
    return {
      success: true,
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

function getConsecutiveMissedDays(username, asOfDate, attendanceData) {
  var userKey = username.toLowerCase();
  var consecutiveMissed = 0;
  
  var checkDate = new Date(asOfDate);
  var limitDate = new Date(2026, 6, 27); // July 27, 2026
  limitDate.setHours(0,0,0,0);
  
  // Build a presence map for this user to make lookups O(1)
  var presenceMap = {};
  for (var h = 1; h < attendanceData.length; h++) {
    if (String(attendanceData[h][1]).trim().toLowerCase() === userKey) {
      var rowDate = attendanceData[h][0];
      var rowDateStr = (rowDate instanceof Date) ? getFormattedDate(rowDate) : String(rowDate).trim();
      var status = String(attendanceData[h][2]).toLowerCase().trim();
      if (status === "present") {
        presenceMap[rowDateStr] = true;
      }
    }
  }
  
  while (true) {
    if (checkDate < limitDate) {
      break;
    }
    
    // Skip Sundays
    if (checkDate.getDay() === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }
    
    var checkDateStr = getFormattedDate(checkDate);
    
    if (presenceMap[checkDateStr]) {
      break;
    } else {
      consecutiveMissed++;
      if (consecutiveMissed >= 365) break;
    }
    
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  return consecutiveMissed;
}

function recordLogin(username, ip, browser, device) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Attendance");
    if (!sheet) {
      sheet = ss.insertSheet("Attendance");
      sheet.appendRow(["Date", "Username", "Status", "Login Time", "IP Address", "Browser", "Device", "Consecutive Missed Days"]);
    } else {
      // Ensure header column is present in existing sheet
      var headers = sheet.getDataRange().getValues()[0];
      if (headers.indexOf("Consecutive Missed Days") === -1) {
        sheet.getRange(1, 8).setValue("Consecutive Missed Days");
      }
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
        var status = String(data[i][2] || "").trim().toLowerCase();
        if (status === "absent") {
          sheet.getRange(i + 1, 3).setValue("Present");
          sheet.getRange(i + 1, 4).setValue(timeStr);
          sheet.getRange(i + 1, 5).setValue(ip || "—");
          sheet.getRange(i + 1, 6).setValue(browser || "—");
          sheet.getRange(i + 1, 7).setValue(device || "—");
          sheet.getRange(i + 1, 8).setValue(0); // Reset consecutive missed days to 0
          
          // Remove the "Login Missed" deduction logged for today
          var deductionsSheet = ss.getSheetByName("Point Deductions");
          if (deductionsSheet) {
            var deductionsData = deductionsSheet.getDataRange().getValues();
            for (var k = deductionsData.length - 1; k >= 1; k--) {
              var dDate = deductionsData[k][0];
              var dDateStr = (dDate instanceof Date) ? getFormattedDate(dDate) : String(dDate).trim();
              var dUser = String(deductionsData[k][1] || "").trim().toLowerCase();
              var dReason = String(deductionsData[k][2] || "").trim();
              if (dDateStr === dateStr && dUser === username.trim().toLowerCase() && dReason.indexOf("Login Missed") !== -1) {
                deductionsSheet.deleteRow(k + 1);
                break;
              }
            }
          }
        }
        alreadyRecorded = true;
        break;
      }
    }
    
    if (!alreadyRecorded) {
      sheet.appendRow([dateStr, username, "Present", timeStr, ip || "—", browser || "—", device || "—", 0]);
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
    var ss = SpreadsheetApp.openById("1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0");
    var masterSheet = ss.getSheetByName("Whatsapp");
    if (!masterSheet) return { success: false, error: "Whatsapp sheet not found" };
    
    var deductionsSheet = ss.getSheetByName("Point Deductions");
    if (!deductionsSheet) {
      deductionsSheet = ss.insertSheet("Point Deductions");
      deductionsSheet.appendRow(["Date", "Username", "Reason", "Points Deducted", "Current Balance"]);
    }

    var attendanceSheet = ss.getSheetByName("Attendance");
    if (!attendanceSheet) {
      attendanceSheet = ss.insertSheet("Attendance");
      attendanceSheet.appendRow(["Date", "Username", "Status", "Login Time", "IP Address", "Browser", "Device", "Consecutive Missed Days"]);
    } else {
      var headers = attendanceSheet.getDataRange().getValues()[0];
      if (headers.indexOf("Consecutive Missed Days") === -1) {
        attendanceSheet.getRange(1, 8).setValue("Consecutive Missed Days");
      }
    }
    
    // Evaluate compliance for the previous calendar day (yesterday)
    var targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1);
    
    // Skip Sunday check completely (leave day)
    if (targetDate.getDay() === 0) {
      return { success: true, message: "Skipped checking compliance because yesterday was Sunday (leave day)." };
    }
    
    var dateStr = getFormattedDate(targetDate);
    
    var masterData = masterSheet.getDataRange().getValues();
    var masterHeaders = masterData[0];
    var usernameColIndex = masterHeaders.findIndex(function(h) { return String(h).trim().toLowerCase() === "username"; });
    var roleColIndex = masterHeaders.findIndex(function(h) { return String(h).trim().toLowerCase() === "role"; });
    var emailColIndex = masterHeaders.findIndex(function(h) { return String(h).trim().toLowerCase() === "email"; });
    var deptColIndex = masterHeaders.findIndex(function(h) { return String(h).trim().toLowerCase() === "department"; });
    var phoneColIndex = masterHeaders.findIndex(function(h) { return String(h).trim().toLowerCase() === "phone" || String(h).trim().toLowerCase() === "mobile" || String(h).trim().toLowerCase() === "mobile number" || String(h).trim().toLowerCase() === "number"; });
    
    if (usernameColIndex === -1) usernameColIndex = 2; 
    if (roleColIndex === -1) roleColIndex = 4; 
    if (emailColIndex === -1) emailColIndex = 5; 
    if (deptColIndex === -1) deptColIndex = 1; 
    if (phoneColIndex === -1) phoneColIndex = 6; 

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
    var absentUsersSummary = []; // Track non-compliance for consolidated admin reminder
    
    activeUsers.forEach(function(user) {
      var userKey = user.toLowerCase();
      var deptName = userDepts[user] || "—";
      var employeePhone = userPhones[user] || "";
      
      var existingRowIndex = -1;
      var existingStatus = "";
      for (var j = 1; j < attendanceData.length; j++) {
        var rowDate = attendanceData[j][0];
        var rowDateStr = (rowDate instanceof Date) ? getFormattedDate(rowDate) : String(rowDate).trim();
        if (rowDateStr === dateStr && String(attendanceData[j][1]).trim().toLowerCase() === userKey) {
          existingRowIndex = j;
          existingStatus = String(attendanceData[j][2]).toLowerCase().trim();
          break;
        }
      }

      if (presentUsersToday[userKey] || existingStatus === "present") {
        results.push({ username: user, status: "present" });
      } else {
        // Calculate consecutive missed days prior to yesterday (excluding Sundays)
        var checkDate = new Date(targetDate);
        checkDate.setDate(checkDate.getDate() - 1);
        var consecutiveMissed = 1 + getConsecutiveMissedDays(user, checkDate, attendanceData);

        // Mark as Absent in Attendance sheet if not already recorded
        if (existingRowIndex === -1) {
          attendanceSheet.appendRow([dateStr, user, "Absent", "—", "—", "—", "—", consecutiveMissed]);
        } else {
          // Update consecutive missed count
          attendanceSheet.getRange(existingRowIndex + 1, 8).setValue(consecutiveMissed);
        }

        // Check if deduction already logged today
        var deductionLogged = false;
        for (var k = deductionsData.length - 1; k >= 1; k--) {
          var dDate = deductionsData[k][0];
          var dDateStr = (dDate instanceof Date) ? getFormattedDate(dDate) : String(dDate).trim();
          var dUser = String(deductionsData[k][1]).trim().toLowerCase();
          var dReason = String(deductionsData[k][2]).trim();
          if (dDateStr === dateStr && dUser === userKey && dReason.indexOf("Login Missed") !== -1) {
            deductionLogged = true;
            break;
          }
        }

        if (!deductionLogged) {
          var balance = 100; // HIGHEST SCORE IS 100
          for (var k = deductionsData.length - 1; k >= 1; k--) {
            if (String(deductionsData[k][1]).trim().toLowerCase() === userKey) {
              balance = parseInt(deductionsData[k][4]);
              break;
            }
          }
          
          // 1. Deduct 5 points for Checklist
          var balanceAfterChecklist = balance - 5;
          deductionsSheet.appendRow([dateStr, user, "Login Missed (Checklist) - " + formatAbsentTime(consecutiveMissed), 5, balanceAfterChecklist]);
          
          // 2. Deduct 5 points for Delegation
          var balanceAfterDelegation = balanceAfterChecklist - 5;
          deductionsSheet.appendRow([dateStr, user, "Login Missed (Delegation) - " + formatAbsentTime(consecutiveMissed), 5, balanceAfterDelegation]);

          // Push to consolidated admin summary list
          absentUsersSummary.push({
            name: user,
            missed: consecutiveMissed,
            deducted: 10
          });
        }
        
        results.push({ username: user, status: "absent", consecutiveMissed: consecutiveMissed });
      }
    });
    
    // Send ONE consolidated message to escalation managers if there are non-compliant users
      if (absentUsersSummary.length > 0) {
        var summaryMsg = "🚨 *STAFF ATTENDANCE ESCALATION SUMMARY* 🚨\n\n";
        summaryMsg += "*Attendance Date:* " + dateStr + "\n\n";
        summaryMsg += "The following staff members missed their check-in:\n";
        absentUsersSummary.forEach(function(item, idx) {
          summaryMsg += (idx + 1) + ". *" + item.name + "*\n   ⏳ Days Missed: " + item.missed + "\n";
        });
        summaryMsg += "\nImmediate review is suggested.\n\n*Best Regards,*\n*Team SBH HOSPITAL*";
      
      sendWhatsAppNotification("+919039080203", summaryMsg);
      sendWhatsAppNotification("+919644404741", summaryMsg);
    }
    
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
    
    var url = "https://app.ceoitbox.com/message/new";
    var payload = {
      username: "SBH HOSPITAL",
      password: "123456789",
      receiverMobileNo: cleanPhone,
      receiverName: "User",
      message: message
    };
    
    var response = UrlFetchApp.fetch(url, {
      method: "post",
      payload: payload,
      muteHttpExceptions: true
    });
    Logger.log("WhatsApp Response status: " + response.getResponseCode() + ", Body: " + response.getContentText());
  } catch (e) {
    Logger.log("WhatsApp send error: " + e.toString());
  }
}

function sendSameDayLoginReminder() {
  try {
    var ss = SpreadsheetApp.openById("1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0");
    var masterSheet = ss.getSheetByName("Whatsapp");
    if (!masterSheet) return { success: false, error: "Whatsapp sheet not found" };
    
    var attendanceSheet = ss.getSheetByName("Attendance");
    if (!attendanceSheet) return { success: false, error: "Attendance sheet not found" };
    
    var today = new Date();
    
    // Skip Sunday reminder completely (leave day)
    if (today.getDay() === 0) {
      return { success: true, message: "Skipped same day reminder because today is Sunday (leave day)." };
    }
    
    var dateStr = getFormattedDate(today);
    
    var masterData = masterSheet.getDataRange().getValues();
    var headers = masterData[0];
    var usernameColIndex = headers.findIndex(function(h) { return String(h).trim().toLowerCase() === "username"; });
    var phoneColIndex = headers.findIndex(function(h) { return String(h).trim().toLowerCase() === "phone" || String(h).trim().toLowerCase() === "mobile" || String(h).trim().toLowerCase() === "mobile number" || String(h).trim().toLowerCase() === "number"; });
    var roleColIndex = headers.findIndex(function(h) { return String(h).trim().toLowerCase() === "role"; });
    
    if (usernameColIndex === -1) usernameColIndex = 2;
    if (phoneColIndex === -1) phoneColIndex = 6;
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
          // Calculate consecutive missed days prior to today (excluding Sundays)
          var checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - 1);
          var consecutiveMissed = 1 + getConsecutiveMissedDays(user, checkDate, attendanceData);
          
          sendWhatsAppNotification(phone, "⏰ *OFFICIAL LOGIN COMPLIANCE REMINDER* ⏰\n\nDear *" + user + "*,\n\nThis is to notify you that your daily check-in on the *SBH Group of Hospitals Delegation & Checklist Management System* is currently pending for today (" + dateStr + ").\n\nPlease log in before midnight to avoid automatic point deductions tomorrow.\n\n*Best Regards,*\n*Team SBH HOSPITAL*");
          count++;
        }
      }
    });
    
    return { success: true, remindedCount: count };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// Temporary function to reset consecutive missed days for all users
function resetAttendanceCounters() {
  try {
    var ss = SpreadsheetApp.openById("1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0");
    var attendanceSheet = ss.getSheetByName("Attendance");
    if (!attendanceSheet) return { success: false, error: "Attendance sheet not found" };
    
    var data = attendanceSheet.getDataRange().getValues();
    var headers = data[0];
    var countColIndex = headers.indexOf("Consecutive Missed Days");
    
    if (countColIndex === -1) {
      countColIndex = 7; // Column H (8th column)
      attendanceSheet.getRange(1, countColIndex + 1).setValue("Consecutive Missed Days");
    }
    
    var updatedCount = 0;
    // Set all values in the column to 0 (except header)
    for (var i = 1; i < data.length; i++) {
      if (data[i][countColIndex] !== 0 && String(data[i][countColIndex]) !== "") {
        attendanceSheet.getRange(i + 1, countColIndex + 1).setValue(0);
        updatedCount++;
      }
    }
    
    return { success: true, message: "Reset " + updatedCount + " attendance records to 0 consecutive missed days." };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function setupAttendanceTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var funcName = triggers[i].getHandlerFunction();
    if (funcName === "runDailyLoginCheck" || funcName === "sendSameDayLoginReminder") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // 1. Trigger for sendSameDayLoginReminder at 6:10 PM daily
  ScriptApp.newTrigger("sendSameDayLoginReminder")
    .timeBased()
    .everyDays(1)
    .atHour(18)
    .nearMinute(10)
    .create();
    
  // 2. Trigger for runDailyLoginCheck at 10:00 AM daily
  ScriptApp.newTrigger("runDailyLoginCheck")
    .timeBased()
    .everyDays(1)
    .atHour(10)
    .nearMinute(0)
    .create();
}

function manageUser(params) {
  try {
    var ss = SpreadsheetApp.openById("1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0");
    var sheet = ss.getSheetByName("master");
    if (!sheet) {
      throw new Error("Master sheet not found");
    }
    
    var subAction = params.subAction; // 'insert', 'update', 'delete'
    var rowData = JSON.parse(params.rowData);
    
    if (subAction === 'delete') {
      var rowIndex = parseInt(params.rowIndex);
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index: " + params.rowIndex);
      }
      // ONLY clear Columns C to H (index 3 to 8) to preserve Columns A & B
      sheet.getRange(rowIndex, 3, 1, 6).clearContent();
      return { success: true, message: "User deleted successfully" };
    }
    
    if (subAction === 'insert') {
      // Find the first empty row in Column C to preserve Column A & B lists
      var colCValues = sheet.getRange("C:C").getValues();
      var targetRow = -1;
      for (var r = 1; r < colCValues.length; r++) {
        if (!colCValues[r][0] || String(colCValues[r][0]).trim() === "") {
          targetRow = r + 1;
          break;
        }
      }
      if (targetRow === -1) {
        targetRow = colCValues.length + 1;
      }
      
      // Write user details to Columns C to H:
      var roleVal = String(rowData[4]).trim();
      if (roleVal.toLowerCase() === "inactive" || roleVal.toLowerCase() === "in active") {
        roleVal = "In Active";
      }
      sheet.getRange(targetRow, 3).setValue(rowData[2]); // Username
      sheet.getRange(targetRow, 4).setValue(rowData[3]); // Password
      sheet.getRange(targetRow, 5).setValue(roleVal);    // Role
      sheet.getRange(targetRow, 6).setValue(rowData[5]); // Email
      sheet.getRange(targetRow, 7).setValue(rowData[6]); // Phone
      sheet.getRange(targetRow, 8).setValue(rowData[7]); // PhotoUrl
      
      return { success: true, message: "User added successfully" };
    }
    
    if (subAction === 'update') {
      var rowIndex = parseInt(params.rowIndex);
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index: " + params.rowIndex);
      }
      
      var oldUsername = String(sheet.getRange(rowIndex, 3).getValue()).trim();
      var newUsername = String(rowData[2]).trim();
      
      // Write user details to Columns C to H:
      var roleVal = String(rowData[4]).trim();
      if (roleVal.toLowerCase() === "inactive" || roleVal.toLowerCase() === "in active") {
        roleVal = "In Active";
      }
      
      sheet.getRange(rowIndex, 3).setValue(rowData[2]); // Username
      sheet.getRange(rowIndex, 4).setValue(rowData[3]); // Password
      sheet.getRange(rowIndex, 5).setValue(roleVal);    // Role
      sheet.getRange(rowIndex, 6).setValue(rowData[5]); // Email
      sheet.getRange(rowIndex, 7).setValue(rowData[6]); // Phone
      sheet.getRange(rowIndex, 8).setValue(rowData[7]); // PhotoUrl
      
      // If username changed, update all corresponding doer names in the Unique sheet
      if (oldUsername && newUsername && oldUsername.toLowerCase() !== newUsername.toLowerCase()) {
        var uniqueSheet = ss.getSheetByName("Unique");
        if (uniqueSheet) {
          var uniqueData = uniqueSheet.getDataRange().getValues();
          for (var q = 1; q < uniqueData.length; q++) {
            var currentDoer = String(uniqueData[q][4]).trim();
            if (currentDoer.toLowerCase() === oldUsername.toLowerCase()) {
              uniqueSheet.getRange(q + 1, 5).setValue(newUsername); // Column E (index 5) is Doer
            }
          }
          Logger.log("Updated Unique sheet checklist items doer name from: " + oldUsername + " to: " + newUsername);
        }
      }
      
      return { success: true, message: "User updated successfully" };
    }
    
    throw new Error("Unknown subAction: " + subAction);
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function manageUniqueChecklist(params) {
  try {
    var ss = SpreadsheetApp.openById("1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0");
    var sheet = ss.getSheetByName("Unique");
    if (!sheet) {
      throw new Error("Unique checklist sheet not found");
    }
    
    var subAction = params.subAction; // 'insert', 'update', 'delete'
    var rowData = JSON.parse(params.rowData);
    
    if (subAction === 'delete') {
      var taskId = params.taskId;
      var rowIndex = -1;
      
      if (taskId) {
        var data = sheet.getDataRange().getValues();
        for (var r = 1; r < data.length; r++) {
          if (data[r][1] && String(data[r][1]).trim() === String(taskId).trim()) {
            rowIndex = r + 1;
            break;
          }
        }
      }
      
      if (rowIndex === -1 && params.rowIndex) {
        rowIndex = parseInt(params.rowIndex);
      }
      
      if (rowIndex === -1 || isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid or unfound row index for delete");
      }
      
      sheet.deleteRow(rowIndex);
      return { success: true, message: "Checklist deleted successfully" };
    }
    
    if (subAction === 'insert') {
      // Check if duplicate checklist template already exists in Unique sheet (same doer and description)
      var uniqueData = sheet.getDataRange().getValues();
      var newDoer = String(rowData[4]).trim().toLowerCase();
      var newDesc = String(rowData[5]).trim().toLowerCase();
      
      for (var r = 1; r < uniqueData.length; r++) {
        var existingDoer = String(uniqueData[r][4]).trim().toLowerCase();
        var existingDesc = String(uniqueData[r][5]).trim().toLowerCase();
        
        if (existingDoer === newDoer && existingDesc === newDesc) {
          throw new Error("This checklist task already exists for this user in the templates/configurations.");
        }
      }
      
      sheet.appendRow(rowData);
      return { success: true, message: "Checklist added successfully" };
    }
    
    if (subAction === 'update') {
      var taskId = rowData[1];
      var rowIndex = -1;
      
      if (taskId) {
        var data = sheet.getDataRange().getValues();
        for (var r = 1; r < data.length; r++) {
          if (data[r][1] && String(data[r][1]).trim() === String(taskId).trim()) {
            rowIndex = r + 1;
            break;
          }
        }
      }
      
      if (rowIndex === -1 && params.rowIndex) {
        rowIndex = parseInt(params.rowIndex);
      }
      
      if (rowIndex === -1 || isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid or unfound row index for update");
      }
      
      for (var i = 0; i < rowData.length; i++) {
        sheet.getRange(rowIndex, i + 1).setValue(rowData[i]);
      }
      return { success: true, message: "Checklist updated successfully" };
    }
    
    throw new Error("Unknown subAction: " + subAction);
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function formatAbsentTime(days) {
  if (days <= 0) return "0 Days (0 Days)";
  var years = Math.floor(days / 365);
  var remainingDays = days % 365;
  var months = Math.floor(remainingDays / 30);
  var finalDays = remainingDays % 30;
  
  var parts = [];
  if (years > 0) {
    parts.push(years + (years === 1 ? " Year" : " Years"));
  }
  if (months > 0) {
    parts.push(months + (months === 1 ? " Month" : " Months"));
  }
  if (finalDays > 0 || parts.length === 0) {
    parts.push(finalDays + (finalDays === 1 ? " Day" : " Days"));
  }
  
  return parts.join(" ") + " (" + days + " Days)";
}

function cleanAllDuplicateTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var deletedCount = 0;
  for (var i = 0; i < triggers.length; i++) {
    var funcName = triggers[i].getHandlerFunction();
    if (funcName === "testChecklistProcessing") {
      ScriptApp.deleteTrigger(triggers[i]);
      deletedCount++;
    }
  }
  Logger.log("Successfully deleted " + deletedCount + " active triggers for testChecklistProcessing.");
}

function autoFillPendingChecklists() {
  var ss = SpreadsheetApp.openById("1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0");
  var checklistSheets = ["SALES", "E-COMMERCE", "WH", "PURCHASE", "FACTORY", "ACCOUNTS", "DESIGNING", "DISPATCH", "FABRICATION", "HR"];
  
  checklistSheets.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      console.log("Sheet not found: " + sheetName);
      return;
    }
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var modified = false;
    
    // Ensure all rows have at least 21 columns to prevent setValues dimension error
    var targetCols = Math.max(values[0].length, 21);
    for (var j = 0; j < values.length; j++) {
       while (values[j].length < targetCols) {
         values[j].push("");
       }
    }
    
    var updatedCount = 0;
    
    for (var i = 1; i < values.length; i++) { // Skip header row
      var taskId = values[i][1]; // Column B (Index 1)
      var actualDate = values[i][10]; // Column K (Index 10)
      
      if (taskId && taskId.toString().trim() !== "") {
        // If Actual Date is blank
        if (!actualDate || actualDate.toString().trim() === "") {
          values[i][10] = "28/07/2026"; // Col K
          values[i][12] = "Done"; // Col M (Status)
          values[i][20] = "Done"; // Col U (Admin Done - just in case)
          updatedCount++;
          modified = true;
        }
      }
    }
    
    if (modified) {
      sheet.getRange(1, 1, values.length, targetCols).setValues(values);
      console.log("Filled " + updatedCount + " pending checklists in sheet: " + sheetName);
    }
  });
  
  console.log("Auto-fill complete!");
}