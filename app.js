/**
 * CILACAP PLAYON 5K FUN RUN - Application Logic (Vanilla JS)
 */

// ==========================================
// SISTEM SWITCH ENVIRONMENT & KONFIGURASI
// ==========================================
const IS_PRODUCTION = false; // Ubah ke true jika ingin beralih ke database resmi

const CONFIG_TESTING = {
  SUPABASE_URL: "https://jmislcnmjvvrbvxcnmhn.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptaXNsY25tanZ2cmJ2eGNubWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMTE1NTksImV4cCI6MjA5OTU4NzU1OX0.tBVQX8hjxbkm0WhYxdZEse_udCjodQvHOsakorhKPBE",
  WA_ADMIN: "6282265056823"
};

const CONFIG_PRODUCTION = {
  SUPABASE_URL: "https://your-supabase-production-project.supabase.co",
  SUPABASE_ANON_KEY: "your-production-anon-key",
  WA_ADMIN: "6282265056823" // sementara disamakan dengan testing
};

// Ambil konfigurasi aktif berdasarkan status IS_PRODUCTION
const ACTIVE_CONFIG = IS_PRODUCTION ? CONFIG_PRODUCTION : CONFIG_TESTING;

let supabaseClient = null;
const WA_ADMIN_NUMBER = ACTIVE_CONFIG.WA_ADMIN;

if (ACTIVE_CONFIG.SUPABASE_URL && ACTIVE_CONFIG.SUPABASE_URL.indexOf("your-supabase") === -1) {
  supabaseClient = supabase.createClient(ACTIVE_CONFIG.SUPABASE_URL, ACTIVE_CONFIG.SUPABASE_ANON_KEY);
} else {
  console.warn("Supabase credentials are not set. Running in Demo mode.");
}

// STATE UTAMA SPA
const state = {
  page: 'landing', // 'landing' | 'registration' | 'confirmation'
  registrationData: null,
  uploadingFile: null
};

// SIMULASI TANGGAL HARI INI (SIMULATION DATE IN 2026)
// Ubah/isi variabel ini untuk mensimulasikan tanggal pendaftaran (format: YYYY-MM-DD atau new Date())
// Contoh: const SIMULATED_TODAY = new Date('2026-07-25'); // Super Early Bird
const SIMULATED_TODAY = new Date('2026-08-01')

// LOGIKA HARGA & QRIS DINAMIS
function getPromoDetails() {
  const today = SIMULATED_TODAY || new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12
  const date = today.getDate();

  // Default Normal
  let type = 'Normal';
  let price = 175000;
  let qrImage = 'qristest.jpeg';

  // Ketentuan di tahun 2026
  if (year === 2026) {
    if (month === 7 && date >= 20 && date <= 31) {
      type = 'Super Early Bird';
      price = 150000;
      qrImage = 'qristest.jpeg';
    } else if (month === 8 && date >= 1 && date <= 15) {
      type = 'Early Bird';
      price = 165000;
      qrImage = 'qristest.jpeg'; // disesuaikan dengan ejaan file di folder assets
    }
  }

  return { type, price, qrImage };
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupFormHandlers();
  setupHistoryNavigation();
  updateLandingTicketCard(); // Perbarui ticket card di landing sesuai tanggal hari ini
  renderPage();
});

// FORMAT RUPIAH
function fmt(num) {
  return 'Rp ' + num.toLocaleString('id-ID');
}

// HITUNG UMUR BERDASARKAN TANGGAL LAHIR
function calcAge(dobString) {
  if (!dobString) return 0;
  const birth = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// NAVIGASI STATE SPA
function updatePromoSummary() {
  const promo = getPromoDetails();
  const promoTypeEl = document.getElementById('summary-promo-type');
  const promoTotalEl = document.getElementById('summary-total');
  if (promoTypeEl) promoTypeEl.textContent = promo.type;
  if (promoTotalEl) promoTotalEl.textContent = fmt(promo.price);

  // Update gambar QRIS di UI
  const qrisImageEl = document.getElementById('qris-image');
  if (qrisImageEl) {
    qrisImageEl.src = `design-source/assets/${promo.qrImage}`;
  }
}

// UPDATE TICKET CARD DI LANDING PAGE SECARA DINAMIS
function updateLandingTicketCard() {
  const promo = getPromoDetails();
  const NORMAL_PRICE = 175000; // Harga normal sebagai pembanding

  const badgeEl = document.getElementById('landing-promo-badge');
  const priceEl = document.getElementById('landing-promo-price');
  const normalPriceEl = document.getElementById('landing-normal-price');
  const savingsEl = document.getElementById('landing-savings-text');

  if (badgeEl) badgeEl.textContent = `PROMO ${promo.type.toUpperCase()}`;
  if (priceEl) priceEl.textContent = fmt(promo.price);

  if (promo.type === 'Normal') {
    // Tidak ada diskon, sembunyikan coret harga & teks hemat
    if (normalPriceEl) normalPriceEl.classList.add('hidden');
    if (savingsEl) savingsEl.textContent = 'Harga tiket reguler';
    if (badgeEl) badgeEl.textContent = 'HARGA NORMAL';
  } else {
    const savings = NORMAL_PRICE - promo.price;
    if (normalPriceEl) {
      normalPriceEl.classList.remove('hidden');
      normalPriceEl.textContent = fmt(NORMAL_PRICE);
    }
    if (savingsEl) savingsEl.textContent = `Hemat ${fmt(savings)} dari harga tiket normal`;
  }
}

function renderPage() {
  const landingSec = document.getElementById('landing-section');
  const regSec = document.getElementById('registration-section');
  const confirmSec = document.getElementById('confirmation-section');

  landingSec.classList.add('hidden');
  regSec.classList.add('hidden');
  confirmSec.classList.add('hidden');

  if (state.page === 'landing') {
    landingSec.classList.remove('hidden');
  } else if (state.page === 'registration') {
    regSec.classList.remove('hidden');
    updatePromoSummary();
  } else if (state.page === 'confirmation') {
    confirmSec.classList.remove('hidden');
    renderConfirmationDetails();
  }
}

function setupHistoryNavigation() {
  const historyState = window.history.state || {};
  state.page = historyState.page || state.page;
  window.history.replaceState({ page: state.page }, '', window.location.pathname);

  window.addEventListener('popstate', (event) => {
    const nextState = event.state || { page: 'landing' };
    state.page = nextState.page || 'landing';
    renderPage();
  });
}

function navigatePage(newPage, options = { push: true }) {
  if (state.page === newPage) return;
  state.page = newPage;

  const stateObject = { page: newPage };
  if (options.push) {
    window.history.pushState(stateObject, '', window.location.pathname);
  } else {
    window.history.replaceState(stateObject, '', window.location.pathname);
  }

  window.scrollTo(0, 0);
  renderPage();
}

// RESET FORM
function resetRegistrationForm() {
  document.getElementById('reg-form').reset();
  state.uploadingFile = null;
  
  // Sembunyikan preview file & kembalikan placeholder upload
  document.getElementById('file-preview-container').classList.add('hidden');
  document.getElementById('upload-placeholder').classList.remove('hidden');
  document.getElementById('submit-reg-btn').disabled = true;
  document.getElementById('age-display-text').textContent = '';
  document.getElementById('bib-preview-text').textContent = '';
}

// SETUP EVENT NAVIGASI
function setupNavigation() {
  // Smooth scroll links: default browser anchor navigation preserves history and back/forward behavior
  document.documentElement.style.scrollBehavior = 'smooth';

  // Tombol Daftar dari Landing Page
  const regTriggerButtons = document.querySelectorAll('.btn-go-daftar');
  regTriggerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      resetRegistrationForm(); // Bersihkan data form sebelumnya
      navigatePage('registration');
    });
  });

  // Kembali ke Landing
  document.getElementById('reg-back-btn').addEventListener('click', () => {
    navigatePage('landing');
  });

  // Kembali ke Home dari konfirmasi sukses
  document.getElementById('success-home-btn').addEventListener('click', () => {
    resetRegistrationForm(); // Bersihkan data form untuk pendaftaran berikutnya
    state.registrationData = null; // Hapus data pendaftaran sebelumnya dari memori
    navigatePage('landing');
  });
}

// SETUP LOGIKA FORMULIR & SUBMIT
function setupFormHandlers() {
  const form = document.getElementById('reg-form');
  const submitBtn = document.getElementById('submit-reg-btn');
  const fileInput = document.getElementById('proof-file-input');
  const uploadPlaceholder = document.getElementById('upload-placeholder');
  const filePreviewContainer = document.getElementById('file-preview-container');
  const filePreviewImg = document.getElementById('file-preview-img');
  const fileNameText = document.getElementById('file-name-text');
  const removeFileBtn = document.getElementById('remove-file-btn');

  // Input DOB untuk kalkulasi usia dinamis
  const dobInput = document.getElementById('input-dob');
  const ageDisplayText = document.getElementById('age-display-text');
  dobInput.addEventListener('change', () => {
    const age = calcAge(dobInput.value);
    if (age > 0) {
      ageDisplayText.textContent = `Usia: ${age} tahun`;
    } else {
      ageDisplayText.textContent = '';
    }
  });

  // Input nama untuk preview Nama di BIB
  const nameInput = document.getElementById('input-name');
  const bibNameInput = document.getElementById('input-bib-name');
  const bibPreviewText = document.getElementById('bib-preview-text');

  const updateBIBPreview = () => {
    const bibVal = bibNameInput.value.trim();
    const nameVal = nameInput.value.trim();
    if (bibVal !== '') {
      bibPreviewText.textContent = `Nama di BIB: ${bibVal.toUpperCase()}`;
    } else if (nameVal !== '') {
      // Ambil maksimal 2 kata pertama
      const words = nameVal.split(' ').slice(0, 2).join(' ').toUpperCase();
      bibPreviewText.textContent = `Nama di BIB: ${words}`;
    } else {
      bibPreviewText.textContent = '';
    }
  };

  nameInput.addEventListener('input', updateBIBPreview);
  bibNameInput.addEventListener('input', updateBIBPreview);

  // Trigger file upload dialog
  uploadPlaceholder.addEventListener('click', () => {
    fileInput.click();
  });

  // Saat file dipilih
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran file maksimal adalah 5MB!");
        fileInput.value = "";
        return;
      }
      state.uploadingFile = file;
      fileNameText.textContent = file.name;

      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        filePreviewImg.src = url;
        filePreviewImg.classList.remove('hidden');
      } else {
        filePreviewImg.classList.add('hidden'); // PDF/etc
      }

      uploadPlaceholder.classList.add('hidden');
      filePreviewContainer.classList.remove('hidden');
    }
    checkFormValidity();
  });

  // Hapus file terpilih
  removeFileBtn.addEventListener('click', () => {
    fileInput.value = "";
    state.uploadingFile = null;
    uploadPlaceholder.classList.remove('hidden');
    filePreviewContainer.classList.add('hidden');
    checkFormValidity();
  });

  // Enforce numeric-only for phone inputs and wire validation listeners
  const phoneInputEl = document.getElementById('input-phone');
  const emergencyPhoneEl = document.getElementById('input-emergency-phone');

  function stripNonDigits(el) {
    if (!el) return;
    el.addEventListener('input', function () {
      const oldVal = this.value;
      const cleaned = oldVal.replace(/\D/g, '');
      if (oldVal !== cleaned) this.value = cleaned;
      checkFormValidity();
    });
  }

  stripNonDigits(phoneInputEl);
  stripNonDigits(emergencyPhoneEl);

  // Required fields (medical history is optional)
  const requiredInputs = ['input-name', 'input-email', 'input-phone', 'select-gender', 'select-jersey-size', 'input-emergency-name', 'input-emergency-relation', 'input-emergency-phone', 'select-blood-type'];
  requiredInputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', checkFormValidity);
    el.addEventListener('change', checkFormValidity);
  });

  const bankCopyBtn = document.getElementById('btn-copy-bank');
  const bankCopyFeedback = document.getElementById('bank-copy-feedback');
  if (bankCopyBtn) {
    bankCopyBtn.addEventListener('click', async () => {
      const accountNumber = '0961-4810-31';
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(accountNumber);
        } else {
          const tempInput = document.createElement('input');
          tempInput.value = accountNumber;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
        }
        if (bankCopyFeedback) {
          bankCopyFeedback.textContent = 'Nomor rekening disalin ke clipboard.';
          bankCopyFeedback.classList.remove('hidden');
          setTimeout(() => bankCopyFeedback.classList.add('hidden'), 2400);
        }
      } catch (copyError) {
        alert('Gagal menyalin nomor rekening. Silakan salin secara manual.');
      }
    });
  }

  function checkFormValidity() {
    const name = nameInput.value.trim();
    const email = document.getElementById('input-email').value.trim();
    const phone = document.getElementById('input-phone').value.trim();
    const gender = document.getElementById('select-gender').value;
    const emergencyName = document.getElementById('input-emergency-name').value.trim();
    const emergencyRelation = document.getElementById('input-emergency-relation').value.trim();
    const emergencyPhone = document.getElementById('input-emergency-phone').value.trim();
    const bloodType = document.getElementById('select-blood-type').value;
    const hasFile = state.uploadingFile !== null;

    const phoneIsDigits = phone !== '' && /^\d+$/.test(phone);
    const emergencyPhoneIsDigits = emergencyPhone !== '' && /^\d+$/.test(emergencyPhone);

    const allValid = name && email && phoneIsDigits && gender && emergencyName && emergencyRelation && emergencyPhoneIsDigits && bloodType && hasFile;
    submitBtn.disabled = !allValid;
  }

  // Submit Data ke Supabase
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "MEMPROSES PENDAFTARAN...";

    const promo = getPromoDetails();
    const tempRandomId = Math.floor(Math.random() * 9000) + 1000;
    let fileUrl = "";

    try {
      if (!supabaseClient) {
        // Mode demo jika Supabase tidak diset
        console.warn("Supabase tidak aktif. Menggunakan Mode Demo Simulasi.");
        fileUrl = "https://images.unsplash.com/photo-1522040942177-269680274214?w=400";
      } else {
        // 1. Upload Bukti Pembayaran ke Supabase Storage Bucket 'bukti-transfer'
        const fileExt = state.uploadingFile.name.split('.').pop();
        const filePath = `receipts/CP_${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('bukti-transfer')
          .upload(filePath, state.uploadingFile);

        if (uploadError) throw uploadError;

        // Dapatkan URL Public File Bukti
        const { data: publicUrlData } = supabaseClient.storage
          .from('bukti-transfer')
          .getPublicUrl(filePath);

        fileUrl = publicUrlData.publicUrl;
      }

      // 2. Simpan data pendaftaran ke PostgreSQL Supabase
      const newPendaftar = {
        nama_lengkap: nameInput.value.trim(),
        email: document.getElementById('input-email').value.trim(),
        nomor_hp: document.getElementById('input-phone').value.trim(),
        tanggal_lahir: dobInput.value || null,
        jenis_kelamin: document.getElementById('select-gender').value,
        alamat_domisili: document.getElementById('input-domicile').value.trim() || null,
        nama_kontak_darurat: document.getElementById('input-emergency-name').value.trim() || null,
        hubungan_kontak_darurat: document.getElementById('input-emergency-relation').value.trim() || null,
        no_telp_kontak_darurat: document.getElementById('input-emergency-phone').value.trim() || null,
        golongan_darah: document.getElementById('select-blood-type').value || null,
        riwayat_medis: document.getElementById('input-medical-history').value.trim() || null,
        ukuran_jersey: document.getElementById('select-jersey-size').value || null,
        nama_custom_bib: bibNameInput.value.trim() || null,
        bukti_transfer_url: fileUrl,
        jenis_promosi: promo.type,
        nominal_bayar: promo.price,
        status_pembayaran: 'PENDING'
      };

      let insertedData = null;

      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from('pendaftar_running')
          .insert([newPendaftar])
          .select('*');

        if (error) throw error;
        if (data && data.length > 0) {
          insertedData = data[0];
        }
      } else {
        // Mock data untuk mode demo
        insertedData = {
          ...newPendaftar,
          id: tempRandomId,
          nomor_registrasi: 'CP-5K-' + String(tempRandomId).padStart(4, '0'),
          nomor_bib: String(tempRandomId).padStart(4, '0')
        };
      }

      state.registrationData = insertedData;
      navigatePage('confirmation');

    } catch (err) {
      alert("Pendaftaran Gagal: " + err.message);
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "DAFTAR SEKARANG";
    }
  });

  // Setup Listener untuk WhatsApp Confirmation
  const waConfirmBtn = document.getElementById('btn-wa-confirm');
  if (waConfirmBtn) {
    waConfirmBtn.addEventListener('click', () => {
      const data = state.registrationData;
      if (!data) return;

      const message = `Halo Admin Cilacap Playon! Saya ingin konfirmasi pendaftaran.

Detail Data:
- NO REG: ${data.nomor_registrasi}
- NO BIB: ${data.nomor_bib}
- Nama Lengkap: ${data.nama_lengkap}
- Nama Custom BIB: ${data.nama_custom_bib || '-'}
- Jenis Kelamin: ${data.jenis_kelamin}
- Email: ${data.email}
- No HP: ${data.nomor_hp}
- Kategori Tiket: ${data.jenis_promosi}
- Nominal Bayar: Rp ${data.nominal_bayar.toLocaleString('id-ID')}

Saya sudah mentransfer sesuai nominal dan mengunggah bukti pembayaran di website. Mohon segera diverifikasi. Terima kasih!`;

      const waUrl = `https://wa.me/${WA_ADMIN_NUMBER}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
    });
  }
}

// RENDER INFORMASI HALAMAN KONFIRMASI SUKSES & BIB CARD SVG
function renderConfirmationDetails() {
  const data = state.registrationData;
  if (!data) return;

  // Nama Pertama Pelari untuk teks selamat
  const firstName = data.nama_lengkap.split(' ')[0].toUpperCase();
  document.getElementById('success-greet-name').textContent = `${firstName}!`;

  // Detail Tabel Registrasi
  document.getElementById('confirm-id').textContent = data.nomor_registrasi;
  document.getElementById('confirm-bib').textContent = data.nomor_bib;
  document.getElementById('confirm-name').textContent = data.nama_lengkap;
  document.getElementById('confirm-email').textContent = data.email;
  document.getElementById('confirm-phone').textContent = data.nomor_hp;
  document.getElementById('confirm-gender').textContent = data.jenis_kelamin;
  document.getElementById('confirm-jersey').textContent = data.ukuran_jersey || '-';
  document.getElementById('confirm-promo').textContent = data.jenis_promosi;
  document.getElementById('confirm-total').textContent = fmt(data.nominal_bayar);

  // Render BIBCard SVG Dinamis
  const bibDisplayName = data.nama_custom_bib && data.nama_custom_bib.trim() !== '' 
    ? data.nama_custom_bib.toUpperCase() 
    : data.nama_lengkap.split(' ').slice(0, 2).join(' ').toUpperCase();

  // Set nomor BIB & nama pelari di dalam SVG
  const svgBibNumberEl = document.getElementById('svg-bib-number');
  const svgRunnerNameEl = document.getElementById('svg-runner-name');

  if (svgBibNumberEl) svgBibNumberEl.textContent = data.nomor_bib;
  if (svgRunnerNameEl) {
    svgRunnerNameEl.textContent = bibDisplayName.length > 14 
      ? bibDisplayName.substring(0, 14) + '…' 
      : bibDisplayName;
  }
}
