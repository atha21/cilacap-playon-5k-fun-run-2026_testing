// ==========================================
// ⚙️ PENGATURAN UTAMA SUPABASE
// ==========================================
var SUPABASE_URL = "https://jmislcnmjvvrbvxcnmhn.supabase.co"; 
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptaXNsY25tanZ2cmJ2eGNubWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMTE1NTksImV4cCI6MjA5OTU4NzU1OX0.tBVQX8hjxbkm0WhYxdZEse_udCjodQvHOsakorhKPBE";   
var NAMA_TABEL_SUPABASE = "pendaftar_running";            

// ==========================================
// 🗺️ PETA KOLOM (OMNI-SYNC MAP) - 100% DINAMIS
// ==========================================
var PETA_KOLOM = {
  "data_lengkap": {
    regCol: 4, 
    fields: { 
      1:"id", 2:"sync_at", 3:"created_at", 4:"no_registrasi", 5:"no_bib", 
      6:"nama_lengkap", 7:"gender", 8:"email", 9:"no_hp", 10:"alamat", 
      11:"kontak_darurat", 12:"hub_darurat", 13:"telp_darurat", 14:"gol_darah", 
      15:"medis", 16:"ukuran_jersey", 17:"custom_bib", 18:"promo", 19:"nominal", 
      20:"bukti", 21:"status" 
    }
  },
  "data_verifikasi": {
    regCol: 2, 
    fields: { 
      1:"id", 2:"no_registrasi", 3:"no_bib", 4:"nama_lengkap", 5:"custom_bib", 
      6:"gender", 7:"no_hp", 8:"email", 9:"ukuran_jersey", 10:"promo", 
      11:"nominal", 12:"bukti", 13:"status" 
    }
  },
  "data_peserta_pending": {
    regCol: 2, 
    fields: { 
      1:"id", 2:"no_registrasi", 3:"no_bib", 4:"nama_lengkap", 5:"custom_bib", 
      6:"gender", 7:"no_hp", 8:"email", 9:"ukuran_jersey", 10:"promo", 
      11:"nominal", 12:"bukti", 13:"status" 
    }
  },
  "data_peserta_valid": {
    regCol: 2, 
    fields: { 
      1:"id", 2:"no_registrasi", 3:"no_bib", 4:"nama_lengkap", 5:"custom_bib", 
      6:"gender", 7:"no_hp", 8:"email", 9:"ukuran_jersey", 10:"promo", 
      11:"nominal", 12:"bukti", 13:"status" 
    }
  },
  "data_peserta_invalid": {
    regCol: 2, 
    fields: { 
      1:"id", 2:"no_registrasi", 3:"no_bib", 4:"nama_lengkap", 5:"custom_bib", 
      6:"gender", 7:"no_hp", 8:"email", 9:"ukuran_jersey", 10:"promo", 
      11:"nominal", 12:"bukti", 13:"status" 
    }
  },
  "data_medis": {
    regCol: 2, 
    fields: { 
      1:"id", 2:"no_registrasi", 3:"no_bib", 4:"nama_lengkap", 5:"custom_bib", 
      6:"gender", 7:"no_hp", 8:"alamat", 9:"kontak_darurat", 10:"hub_darurat", 
      11:"telp_darurat", 12:"gol_darah", 13:"medis" 
    }
  },
  "data_jersey": {
    regCol: 2, 
    fields: { 
      1:"id", 2:"no_registrasi", 3:"nama_lengkap", 4:"gender", 5:"ukuran_jersey", 
      6:"custom_bib" 
    }
  }
};

// ==========================================
// ⚡ FUNGSI UTAMA: BATCH FETCH & AUTO-UPDATE
// ==========================================
function tarikDataDariSupabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabNames = Object.keys(PETA_KOLOM);
  
  var sheetObjects = {};
  var dataArrays = {};
  
  // 1. AMBIL & NORMALISASI DATA SPREADSHEET KE RAM (ANTI BARIS BENGKONG)
  tabNames.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    sheetObjects[name] = sheet;
    if (sheet) {
      var allValues = sheet.getDataRange().getValues();
      
      // Hitung lebar kolom ideal dari PETA_KOLOM
      var expectedWidth = 0;
      var config = PETA_KOLOM[name];
      for (var col in config.fields) {
        expectedWidth = Math.max(expectedWidth, parseInt(col, 10));
      }
      
      // Paksa semua baris lama agar lebarnya sinkron dengan PETA_KOLOM
      var cleanRows = allValues.slice(1).map(function(row) {
        if (row.length > expectedWidth) {
          return row.slice(0, expectedWidth);
        } else {
          var paddedRow = row.slice();
          while (paddedRow.length < expectedWidth) {
            paddedRow.push("");
          }
          return paddedRow;
        }
      });
      dataArrays[name] = cleanRows;
    } else {
      dataArrays[name] = [];
    }
  });
  
  if (!sheetObjects["data_lengkap"] || !sheetObjects["data_verifikasi"]) return;
  
  var url = SUPABASE_URL + "/rest/v1/" + NAMA_TABEL_SUPABASE + "?order=id.asc";
  var options = { 
    "method": "get", 
    "headers": { 
      "apikey": SUPABASE_KEY, 
      "Authorization": "Bearer " + SUPABASE_KEY 
    }, 
    "muteHttpExceptions": true 
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      Logger.log("Eror API Supabase: " + response.getContentText());
      return;
    }
    var records = JSON.parse(response.getContentText());
    if (records.length === 0) return;
    
    var lock = LockService.getScriptLock();
    lock.waitLock(30000); 
    
    try {
      // Indeks kilat ID memori RAM
      var existingIdsMap = {};
      var masterLengkapArr = dataArrays["data_lengkap"];
      for (var i = 0; i < masterLengkapArr.length; i++) {
        var idVal = masterLengkapArr[i][0];
        if (idVal !== "" && !isNaN(idVal)) {
          existingIdsMap[parseInt(idVal, 10)] = i;
        }
      }
      
      // 2. PROSES DATA TOTAL DI DALAM RAM
      for (var i = 0; i < records.length; i++) {
        var record = records[i];
        var dataObj = mapRecordToDataObj(record);
        var idxLengkap = existingIdsMap[dataObj.id];
        
        if (idxLengkap !== undefined) {
          // 🔄 SINKRON DATA LAMA
          var currentValues = masterLengkapArr[idxLengkap];
          var configLengkap = PETA_KOLOM["data_lengkap"];
          var needsUpdate = false;
          var statusChanged = false;
          var newStatusVal = "";
          
          for (var colStr in configLengkap.fields) {
            var colIdx = parseInt(colStr, 10) - 1;
            var fieldKey = configLengkap.fields[colStr];
            
            if (fieldKey === "sync_at") continue;
            
            var newValue = dataObj[fieldKey];
            var currentValue = currentValues[colIdx];
            
            var strCurrent = (currentValue instanceof Date) ? currentValue : (currentValue === null || currentValue === undefined ? "" : currentValue.toString().trim());
            var strNew = (newValue instanceof Date) ? newValue : (newValue === null || newValue === undefined ? "" : newValue.toString().trim());
            
            var isDifferent = false;
            if (strCurrent instanceof Date && strNew instanceof Date) {
              isDifferent = strCurrent.getTime() !== strNew.getTime();
            } else if ((strCurrent instanceof Date) !== (strNew instanceof Date)) {
              isDifferent = true;
            } else {
              isDifferent = strCurrent !== strNew;
            }
            
            if (isDifferent) {
              needsUpdate = true;
              currentValues[colIdx] = newValue;
              
              if (fieldKey === "status") {
                statusChanged = true;
                newStatusVal = newValue ? newValue.toString().toUpperCase() : "PENDING";
              }
            }
          }
          
          if (needsUpdate) {
            currentValues[1] = new Date(); 
            
            var finalDataObj = {};
            for (var colStr in configLengkap.fields) {
              var colIdx = parseInt(colStr, 10) - 1;
              var fieldKey = configLengkap.fields[colStr];
              finalDataObj[fieldKey] = currentValues[colIdx];
            }
            if (statusChanged) finalDataObj.status = newStatusVal;
            
            jalankanPipelineStatusMemori(dataArrays, finalDataObj.no_registrasi, finalDataObj.status, finalDataObj);
          }
        } else {
          // ➕ DATA BARU
          var rowLengkap = buatBarisDariObjek("data_lengkap", dataObj);
          dataArrays["data_lengkap"].push(rowLengkap);
          
          var statusAwal = dataObj.status ? dataObj.status.toUpperCase() : "PENDING";
          jalankanPipelineStatusMemori(dataArrays, dataObj.no_registrasi, statusAwal, dataObj);
        }
      }
      
      // 3. TUMPANGKAN KEMBALI HASEL DATA KE GOOGLE SHEETS
      tabNames.forEach(function(name) {
        var sheet = sheetObjects[name];
        if (!sheet) return;
        
        var lastRow = sheet.getLastRow();
        var lastCol = sheet.getLastColumn();
        
        // Bersihkan total area data lama agar tidak ada sisa kolom hantu di grid
        if (lastRow > 1 && lastCol > 0) {
          sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
        }
        
        var updatedRows = dataArrays[name];
        if (updatedRows && updatedRows.length > 0) {
          sheet.getRange(2, 1, updatedRows.length, updatedRows[0].length).setValues(updatedRows);
        }
      });
      
    } finally {
      lock.releaseLock(); 
    }
  } catch(error) {
    Logger.log("Eror Sinkronisasi Batch: " + error.toString());
  }
}

// ==========================================
// 🔀 ENGINE PIPELINE MEMORI RAM (SUPER CEPAT)
// ==========================================
function jalankanPipelineStatusMemori(dataArrays, nomorRegistrasi, statusBaru, dataObj) {
  var normalizedStatus = statusBaru ? statusBaru.toString().toUpperCase() : "PENDING";
  
  var rowVerifikasiNew = buatBarisDariObjek("data_verifikasi", dataObj);
  var rowJerseyNew = buatBarisDariObjek("data_jersey", dataObj);
  var rowMedisNew = buatBarisDariObjek("data_medis", dataObj);
  
  var regColVerif = PETA_KOLOM["data_verifikasi"].regCol - 1;
  var regColPending = PETA_KOLOM["data_peserta_pending"].regCol - 1;
  var regColValid = PETA_KOLOM["data_peserta_valid"].regCol - 1;
  var regColInvalid = PETA_KOLOM["data_peserta_invalid"].regCol - 1;
  var regColJersey = PETA_KOLOM["data_jersey"].regCol - 1;
  var regColMedis = PETA_KOLOM["data_medis"].regCol - 1;
  
  tambahAtauUpdateArrayMemori(dataArrays["data_verifikasi"], regColVerif, nomorRegistrasi, rowVerifikasiNew);
  
  if (normalizedStatus === "VALID") {
    hapusDariArrayMemori(dataArrays["data_peserta_pending"], regColPending, nomorRegistrasi);
    hapusDariArrayMemori(dataArrays["data_peserta_invalid"], regColInvalid, nomorRegistrasi);
    
    tambahAtauUpdateArrayMemori(dataArrays["data_peserta_valid"], regColValid, nomorRegistrasi, rowVerifikasiNew);
    tambahAtauUpdateArrayMemori(dataArrays["data_jersey"], regColJersey, nomorRegistrasi, rowJerseyNew);
    tambahAtauUpdateArrayMemori(dataArrays["data_medis"], regColMedis, nomorRegistrasi, rowMedisNew);
  } 
  else if (normalizedStatus === "INVALID") {
    hapusDariArrayMemori(dataArrays["data_peserta_pending"], regColPending, nomorRegistrasi);
    hapusDariArrayMemori(dataArrays["data_peserta_valid"], regColValid, nomorRegistrasi);
    hapusDariArrayMemori(dataArrays["data_jersey"], regColJersey, nomorRegistrasi);
    hapusDariArrayMemori(dataArrays["data_medis"], regColMedis, nomorRegistrasi);
    
    tambahAtauUpdateArrayMemori(dataArrays["data_peserta_invalid"], regColInvalid, nomorRegistrasi, rowVerifikasiNew);
  } 
  else { 
    hapusDariArrayMemori(dataArrays["data_peserta_valid"], regColValid, nomorRegistrasi);
    hapusDariArrayMemori(dataArrays["data_peserta_invalid"], regColInvalid, nomorRegistrasi);
    hapusDariArrayMemori(dataArrays["data_jersey"], regColJersey, nomorRegistrasi);
    hapusDariArrayMemori(dataArrays["data_medis"], regColMedis, nomorRegistrasi);
    
    tambahAtauUpdateArrayMemori(dataArrays["data_peserta_pending"], regColPending, nomorRegistrasi, rowVerifikasiNew);
  }
}

// ==========================================
// 🔄 ONEDIT LISTENER FOR ADMIN MANUAL CHANGES
// ==========================================
function onEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var sheetName = sheet.getName();
  var row = range.getRow();
  var col = range.getColumn();
  
  if (row <= 1) return; 
  if (!PETA_KOLOM[sheetName]) return; 
  
  var lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000); 
    
    var newValue = e.value !== undefined ? e.value : range.getValue(); 
    if (newValue === undefined || newValue === null) newValue = "";
    
    var configAsal = PETA_KOLOM[sheetName];
    var fieldKunci = configAsal.fields[col];
    
    if (!fieldKunci) return; 
    
    var nomorRegistrasi = sheet.getRange(row, configAsal.regCol).getValue();
    if (!nomorRegistrasi) return;
    
    if (fieldKunci === "status") {
      var statusBaru = newValue ? newValue.toString().toUpperCase() : "PENDING";
      jalankanPipelineStatusSheetSingle(e.source, nomorRegistrasi, statusBaru);
    } else {
      syncKeSemuaSheetSingle(nomorRegistrasi, fieldKunci, newValue, sheetName);
    }
    
  } catch(error) {
    Logger.log("Eror onEdit: " + error.toString());
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// 🛠️ UTILITY OPERATIONS FOR REAL-TIME ONEDIT
// ==========================================
function syncKeSemuaSheetSingle(nomorRegistrasi, fieldKunci, newValue, sheetAsalIgnored) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var listSheet = Object.keys(PETA_KOLOM);
  
  listSheet.forEach(function(targetSheetName) {
    if (targetSheetName === sheetAsalIgnored) return; 
    var configTarget = PETA_KOLOM[targetSheetName];
    var targetCol = -1;
    for (var c in configTarget.fields) {
      if (configTarget.fields[c] === fieldKunci) {
        targetCol = parseInt(c, 10);
        break;
      }
    }
    if (targetCol !== -1) {
      var targetSheet = ss.getSheetByName(targetSheetName);
      if (targetSheet) {
        var dataTarget = targetSheet.getDataRange().getValues();
        var regColIdx = configTarget.regCol - 1;
        for (var i = 1; i < dataTarget.length; i++) {
          var currentRegVal = dataTarget[i][regColIdx];
          if (currentRegVal !== null && currentRegVal !== undefined && currentRegVal.toString().trim() === nomorRegistrasi.toString().trim()) {
            targetSheet.getRange(i + 1, targetCol).setValue(newValue);
            break; 
          }
        }
      }
    }
  });
}

function jalankanPipelineStatusSheetSingle(ss, nomorRegistrasi, statusBaru) {
  var sheetLengkap = ss.getSheetByName("data_lengkap");
  var indexLengkap = dapatkanBarisRegistrasiPusat(sheetLengkap, nomorRegistrasi);
  if (indexLengkap === -1) return;
  
  var colStatusLengkap = dapatkanNoKolomDariField("data_lengkap", "status");
  sheetLengkap.getRange(indexLengkap, colStatusLengkap).setValue(statusBaru);
  
  tarikDataDariSupabase();
}

// ==========================================
// 🧮 UTILITY MANIPULASI ARRAY MEMORI RAM
// ==========================================
function findIndexInMemory(arr, regColIdx, regNo) {
  if (!regNo) return -1;
  for (var i = 0; i < arr.length; i++) {
    var val = arr[i][regColIdx];
    if (val !== null && val !== undefined && val.toString().trim() === regNo.toString().trim()) {
      return i;
    }
  }
  return -1;
}

function tambahAtauUpdateArrayMemori(arr, regColIdx, nomorRegistrasi, rowBaru) {
  var idx = findIndexInMemory(arr, regColIdx, nomorRegistrasi);
  if (idx > -1) {
    arr[idx] = rowBaru;
  } else {
    arr.push(rowBaru);
  }
}

function sampleLog() {
  Logger.log("Current Context Year Verified.");
}

function hapusDariArrayMemori(arr, regColIdx, nomorRegistrasi) {
  if (!nomorRegistrasi) return;
  for (var i = arr.length - 1; i >= 0; i--) {
    var val = arr[i][regColIdx];
    if (val !== null && val !== undefined && val.toString().trim() === nomorRegistrasi.toString().trim()) {
      arr.splice(i, 1);
    }
  }
}

function mapRecordToDataObj(record) {
  return {
    "id": record.id,
    "sync_at": new Date(),
    "created_at": record.created_at || "",
    "no_registrasi": record.nomor_registrasi || "",
    "no_bib": record.nomor_bib || "",
    "nama_lengkap": record.nama_lengkap || "",
    "gender": record.jenis_kelamin || "",
    "email": record.email || "",
    "no_hp": record.nomor_hp || "",
    "alamat": record.alamat_domisili || "",
    "kontak_darurat": record.nama_kontak_darurat || "",
    "hub_darurat": record.hubungan_kontak_darurat || "",
    "telp_darurat": record.no_telp_kontak_darurat || "",
    "gol_darah": record.golongan_darah || "",
    "medis": record.riwayat_medis || "",
    "ukuran_jersey": record.ukuran_jersey || "",
    "custom_bib": record.nama_custom_bib || "",
    "promo": record.jenis_promosi || "",
    "nominal": (record.nominal_bayar !== null && record.nominal_bayar !== undefined) ? record.nominal_bayar : "",
    "bukti": record.bukti_transfer_url || "",
    "status": record.status_pembayaran || "PENDING"
  };
}

function buatBarisDariObjek(sheetName, dataObj) {
  var config = PETA_KOLOM[sheetName];
  if (!config) return null;
  
  var maxCol = 0;
  for (var col in config.fields) {
    maxCol = Math.max(maxCol, parseInt(col, 10));
  }
  
  var row = [];
  for (var i = 0; i < maxCol; i++) { row.push(""); }
  
  for (var colStr in config.fields) {
    var colIdx = parseInt(colStr, 10) - 1;
    var fieldKey = config.fields[colStr];
    row[colIdx] = dataObj[fieldKey] !== undefined ? dataObj[fieldKey] : "";
  }
  return row;
}

function dapatkanBarisRegistrasiPusat(sheet, nomorRegistrasi) {
  var config = PETA_KOLOM["data_lengkap"];
  var regColIdx = config.regCol - 1;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var currentRegVal = data[i][regColIdx];
    if (currentRegVal !== null && currentRegVal !== undefined && currentRegVal.toString().trim() === nomorRegistrasi.toString().trim()) {
      return i + 1;
    }
  }
  return -1;
}

function dapatkanNoKolomDariField(sheetName, fieldKey) {
  var config = PETA_KOLOM[sheetName];
  if (!config) return -1;
  for (var colStr in config.fields) {
    if (config.fields[colStr] === fieldKey) return parseInt(colStr, 10);
  }
  return -1;
}