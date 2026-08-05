/**
 * CILACAP PLAYON 5K FUN RUN - Website Logic
*/

console.log(
  "Developed by Atha Rizqi, Fullstack Developer Intern\n %cStudent of Informatics Engineering - UPN Veteran Yogyakarta",
  "color: #22c55e; font-size: 14px; font-weight: bold;",
  "color: #9ca3af; font-size: 11px;"
);


// SISTEM SWITCH ENVIRONMENT & KONFIGURASI


const IS_PRODUCTION = false; // Ubah ke true jika ingin beralih ke database resmi

const CONFIG_TESTING = {
  SUPABASE_URL: "https://jmislcnmjvvrbvxcnmhn.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptaXNsY25tanZ2cmJ2eGNubWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMTE1NTksImV4cCI6MjA5OTU4NzU1OX0.tBVQX8hjxbkm0WhYxdZEse_udCjodQvHOsakorhKPBE",
  WA_ADMIN: "6282265056823"
};

const CONFIG_PRODUCTION = {
  SUPABASE_URL: "https://stzyvgwxhrqacyjkbwrm.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0enl2Z3d4aHJxYWN5amtid3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4OTI4MDQsImV4cCI6MjA5OTQ2ODgwNH0.2SNFGFCXGaygTkIaWK8bnsMFwv5gAC4SGtji3XHXH5U",
  WA_ADMIN: "6282177378090"
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
  registrationData: null
};

// SIMULASI TANGGAL HARI INI (SIMULATION DATE IN 2026)
// Ubah/isi variabel ini untuk mensimulasikan tanggal pendaftaran (format: YYYY-MM-DD atau new Date())
// Contoh: const SIMULATED_TODAY = new Date('2026-07-25'); // Super Early Bird
const SIMULATED_TODAY = null;

// LOGIKA HARGA & QRIS DINAMIS
function getPromoDetails() {
  const today = SIMULATED_TODAY || new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12
  const date = today.getDate();

  // Default Normal
  let type = 'Normal';
  let price = 175000;
  let qrImage = 'qrisfix.jpeg';
  let period = 'REGULER PERIODE';

  // Ketentuan di tahun 2026
  if (year === 2026) {
    if (month === 7 && date >= 20 && date <= 31) {
      type = 'Early Bird';
      price = 165000;
      qrImage = 'qrisfix.jpeg';
      period = 'TERSEDIA 1 AGUSTUS - 10 AGUSTUS 2026';
    } else if (month === 8 && date >= 1 && date <= 10) {
      type = 'Early Bird';
      price = 165000;
      qrImage = 'qrisfix.jpeg';
      period = 'TERSEDIA 1 AGUSTUS - 10 AGUSTUS 2026';
    } else {
      period = 'TERSEDIA 11 AGUSTUS - 31 AGUSTUS 2026';
    }
  }

  return { type, price, qrImage, period };
}


// CIRCUIT BREAKER & TRAFFIC PROTECTION


// Fungsi bantu untuk membungkus promise dengan Timeout (default 15 detik)
function withTimeout(promise, ms = 15000) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("GATEWAY_TIMEOUT"));
    }, ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
}

// Cek status heavy load (Manual Valve) sebelum halaman dimuat sepenuhnya
async function checkHeavyLoadConfig() {
  if (!supabaseClient) return;
  try {
    const queryPromise = supabaseClient
      .from('system_config')
      .select('value')
      .eq('key', 'is_heavy_load')
      .single();

    // Valve check dengan timeout perlindungan
    const { data, error } = await withTimeout(queryPromise, 15000);

    if (error) {
      // Tangkap status 429 atau 503 jika terdeteksi dari respons error API Supabase
      if (error.status === 429 || error.status === 503) {
        window.location.href = 'heavy_load.html';
        return;
      }
      console.warn("Gagal mengecek system_config:", error.message);
      return;
    }

    if (data && data.value === true) {
      window.location.href = 'heavy_load.html';
    }
  } catch (err) {
    console.error("Circuit Breaker Cek Gagal:", err);
    // Jika timeout atau error koneksi lainnya, arahkan ke heavy_load.html
    window.location.href = 'heavy_load.html';
  }
}


// ENTRY POINT: DOMContentLoaded

document.addEventListener('DOMContentLoaded', async () => {
  // Jalankan pengecekan heavy load sesegera mungkin
  await checkHeavyLoadConfig();

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
  const categoryEl = document.getElementById('select-category');
  const studentNoteEl = document.getElementById('student-card-note');

  let promo = getPromoDetails();

  // Jika memilih kategori PELAJAR, override jenis promosi dan harga
  if (categoryEl && categoryEl.value === 'PELAJAR') {
    promo = {
      type: 'Pelajar',
      price: 150000,
      qrImage: 'qrisfix.jpeg',
      period: 'KATEGORI PELAJAR'
    };
    if (studentNoteEl) studentNoteEl.classList.remove('hidden');
  } else {
    if (studentNoteEl) studentNoteEl.classList.add('hidden');
  }

  const promoTypeEl = document.getElementById('summary-promo-type');
  const promoTotalEl = document.getElementById('summary-total');
  if (promoTypeEl) promoTypeEl.textContent = promo.type.toUpperCase();
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
  const periodEl = document.getElementById('landing-promo-period');
  const priceEl = document.getElementById('landing-promo-price');
  const normalPriceEl = document.getElementById('landing-normal-price');
  const savingsEl = document.getElementById('landing-savings-text');

  if (badgeEl) badgeEl.textContent = `PROMO ${promo.type.toUpperCase()}`;
  if (periodEl) periodEl.textContent = promo.period;
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

  // Instant scroll to top without smooth behavior
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  renderPage();
}

// Global variable to store the original HTML of the submit button
let originalSubmitBtnHTML = '';

// RESET FORM
function resetRegistrationForm() {
  document.getElementById('reg-form').reset();

  // Reset submit button state and styles
  const submitBtn = document.getElementById('submit-reg-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '';
    submitBtn.style.cursor = '';
    if (originalSubmitBtnHTML) {
      submitBtn.innerHTML = originalSubmitBtnHTML;
    }
  }

  document.getElementById('age-display-text').textContent = '';
  document.getElementById('bib-preview-text').textContent = '';

  // Reset proof upload preview and prevent memory leaks
  const proofInput = document.getElementById('input-payment-proof');
  const previewContainer = document.getElementById('proof-preview-container');
  const previewImg = document.getElementById('proof-preview-img');
  const fileInfo = document.getElementById('proof-file-info');

  if (previewImg && previewImg.src && previewImg.src.startsWith('blob:')) {
    URL.revokeObjectURL(previewImg.src);
  }

  if (proofInput) proofInput.value = '';
  if (previewImg) previewImg.src = '';
  if (fileInfo) fileInfo.textContent = '';
  if (previewContainer) previewContainer.classList.add('hidden');
}

// HELPER FUNCTION: CLIENT-SIDE IMAGE COMPRESSION USING HTML5 CANVAS
// Target: max width 1000px, quality 0.7 (JPEG), output File ~100KB-150KB
function compressImage(file, options = { maxWidth: 1000, quality: 0.7 }) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error("File yang dipilih bukan gambar valid."));
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > options.maxWidth) {
          height = Math.round((height * options.maxWidth) / width);
          width = options.maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF'; // Background putih untuk JPEG
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error("Gagal mengompres gambar."));
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpeg", {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          options.quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}


// SETUP EVENT NAVIGASI (+ Anti-Spam Click)

function setupNavigation() {
  // Smooth scroll links: default browser anchor navigation preserves history and back/forward behavior
  document.documentElement.style.scrollBehavior = 'smooth';

  // Tombol Daftar dari Landing Page (Anti-Spam: disable setelah klik pertama)
  const regTriggerButtons = document.querySelectorAll('.btn-go-daftar');
  // Simpan teks asli setiap tombol agar bisa di-restore setelah navigasi
  const originalBtnTexts = new Map();
  regTriggerButtons.forEach(btn => {
    originalBtnTexts.set(btn, btn.textContent);
  });

  regTriggerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Anti-Spam: Disable semua tombol daftar sekaligus + ubah teks ke "MEMPROSES..."
      regTriggerButtons.forEach(b => {
        b.disabled = true;
        b.style.opacity = '0.5';
        b.style.cursor = 'not-allowed';
        b.textContent = 'MEMPROSES...';
      });

      resetRegistrationForm(); // Bersihkan data form sebelumnya
      navigatePage('registration');

      // Kembalikan status tombol setelah navigasi (halaman landing tersembunyi, tapi restore untuk kembali nanti)
      setTimeout(() => {
        regTriggerButtons.forEach(b => {
          b.disabled = false;
          b.style.opacity = '';
          b.style.cursor = '';
          b.textContent = originalBtnTexts.get(b) || 'DAFTAR SEKARANG';
        });
      }, 1500);
    });
  });

  // Kembali ke Landing
  document.getElementById('reg-back-btn').addEventListener('click', () => {
    navigatePage('landing');
  });

  // Kembali ke Home dari konfirmasi sukses (Anti-Spam)
  const homeBtn = document.getElementById('success-home-btn');
  const originalHomeHTML = homeBtn.innerHTML;
  homeBtn.addEventListener('click', () => {
    // Anti-Spam: Disable tombol kembali agar tidak bisa di-spam
    homeBtn.disabled = true;
    homeBtn.style.opacity = '0.5';
    homeBtn.style.cursor = 'not-allowed';
    homeBtn.innerHTML = '<span class="relative z-10">MEMPROSES...</span>';

    resetRegistrationForm(); // Bersihkan data form untuk pendaftaran berikutnya
    state.registrationData = null; // Hapus data pendaftaran sebelumnya dari memori
    navigatePage('landing');

    // Kembalikan status tombol setelah navigasi
    setTimeout(() => {
      homeBtn.disabled = false;
      homeBtn.style.opacity = '';
      homeBtn.style.cursor = '';
      homeBtn.innerHTML = originalHomeHTML;
    }, 1500);
  });
}


// SETUP LOGIKA FORMULIR & SUBMIT

function setupFormHandlers() {
  const form = document.getElementById('reg-form');
  const submitBtn = document.getElementById('submit-reg-btn');
  if (submitBtn && !originalSubmitBtnHTML) {
    originalSubmitBtnHTML = submitBtn.innerHTML;
  }
  const originalSubmitHTML = originalSubmitBtnHTML || submitBtn.innerHTML;

  // Modal Peringatan Elements
  const modalWarning = document.getElementById('modal-warning');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalAgree = document.getElementById('btn-modal-agree');

  // Payment Proof Elements
  const proofInput = document.getElementById('input-payment-proof');
  const btnSelectProof = document.getElementById('btn-select-proof');
  const previewContainer = document.getElementById('proof-preview-container');
  const previewImg = document.getElementById('proof-preview-img');
  const fileInfo = document.getElementById('proof-file-info');
  const btnRemoveProof = document.getElementById('btn-remove-proof');

  if (btnSelectProof && proofInput) {
    btnSelectProof.addEventListener('click', () => proofInput.click());
    proofInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          alert('File harus berupa gambar (JPG, PNG, dll).');
          proofInput.value = '';
          return;
        }

        // Prevent memory leak by revoking the old preview Blob URL
        if (previewImg && previewImg.src && previewImg.src.startsWith('blob:')) {
          URL.revokeObjectURL(previewImg.src);
        }

        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        fileInfo.textContent = `${file.name} (${sizeMB} MB)`;
        const objectUrl = URL.createObjectURL(file);
        previewImg.src = objectUrl;
        previewContainer.classList.remove('hidden');
      } else {
        previewContainer.classList.add('hidden');
      }
      checkFormValidity();
    });
  }

  if (btnRemoveProof) {
    btnRemoveProof.addEventListener('click', () => {
      // Prevent memory leak by revoking Blob URL
      if (previewImg && previewImg.src && previewImg.src.startsWith('blob:')) {
        URL.revokeObjectURL(previewImg.src);
      }
      proofInput.value = '';
      previewImg.src = '';
      fileInfo.textContent = '';
      previewContainer.classList.add('hidden');
      checkFormValidity();
    });
  }

  // Helper untuk reset state tombol ke aktif/normal
  function resetSubmitButtonState() {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '';
    submitBtn.style.cursor = '';
    submitBtn.innerHTML = originalSubmitHTML;
    checkFormValidity();
  }

  // Helper untuk set state tombol ke Loading/Disable
  function setSubmitButtonLoading() {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.innerHTML = '<span class="relative z-10 flex items-center gap-2"><span>MEMPROSES...</span></span>';
  }


  // DYNAMIC HONEYPOT INJECTION

  const honeypotContainer = document.createElement('div');
  honeypotContainer.style.opacity = '0';
  honeypotContainer.style.position = 'absolute';
  honeypotContainer.style.width = '0';
  honeypotContainer.style.height = '0';
  honeypotContainer.style.overflow = 'hidden';
  honeypotContainer.style.pointerEvents = 'none';
  honeypotContainer.setAttribute('tabindex', '-1');
  honeypotContainer.setAttribute('aria-hidden', 'true');

  const honeyEmail = document.createElement('input');
  honeyEmail.type = 'text';
  honeyEmail.name = 'sub_email_confirmation';
  honeyEmail.id = 'input-honey-email';
  honeyEmail.autocomplete = 'off';
  honeyEmail.setAttribute('tabindex', '-1');

  const honeyPhone = document.createElement('input');
  honeyPhone.type = 'text';
  honeyPhone.name = 'phone_alternative';
  honeyPhone.id = 'input-honey-phone';
  honeyPhone.autocomplete = 'off';
  honeyPhone.setAttribute('tabindex', '-1');

  honeypotContainer.appendChild(honeyEmail);
  honeypotContainer.appendChild(honeyPhone);
  form.appendChild(honeypotContainer);

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
      const words = nameVal.split(' ').slice(0, 2).join(' ').toUpperCase();
      bibPreviewText.textContent = `Nama di BIB: ${words}`;
    } else {
      bibPreviewText.textContent = '';
    }
  };

  nameInput.addEventListener('input', updateBIBPreview);
  bibNameInput.addEventListener('input', updateBIBPreview);

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

  const requiredInputs = ['input-name', 'input-email', 'input-phone', 'select-gender', 'select-category', 'select-jersey-size', 'input-emergency-name', 'input-emergency-relation', 'input-emergency-phone', 'select-blood-type'];
  requiredInputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', checkFormValidity);
    el.addEventListener('change', checkFormValidity);
  });

  // Hubungkan select-category ke updatePromoSummary
  const categoryEl = document.getElementById('select-category');
  if (categoryEl) {
    categoryEl.addEventListener('change', updatePromoSummary);
  }

  // Validasi form: semua field wajib terisi + format email & hp valid + foto bukti bayar terupload
  function checkFormValidity() {
    const name = nameInput.value.trim();
    const email = document.getElementById('input-email').value.trim();
    const phone = document.getElementById('input-phone').value.trim();
    const gender = document.getElementById('select-gender').value;
    const category = categoryEl ? categoryEl.value : '';
    const emergencyName = document.getElementById('input-emergency-name').value.trim();
    const emergencyRelation = document.getElementById('input-emergency-relation').value.trim();
    const emergencyPhone = document.getElementById('input-emergency-phone').value.trim();
    const bloodType = document.getElementById('select-blood-type').value;
    const hasProofFile = proofInput && proofInput.files && proofInput.files.length > 0;

    // Format email minimal mengandung karakter '@' untuk mengakomodasi data dummy/pengujian
    const emailIsValid = email !== '' && email.includes('@');

    // Panjang nomor HP minimal 5 digit agar tetap mendukung data dummy pengujian (misal: 12345)
    const phoneIsDigits = phone !== '' && /^\d+$/.test(phone) && phone.length >= 5 && phone.length <= 15;
    const emergencyPhoneIsDigits = emergencyPhone !== '' && /^\d+$/.test(emergencyPhone) && emergencyPhone.length >= 5 && emergencyPhone.length <= 15;

    const allValid = name && emailIsValid && phoneIsDigits && gender && category && emergencyName && emergencyRelation && emergencyPhoneIsDigits && bloodType && hasProofFile;
    submitBtn.disabled = !allValid;
  }

  // Tombol Salin Nomor Rekening
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

  // LOGIKA MODAL PERINGATAN REGISTRASI
  btnModalCancel.addEventListener('click', () => {
    modalWarning.classList.add('hidden');
    resetSubmitButtonState();
  });

  btnModalAgree.addEventListener('click', async () => {
    if (btnModalAgree.disabled) return;

    // Prevent double clicking / request spamming
    btnModalAgree.disabled = true;
    btnModalAgree.style.opacity = '0.5';
    btnModalAgree.style.cursor = 'not-allowed';

    modalWarning.classList.add('hidden');
    await executeRegistrationSubmit();

    // Re-enable in case user needs to try again on error
    btnModalAgree.disabled = false;
    btnModalAgree.style.opacity = '';
    btnModalAgree.style.cursor = '';
  });

  // INTERCEPT FORM SUBMIT -> TAMPILKAN MODAL TERLEBIH DAHULU
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;

    // 1. CEK HONEYPOT DETECT (Bot Detection)
    const honeyEmailVal = honeyEmail.value.trim();
    const honeyPhoneVal = honeyPhone.value.trim();

    if (honeyEmailVal !== '' || honeyPhoneVal !== '') {
      console.warn("Honeypot triggered! Bot detected.");
      setSubmitButtonLoading();
      setTimeout(() => {
        alert("Pendaftaran Berhasil! Silakan selesaikan pembayaran.");
        form.reset();
        resetSubmitButtonState();
        navigatePage('landing');
      }, 1000);
      return;
    }

    // Tampilkan Pop-Up Peringatan Data Registrasi
    modalWarning.classList.remove('hidden');
  });

  // FUNGSI EKSEKUSI PENDAFTARAN SETELAH "PAHAM, SAYA SETUJU" DIKLIK
  async function executeRegistrationSubmit() {
    setSubmitButtonLoading();

    const emailVal = document.getElementById('input-email').value.trim();
    const phoneVal = document.getElementById('input-phone').value.trim();
    const promo = getPromoDetails();

    try {
      // -------------------------------------------------------------
      // STEP 1 (Pre-Validation DB): Cek apakah email ATAU no_hp sudah terdaftar via RPC aman
      // -------------------------------------------------------------
      if (supabaseClient) {
        const { data: exists, error: checkErr } = await withTimeout(
          supabaseClient.rpc('check_runner_exists', { p_email: emailVal, p_phone: phoneVal }),
          15000
        );

        if (checkErr) {
          if (checkErr.status === 429 || checkErr.status === 503) {
            window.location.href = 'heavy_load.html';
            return;
          }
          throw checkErr;
        }

        if (exists) {
          alert("Email atau Nomor HP sudah terdaftar!");
          resetSubmitButtonState();
          return; // JANGAN lanjutkan ke upload/insert
        }
      }

      const categoryEl = document.getElementById('select-category');
      let finalPromoType = promo.type;
      let finalPromoPrice = promo.price;

      if (categoryEl && categoryEl.value === 'PELAJAR') {
        finalPromoType = 'pelajar';
        finalPromoPrice = 150000;
      }

      const rawFile = proofInput.files[0];
      let publicProofUrl = null;

      // -------------------------------------------------------------
      // STEP 2 & 3: Kompresi Gambar & Upload ke Storage Terlebih Dahulu
      // -------------------------------------------------------------
      if (supabaseClient && rawFile) {
        const compressedFile = await compressImage(rawFile, { maxWidth: 1000, quality: 0.7 });
        const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const cleanEmail = emailVal.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `bukti_${cleanEmail}_${uniqueSuffix}.jpeg`;

        const { error: uploadErr } = await supabaseClient.storage
          .from('bukti-transfer')
          .upload(fileName, compressedFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadErr) {
          console.error("Gagal Upload Storage:", uploadErr);
          throw new Error("Gagal mengunggah foto bukti bayar: " + uploadErr.message);
        }

        const { data: publicUrlData } = supabaseClient.storage
          .from('bukti-transfer')
          .getPublicUrl(fileName);

        publicProofUrl = publicUrlData ? publicUrlData.publicUrl : null;
      }

      // -------------------------------------------------------------
      // STEP 4: Insert Data ke Database (Atomic & Contiguous)
      // -------------------------------------------------------------
      let insertedData = null;

      if (supabaseClient) {
        const tempPendaftar = {
          nama_lengkap: nameInput.value.trim(),
          email: emailVal,
          nomor_hp: phoneVal,
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
          bukti_transfer_url: publicProofUrl,
          jenis_promosi: finalPromoType,
          nominal_bayar: finalPromoPrice,
          status_pembayaran: 'PENDING'
        };

        const insertPromise = supabaseClient
          .from('pendaftar_running')
          .insert([tempPendaftar])
          .select('id, nomor_registrasi, nomor_bib');

        const { data: dbRows, error: insertErr } = await withTimeout(insertPromise, 15000);

        if (insertErr) {
          if (insertErr.code === '23505') {
            alert("❌ Pendaftaran Gagal!\n\nEmail atau Nomor HP ini sudah terdaftar. Silakan gunakan data lain.");
            resetSubmitButtonState();
            return;
          }
          if (insertErr.status === 429 || insertErr.status === 503) {
            window.location.href = 'heavy_load.html';
            return;
          }
          throw insertErr;
        }

        if (!dbRows || dbRows.length === 0) {
          throw new Error("Gagal mendapatkan data baris yang baru dimasukkan dari database.");
        }

        insertedData = {
          ...tempPendaftar,
          id: dbRows[0].id,
          nomor_registrasi: dbRows[0].nomor_registrasi,
          nomor_bib: dbRows[0].nomor_bib
        };

      } else {
        // Mode Demo Offline
        const tempRandomId = Math.floor(Math.random() * 9000) + 1000;
        const mockNoReg = 'CP-5K-' + String(tempRandomId).padStart(4, '0');

        insertedData = {
          nama_lengkap: nameInput.value.trim(),
          email: emailVal,
          nomor_hp: phoneVal,
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
          bukti_transfer_url: 'https://placeholder.storage/bukti_' + mockNoReg + '.jpeg',
          jenis_promosi: finalPromoType,
          nominal_bayar: finalPromoPrice,
          status_pembayaran: 'PENDING',
          id: tempRandomId,
          nomor_registrasi: mockNoReg,
          nomor_bib: String(tempRandomId).padStart(4, '0')
        };
      }

      // -------------------------------------------------------------
      // STEP 5 (Redirect & Reset):
      // -------------------------------------------------------------
      state.registrationData = insertedData;
      resetRegistrationForm();
      navigatePage('confirmation');

    } catch (err) {
      console.error(err);
      if (err.message === 'GATEWAY_TIMEOUT') {
        window.location.href = 'heavy_load.html';
      } else {
        alert("Pendaftaran Gagal: " + err.message);
        resetSubmitButtonState();
      }
    }
  }

  // Tombol Konfirmasi WhatsApp
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
          - Email: ${data.email}
          - No HP: ${data.nomor_hp}
          - Kategori Tiket: ${data.jenis_promosi}
          - Nominal Bayar: Rp ${data.nominal_bayar.toLocaleString('id-ID')}

          Saya telah mentransfer sesuai nominal dan mengunggah foto bukti pembayaran di sistem website. Mohon segera diverifikasi. Terima kasih!`;

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
