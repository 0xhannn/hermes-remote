# Realtime Platform Toggle (Hermes Remote) Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Tambahkan kemampuan mengaktifkan/nonaktifkan platform pesan (WhatsApp, Telegram) secara realtime dari UI Hermes Remote — backend update config + restart gateway.

**Architecture:** Backend FastAPI menambah 2 endpoint (status + toggle). Toggle menulis `enabled: true/false` ke config Hermes lalu memicu restart gateway. Frontend Settings menampilkan kartu per platform dengan status live + tombol toggle + modal konfirmasi. Safeguard khusus: WhatsApp TIDAK di-restart otomatis untuk menghindari QR/re-login/captcha.

**Tech Stack:** Python FastAPI (backend), vanilla JS/HTML (frontend logs/settings), YAML config Hermes, subprocess/psutil untuk deteksi & restart gateway.

---

## Current context / assumptions

- Backend sudah punya `load_yaml()` / `save_yaml()` + `CONFIG_PATH` (`server/hermes_brain_api.py:178,223`). Pola edit config sudah dipakai fitur provider (Buka Brain → Perbaiki API key).
- `CONFIG_PATH` saat ini = `C:\Users\Parhan\AppData\Local\hermes\config.yaml` (env `HERMES_CONFIG_PATH` bisa override).
- Config yang terbaca TIDAK memiliki section `platforms`. `enabled: false` di config hanya milik `telemetry.shared_metrics`. → sumber definisi platform masih harus dilacak (investigasi Task 1).
- Frontend: halaman logs (`logs/index.html`) sudah punya kartu diagnosis + tombol dismiss; halaman Settings ada di route `/settings/`.
- Platform aktif per sesi: local, telegram, whatsapp, okx-a2a (dari runtime Hermes).

## Proposed approach

1. **Task 1 — Investigasi sebelum bangun:** temukan di mana platform didefinisikan (config/env/file terpisah) & bagaimana gateway di-restart pada env Windows laptop vs VPS Linux. Output: dokumen temuan singkat + mekanisme restart yang dipilih. (Blocking untuk task 2+.)
2. **Task 2-3 — Backend:** endpoint `GET /api/hermes/platforms` (status) & `POST /api/hermes/platforms/toggle` (tulis config + restart gateway), dengan backup config & rollback.
3. **Task 4 — Safeguard WhatsApp:** toggle WhatsApp ON yang butuh re-login → tolak otomatis, kembalikan kode khusus yang minta konfirmasi manual (hindari QR/captcha).
4. **Task 5-6 — Frontend:** halaman Settings + seksi Platform; kartu per platform; tombol toggle; modal konfirmasi untuk restart yang berisiko.
5. **Task 7 — Verifikasi end-to-end** (curl + browser nyata).

## Step-by-step plan

### Task 1: Investigasi mekanisme platform & restart gateway
**Objective:** Temukan lokasi & skema definisi platform + cara restart gateway yang aman.
**Files:**
- Read: config Hermes saat ini, dokumentasi gateway Hermes (skills hermes-operations), proses yang berjalan.
**Step 1:** Grep config + docs utk `platforms`, `gateway`, `telegram`, `whatsapp`.
**Step 2:** Identifikasi proses gateway (nama/PID), apakah service systemd (VPS) / process (Windows).
**Step 3:** Tulis temuan di `.hermes/plans/` (append ke file ini) + tentukan `restart_gateway()` strategy per platform/env.
**Ship:** keputusan restart mechanism (systemd restart vs kill+spawn), skema config section platform.

### Task 2: Endpoint GET status platform
**Objective:** API baca status platform (dari config + state gateway).
**Files:**
- Modify: `server/hermes_brain_api.py`
**Step 1:** Tambah `GET /api/hermes/platforms` → balas list `{name, enabled, running}`.
**Step 2:** `running` dideteksi dari proses gateway/log gateway (pakai psutil).
**Step 3:** Verifikasi: `curl -b <jar> http://localhost:8093/api/hermes/platforms` → 200 JSON.
**Step 4:** Commit.

### Task 3: Endpoint POST toggle platform
**Objective:** Tulis `enabled` ke config + restart gateway.
**Files:**
- Modify: `server/hermes_brain_api.py`
**Step 1:** Backup config → `config.yaml.bak-<ts>`.
**Step 2:** `save_yaml` dengan `platforms.<name>.enabled = value`.
**Step 3:** Panggil `restart_gateway()`; jika gagal → rollback config + error JSON.
**Step 4:** Verifikasi: toggle Telegram off → cek file config berubah + proses gateway ter-restart; toggle on → kembali.
**Step 5:** Commit.

### Task 4: Safeguard WhatsApp (anti-QR)
**Objective:** Jangan paksa restart WhatsApp yang butuh re-login.
**Files:**
- Modify: `server/hermes_brain_api.py`
**Step 1:** Deteksi status login WhatsApp (dari gateway log: QR/session valid).
**Step 2:** Jika toggle ON & sesi tidak valid → balas `{success:false, code:"NEED_MANUAL_RELOGIN"}` + jangan restart; instruksikan manual.
**Step 3:** Verifikasi: coba toggle WhatsApp pada sesi kosong → ditolak, tidak ada restart.
**Step 4:** Commit.

### Task 5: Frontend Settings — seksi Platform
**Objective:** UI tampil daftar platform + status.
**Files:**
- Modify: `settings/index.html` (atau halaman settings yang ada)
**Step 1:** Tambah kartu per platform dari `GET /api/hermes/platforms` (nama, status enabled/running).
**Step 2:** Tambah tombol toggle (ON/OFF).
**Step 3:** Verifikasi di browser: daftar tampil, status benar.
**Step 4:** Commit.

### Task 6: Frontend — modal konfirmasi + handler toggle
**Objective:** Toggle aman dengan konfirmasi & feedback.
**Files:**
- Modify: `settings/index.html`
**Step 1:** Klik toggle → modal konfirmasi (terutama restart-bearing).
**Step 2:** POST toggle; tampilkan hasil/sukses/gagal; refresh status.
**Step 3:** Handler khusus `NEED_MANUAL_RELOGIN` → tampilkan instruksi manual.
**Step 4:** Verifikasi di browser nyata: toggle Telegram off/on end-to-end.
**Step 5:** Commit.

### Task 7: Verifikasi end-to-end menyeluruh
**Objective:** Pastikan fitur utuh tanpa merusak yang ada.
**Files:** —
**Step 1:** Jalankan curl untuk kedua endpoint (status, toggle) + pastikan config aman.
**Step 2:** Test di browser nyata (forward 18093): Settings → toggle platform → status berubah.
**Step 3:** Pastikan kartu diagnosis lama & fitur dismiss masih bekerja.
**Step 4:** Commit + lapor.

## Tests / validation

- curl `GET /api/hermes/platforms` → 200; `POST /api/hermes/platforms/toggle` → 200 sukses / error dengan pesan jelas.
- Setelah toggle: pastikan `config.yaml` tertulis benar (baca ulang).
- Browser: halaman settings menampilkan status & toggle berfungsi; modal muncul; dismiss tetap jalan.

## Risks & tradeoffs

- **WhatsApp restart = QR/captcha** → WAJIB nonaktifkan auto-restart; pakai `NEED_MANUAL_RELOGIN`.
- **Config salah tulis → Hermes gagal start** → backup sebelum tulis + rollback otomatis saat restart gagal.
- **Beda env restart** (Windows laptop vs VPS Linux) → abstraksi `restart_gateway()` per platform; per `systemd` (VPS) & `subprocess` (Windows).
- **Status "running" tidak 100% akurat** dari log → pakai psutil + fallback bacaan log.

## Open questions

1. Di mana persis section `platforms` didefinisikan (belum ditemukan di config saat ini)? → dijawab Task 1.
2. Bagaimana gateway di-restart di Windows laptop vs VPS Linux? → dijawab Task 1.
3. Apakah toggle harus bisa "start ulang" tanpa re-login utk Telegram (aman) tapi ditolak utk WhatsApp (perlu manual)? → asumsi: ya.
4. Apakah perlu halaman Settings terpisah atau gabung dengan Log/s? → asumsi: halaman Settings eksisting.

**Plan complete. Ready to execute using subagent-driven-development.**
