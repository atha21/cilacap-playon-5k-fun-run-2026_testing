-- =========================================================================
-- PETUNJUK SETUP SUPABASE (STAGING & PRODUCTION)
-- =========================================================================
-- 1. Masuk ke Dashboard Supabase Anda (Proyek A untuk Staging, Proyek B untuk Production).
-- 2. Buka menu "SQL Editor" di panel kiri, lalu klik "New query".
-- 3. Salin dan tempel seluruh isi script SQL ini ke dalam editor tersebut.
-- 4. Klik tombol "Run" untuk mengeksekusi script.
-- 5. Buka menu "Storage", lalu buat bucket baru bernama: bukti-transfer
--    - Pastikan opsi "Public bucket" diaktifkan agar bukti transfer dapat diakses publik.
--    - Tambahkan policy RLS untuk Storage agar pengguna anonim bisa mengunggah (Insert) file.
-- =========================================================================

-- HAPUS TABEL & TRIGGER JIKA SUDAH ADA
DROP TABLE IF EXISTS pendaftar_running CASCADE;

-- PEMBUATAN TABEL PENDAFTAR RUNNING DENGAN ATRIBUT LENGKAP
CREATE TABLE pendaftar_running (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    
    -- Format otomatis via generated column (Contoh: CP-5K-0001)
    nomor_registrasi VARCHAR(50) GENERATED ALWAYS AS ('CP-5K-' || lpad(id::text, 4, '0')) STORED,
    
    -- Format otomatis via generated column (Contoh: 0001)
    nomor_bib VARCHAR(10) GENERATED ALWAYS AS (lpad(id::text, 4, '0')) STORED,
    
    nama_lengkap VARCHAR(255) NOT NULL,
    tanggal_lahir DATE,
    jenis_kelamin VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    nomor_hp VARCHAR(50) NOT NULL,
    alamat_domisili VARCHAR(255),
    
    nama_kontak_darurat VARCHAR(255),
    hubungan_kontak_darurat VARCHAR(100),
    no_telp_kontak_darurat VARCHAR(50),
    golongan_darah VARCHAR(15),
    
    -- Riwayat medis jika kosong otomatis diisi nilai default '-'
    riwayat_medis TEXT DEFAULT '-',
    ukuran_jersey VARCHAR(10),
    
    -- Nama custom BIB jika kosong otomatis mengambil dari nama_lengkap via trigger
    nama_custom_bib VARCHAR(100),
    
    bukti_transfer_url TEXT,
    jenis_promosi VARCHAR(50),
    nominal_bayar NUMERIC,
    
    -- Status pembayaran default 'pending'
    status_pembayaran VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- FUNCTION & TRIGGER UNTUK OTOMATISASI DATA SEBELUM INSERT
CREATE OR REPLACE FUNCTION handle_pendaftar_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- Isi nama_custom_bib dengan nama_lengkap jika kosong/NULL
    IF NEW.nama_custom_bib IS NULL OR TRIM(NEW.nama_custom_bib) = '' THEN
        NEW.nama_custom_bib := NEW.nama_lengkap;
    END IF;

    -- Isi riwayat_medis dengan '-' jika kosong/NULL/hanya spasi
    IF NEW.riwayat_medis IS NULL OR TRIM(NEW.riwayat_medis) = '' THEN
        NEW.riwayat_medis := '-';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pendaftar_defaults
BEFORE INSERT ON pendaftar_running
FOR EACH ROW
EXECUTE FUNCTION handle_pendaftar_defaults();

-- AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE pendaftar_running ENABLE ROW LEVEL SECURITY;

-- KEBIJAKAN RLS UNTUK PENDAFTAR RUNNING
-- Publik/Anonim diperbolehkan untuk memasukkan data (INSERT)
CREATE POLICY "Allow public insert access to pendaftar_running" 
ON pendaftar_running FOR INSERT 
TO anon 
WITH CHECK (true);

-- Publik/Anonim diperbolehkan membaca data pendaftar (SELECT)
CREATE POLICY "Allow public read access to pendaftar_running" 
ON pendaftar_running FOR SELECT 
TO anon 
USING (true);
