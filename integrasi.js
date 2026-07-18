// ==========================================
// ⚙️ PENGATURAN UTAMA SUPABASE
// ==========================================
var SUPABASE_URL = "https://jmislcnmjvvrbvxcnmhn.supabase.co"; 
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptaXNsY25tanZ2cmJ2eGNubWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMTE1NTksImV4cCI6MjA5OTU4NzU1OX0.tBVQX8hjxbkm0WhYxdZEse_udCjodQvHOsakorhKPBE";   
var NAMA_TABEL_SUPABASE = "pendaftar_running";            

// ==========================================
// 🗺️ PETA KOLOM SPREADSHEET 
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
  "peserta_pending": {
    regCol: 2, 
    fields: { 
      1:"id", 2:"no_registrasi", 3:"no_bib", 4:"nama_lengkap", 5:"custom_bib", 
      6:"gender", 7:"no_hp", 8:"email", 9:"ukuran_jersey", 10:"promo", 
      11:"nominal", 12:"bukti", 13:"status" 
    }
  },
  "peserta_valid": {
    regCol: 2, 
    fields: { 
      1:"id", 2:"no_registrasi", 3:"no_bib", 4:"nama_lengkap", 5:"custom_bib", 
      6:"gender", 7:"no_hp", 8:"email", 9:"ukuran_jersey", 10:"promo", 
      11:"nominal", 12:"bukti", 13:"status" 
    }
  },
  "peserta_invalid": {
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

function mapFieldToSupabaseColumn(fieldKey) {
  var map = {
    "no_registrasi": "nomor_registrasi", "no_bib": "nomor_bib", "nama_lengkap": "nama_lengkap",
    "gender": "jenis_kelamin", "email": "email", "no_hp": "nomor_hp", "alamat": "alamat_domisili",
    "kontak_darurat": "nama_kontak_darurat", "hub_darurat": "hubungan_kontak_darurat",
    "telp_darurat": "no_telp_kontak_darurat", "gol_darah": "golongan_darah", "medis": "riwayat_medis",
    "ukuran_jersey": "ukuran_jersey", "custom_bib": "nama_custom_bib", "promo": "jenis_promosi",
    "nominal": "nominal_bayar", "bukti": "bukti_transfer_url", "status": "status_pembayaran"
  };
  return map[fieldKey] || null;
}

// ==========================================
// 🔍 PENCARI PETA KONFIGURASI PINTAR (ANTI MISMATCH NAMA TAB)
// ==========================================
function dapatkanKeyConfigSesuai(sheetName) {
  var cleanTarget = sheetName.toLowerCase().replace(/[\s_]/g, "");
  var keys = Object.keys(PETA_KOLOM);
  for (var i = 0; i < keys.length; i++) {
    var cleanKey = keys[i].toLowerCase().replace(/[\s_]/g, "");
    if (cleanTarget === cleanKey || cleanTarget.indexOf(cleanKey) !== -1 || cleanKey.indexOf(cleanTarget) !== -1) {
      return keys[i];
    }
  }
  return null;
}

function dapatkanSheetSesuai(ss, namaTarget) {
  var sheets = ss.getSheets();
  var cleanTarget = namaTarget.toLowerCase().replace(/[\s_]/g, "");
  for (var i = 0; i < sheets.length; i++) {
    var cleanSheetName = sheets[i].getName().toLowerCase().replace(/[\s_]/g, "");
    if (cleanSheetName === cleanTarget || cleanSheetName.indexOf(cleanTarget) !== -1) return sheets[i];
  }
  return ss.getSheetByName(namaTarget); 
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 SYSTEM MASTER')
    .addItem('⚡ AKTIFKAN SISTEM SINKRONISASI (Klik 1x)', 'pasangTriggerOtomatis')
    .addItem('🔄 RESET & TARIK TOTAL DATA', 'tarikDataDariSupabase')
    .addToUi();
}

function pasangTriggerOtomatis() {
  var functionName = "handleEdit";
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === functionName) ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger(functionName).forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet()).onEdit().create();
  SpreadsheetApp.getUi().alert("Sistem Sinkronisasi V7.2 Aktif.");
}

function tarikDataDariSupabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var url = SUPABASE_URL + "/rest/v1/" + NAMA_TABEL_SUPABASE + "?order=id.asc";
  var options = { 
    "method": "get", 
    "headers": { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }, 
    "muteHttpExceptions": true 
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      SpreadsheetApp.getUi().alert("❌ Gagal Terkoneksi ke Supabase.");
      return;
    }
    
    var records = JSON.parse(response.getContentText());
    var tabNames = Object.keys(PETA_KOLOM);
    var dataArrays = {};
    tabNames.forEach(function(n) { dataArrays[n] = []; });
    
    for (var i = 0; i < records.length; i++) {
      var dataObj = mapRecordToDataObj(records[i]);
      var statusAktif = dataObj.status ? dataObj.status.toUpperCase().trim() : "PENDING";
      
      dataArrays["data_lengkap"].push(buatBarisDariObjek("data_lengkap", dataObj));
      dataArrays["data_verifikasi"].push(buatBarisDariObjek("data_verifikasi", dataObj));
      
      if (statusAktif === "VALID") {
        dataArrays["peserta_valid"].push(buatBarisDariObjek("peserta_valid", dataObj));
        dataArrays["data_jersey"].push(buatBarisDariObjek("data_jersey", dataObj));
        dataArrays["data_medis"].push(buatBarisDariObjek("data_medis", dataObj));
      } else if (statusAktif === "INVALID") {
        dataArrays["peserta_invalid"].push(buatBarisDariObjek("peserta_invalid", dataObj));
      } else {
        dataArrays["peserta_pending"].push(buatBarisDariObjek("peserta_pending", dataObj));
      }
    }
    
    tabNames.forEach(function(name) {
      var sheet = dapatkanSheetSesuai(ss, name);
      if (!sheet) return;
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow > 1 && lastCol > 0) sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      
      var rows = dataArrays[name];
      if (rows && rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }
    });
    
    SpreadsheetApp.getUi().alert("🚀 BERHASIL RESET RE-ALIGN TOTAL!");
  } catch(e) {
    SpreadsheetApp.getUi().alert("Eror Reset: " + e.toString());
  }
}

// ==========================================
// ⚡ CORE DETECTOR ENGINE (V7.2 FUZZY MOVER)
// ==========================================
function handleEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var sheetName = sheet.getName();
  var row = range.getRow();
  var col = range.getColumn();
  
  if (row <= 1) return;
  
  // Deteksi konfigurasi asal menggunakan fuzzy matching pintarnya
  var namaConfigAsal = dapatkanKeyConfigSesuai(sheetName);
  if (!namaConfigAsal) return; 
  
  var configAsal = PETA_KOLOM[namaConfigAsal];
  var fieldKunci = configAsal.fields[col];
  if (!fieldKunci || fieldKunci === "id") return;
  
  var idSupabase = sheet.getRange(row, 1).getValue();
  if (!idSupabase) return;
  
  var newValue = e.value !== undefined ? e.value : range.getValue();
  if (newValue === undefined || newValue === null) newValue = "";
  
  var supabaseColumn = mapFieldToSupabaseColumn(fieldKunci);
  if (!supabaseColumn) return;
  
  var urlPatch = SUPABASE_URL + "/rest/v1/" + NAMA_TABEL_SUPABASE + "?id=eq." + idSupabase;
  var payload = {};
  payload[supabaseColumn] = (fieldKunci === "status") ? newValue.toString().toUpperCase().trim() : newValue;
  
  var options = {
    "method": "patch",
    "headers": { 
      "apikey": SUPABASE_KEY, 
      "Authorization": "Bearer " + SUPABASE_KEY, 
      "Content-Type": "application/json",
      "Prefer": "return=representation" 
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  var res = UrlFetchApp.fetch(urlPatch, options);
  var resCode = res.getResponseCode();
  var resText = res.getContentText();
  
  var jumlahBarisTerubah = 0;
  try {
    var jsonRes = JSON.parse(resText);
    if (Array.isArray(jsonRes)) jumlahBarisTerubah = jsonRes.length;
  } catch(err) {}
  
  if ((resCode !== 200 && resCode !== 204) || (resCode === 200 && jumlahBarisTerubah === 0)) {
    range.setValue(e.oldValue || ""); 
    SpreadsheetApp.getUi().alert("❌ SUPABASE MENOLAK PERUBAHAN! Perubahan dibatalkan otomatis.");
    return;
  }
  
  // PROSES STRATEGI LOCAL ROUTING DENGAN TOLERANSI NAMA TAB V7.2
  if (fieldKunci === "status") {
    var newStatus = newValue.toString().toUpperCase().trim();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dataObj = ekstrakObjekDariBarisAktif(sheet, row, configAsal);
    dataObj.status = newStatus;
    
    updateStatusLokalTabelMaster(ss, idSupabase, newStatus);
    
    if (newStatus === "VALID") {
      appendRowLokal(ss, "peserta_valid", dataObj);
      appendRowLokal(ss, "data_jersey", dataObj);
      appendRowLokal(ss, "data_medis", dataObj);
    } else if (newStatus === "INVALID") {
      appendRowLokal(ss, "peserta_invalid", dataObj);
    } else if (newStatus === "PENDING") {
      appendRowLokal(ss, "peserta_pending", dataObj);
    }
    
    // Gunakan namaConfigAsal untuk mengecek jenis tab agar tidak salah deteksi row delete
    if (namaConfigAsal !== "data_lengkap" && namaConfigAsal !== "data_verifikasi") {
      sheet.deleteRow(row);
    } else {
      var oldStatus = e.oldValue ? e.oldValue.toString().toUpperCase().trim() : "PENDING";
      hapusRowLokalDariTabStatus(ss, oldStatus, idSupabase);
    }
  }
}

function ekstrakObjekDariBarisAktif(sheet, row, config) {
  var maxCol = 0;
  for (var col in config.fields) maxCol = Math.max(maxCol, parseInt(col, 10));
  var vals = sheet.getRange(row, 1, 1, maxCol).getValues()[0];
  var data = {};
  for (var colStr in config.fields) {
    var colIdx = parseInt(colStr, 10) - 1;
    var fieldKey = config.fields[colStr];
    data[fieldKey] = vals[colIdx] !== undefined ? vals[colIdx] : "";
  }
  return data;
}

function appendRowLokal(ss, targetSheetName, dataObj) {
  var sheet = dapatkanSheetSesuai(ss, targetSheetName);
  if (!sheet) return;
  var rowArray = buatBarisDariObjek(targetSheetName, dataObj);
  sheet.appendRow(rowArray);
}

function updateStatusLokalTabelMaster(ss, idSupabase, newStatus) {
  var tabs = ["data_lengkap", "data_verifikasi"];
  tabs.forEach(function(tName) {
    var sheet = dapatkanSheetSesuai(ss, tName);
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] !== undefined && data[i][0] !== null && data[i][0].toString() === idSupabase.toString()) {
        var conf = PETA_KOLOM[tName];
        for (var c in conf.fields) {
          if (conf.fields[c] === "status") {
            sheet.getRange(i + 1, parseInt(c, 10)).setValue(newStatus);
            break;
          }
        }
        break;
      }
    }
  });
}

function hapusRowLokalDariTabStatus(ss, oldStatus, idSupabase) {
  var targets = [];
  if (oldStatus === "VALID") targets = ["peserta_valid", "data_jersey", "data_medis"];
  else if (oldStatus === "INVALID") targets = ["peserta_invalid"];
  else targets = ["peserta_pending"];
  
  targets.forEach(function(tName) {
    var sheet = dapatkanSheetSesuai(ss, tName);
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][0] !== undefined && data[i][0] !== null && data[i][0].toString() === idSupabase.toString()) {
        sheet.deleteRow(i + 1);
      }
    }
  });
}

function mapRecordToDataObj(record) {
  return {
    "id": record.id, "sync_at": new Date(), "created_at": record.created_at || "",
    "no_registrasi": record.nomor_registrasi || "", "no_bib": record.nomor_bib || "",
    "nama_lengkap": record.nama_lengkap || "", "gender": record.jenis_kelamin || "",
    "email": record.email || "", "no_hp": record.nomor_hp || "", "alamat": record.alamat_domisili || "",
    "kontak_darurat": record.nama_kontak_darurat || "", "hub_darurat": record.hubungan_kontak_darurat || "",
    "telp_darurat": record.no_telp_kontak_darurat || "", "gol_darah": record.golongan_darah || "",
    "medis": record.riwayat_medis || "", "ukuran_jersey": record.ukuran_jersey || "",
    "custom_bib": record.nama_custom_bib || "", "promo": record.jenis_promosi || "",
    "nominal": record.nominal_bayar !== null ? record.nominal_bayar : "",
    "bukti": record.bukti_transfer_url || "", "status": record.status_pembayaran || "PENDING"
  };
}

function buatBarisDariObjek(sheetName, dataObj) {
  var config = PETA_KOLOM[sheetName];
  var maxCol = 0;
  for (var col in config.fields) maxCol = Math.max(maxCol, parseInt(col, 10));
  var row = [];
  for (var i = 0; i < maxCol; i++) row.push("");
  for (var colStr in config.fields) {
    var colIdx = parseInt(colStr, 10) - 1;
    var fieldKey = config.fields[colStr];
    row[colIdx] = dataObj[fieldKey] !== undefined ? dataObj[fieldKey] : "";
  }
  return row;
}