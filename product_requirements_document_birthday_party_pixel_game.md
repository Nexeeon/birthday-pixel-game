# Product Requirements Document (PRD)
**Judul Game:** Birthday Party Pixel Quest  
**Genre:** 2D Top-Down Exploration & Puzzle Mini-Game  
**Gaya Visual:** 2D Pixel Art (Chibi RPG Style)  
**Platform Target:** Web Browser (HTML5 Canvas / React — Responsif untuk Desktop & Mobile)

---

## 1. Ringkasan Konsep & Tujuan Game
**Birthday Party Pixel Quest** adalah game eksplorasi kasual bertema pesta ulang tahun. Pemain mengendalikan karakter utama yang memulai perjalanan dari pintu gerbang bagian bawah area pesta, berjalan-jalan mengelilingi lokasi pesta yang meriah, dan berinteraksi dengan **3 NPC laki-laki pemberi hadiah**. 

Setiap interaksi dengan NPC akan memicu *mini-game* **Puzzle $6 \times 6$** yang menggunakan gambar kustom (`puzzle1`, `puzzle2`, dan `puzzle3`). Setiap kali pemain berhasil menyelesaikan satu *puzzle*, pemain akan membuka dan mendapatkan **1 Skin Karakter Eksklusif** (`hadiahpuzzel1`, `hadiahpuzzel2`, dan `hadiahpuzzel3`) yang dapat langsung dipakai di dalam game.

---

## 2. Alur Permainan Utama (Core Gameplay Loop)
1. **Start & Spawn:** Permainan dimulai dengan karakter utama (`UTAMA`) muncul di jalan setapak batu bagian paling bawah peta (pintu gerbang masuk pesta).
2. **Eksplorasi Area Pesta:** Pemain bebas berjalan ke segala arah (atas, bawah, kiri, kanan) di dalam halaman pesta ulang tahun sambil menghindari objek rintangan (meja, pohon, tenda, pagar).
3. **Mencari & Berinteraksi dengan NPC:** Pemain mendekati salah satu dari 3 NPC pemberi hadiah yang tersebar di titik berbeda pada peta. Saat berada dalam jarak dekat, muncul tombol/indikator interaksi.
4. **Menyelesaikan Mini-Game Puzzle $6 \times 6$:**
   - **NPC 1** memuat gambar `puzzle1` yang dipecah menjadi $6 \times 6$ kotak.
   - **NPC 2** memuat gambar `puzzle2` yang dipecah menjadi $6 \times 6$ kotak.
   - **NPC 3** memuat gambar `puzzle3` yang dipecah menjadi $6 \times 6$ kotak.
5. **Membuka & Menggunakan Skin Hadiah:** Setelah susunan *puzzle* selesai, layar kemenangan muncul dan membuka *skin* yang sesuai (`hadiahpuzzel1`–`3`). Pemain dapat mengganti penampilan karakternya kapan saja melalui menu **Skins / Wardrobe** di layar.
6. **Kondisi Tamat (All Clear):** Ketika ketiga NPC telah diselesaikan ($3/3$), muncul perayaan pesta ulang tahun (efek konfeti & ucapan selamat).

---

## 3. Daftar Aset Visual & Integrasi File
Sistem wajib memuat aset-aset berikut dengan pengaturan rendering tajam (`imageSmoothingEnabled = false` / `image-rendering: pixelated`):

| Nama Variabel / File | Fungsi dalam Game | Keterangan Visual |
| :--- | :--- | :--- |
| `map_pesta` | Peta / Latar Utama | Area halaman pesta ulang tahun kosong (tanpa karakter) dengan jalan batu di tengah dari bawah ke atas. |
| `char_utama` | Karakter Utama (Default) | Gadis berambut hitam sebahu dengan jepit rambut, kaos hitam, dan celana jeans biru. |
| `hadiahpuzzel1` | Skin Hadiah NPC 1 | Pose *peace sign* dengan senyum lebar, kaos hitam, dan celana training garis biru. |
| `hadiahpuzzel2` | Skin Hadiah NPC 2 | Karakter mengenakan topi bucket pink dan busana adat hitam-emas. |
| `hadiahpuzzel3` | Skin Hadiah NPC 3 | Karakter dengan blus *off-the-shoulder* biru muda berumbai dan tanda silang putih di pipi. |
| `npc1` | Pemberi Hadiah 1 | Laki-laki berkulit gelap, jaket merah, celana kargo abu-abu. |
| `npc2` | Pemberi Hadiah 2 | Laki-laki berkulit cokelat, kepala botak, jaket biru dongker, celana krem. |
| `npc3` | Pemberi Hadiah 3 | Laki-laki berambut cokelat ikal, *hoodie* hijau tua, ransel hitam. |
| `puzzle1`, `puzzle2`, `puzzle3` | Gambar Mini-Game | 3 gambar kustom yang akan dipecah otomatis oleh sistem menjadi grid $6 \times 6$. |

### Aturan Pra-Pemrosesan Gambar (Auto-Transparency)
Karena aset karakter dan NPC memiliki latar belakang putih polos, kode game **wajib** menjalankan fungsi *chroma-key* saat memuat gambar ke dalam memori:
- Setiap piksel dengan nilai warna mendekati putih ($R > 240, G > 240, B > 240$) di bagian tepi luar karakter diubah nilai transparansinya menjadi `alpha = 0` agar menyatu mulus dengan rumput dan jalan batu di peta.

---

## 4. Sistem Animasi & AI Pergerakan Karakter/NPC
Agar gambar karakter utama dan 3 NPC yang awalnya berupa gambar diam (*single-frame*) dapat bergerak hidup layaknya game RPG sungguhan, sistem/AI pengembang wajib menerapkan mekanisme berikut:

### A. Animasi Karakter Utama (Player Animation System)
1. **Animasi Diam (*Idle Breathing*):**
   - Saat pemain tidak menekan tombol arah, karakter tetap terlihat hidup dengan osilasi skala vertikal halus menggunakan gelombang sinus: $scaleY = 1 + 0.02 \times \sin(t \times 4)$, sehingga tubuh karakter tampak bernapas pelan.
2. **Animasi Berjalan (*Procedural Walk Cycle*):**
   - **Pantulan Langkah (*Vertical Bobbing*):** Saat bergerak, posisi visual sprite melompat kecil naik-turun sebesar $3\text{ px}$ hingga $4\text{ px}$ mengikuti frekuensi langkah ($|\sin(t \times 12)| \times 4$).
   - **Kemiringan Dinamis (*Tilt*):** Sprite dimiringkan secara bergantian sebesar $\pm 3^\circ$ ke kiri dan kanan saat melangkah untuk mensimulasikan ayunan tubuh.
   - **Arah Hadap (*Directional Flip*):** Jika pemain bergerak ke kiri ($vx < 0$), sprite dicerminkan secara horizontal (`scaleX = -1`); jika ke kanan ($vx > 0$), sprite menghadap normal (`scaleX = 1`).
   - **Bayangan Dinamis:** Elips bayangan di bawah kaki sedikit mengecil saat karakter berada di puncak pantulan langkah dan kembali normal saat menapak.

### B. Perilaku & Animasi AI pada 3 NPC (`NPC 1`, `NPC 2`, `NPC 3`)
1. **Penempatan Posisi Strategis di Peta:**
   - **NPC 1:** Berdiri di area kiri bawah dekat meja kado & kue bertingkat.
   - **NPC 2:** Berdiri di area kanan tengah/bawah dekat meja makan panjang & kursi santai hijau.
   - **NPC 3:** Berdiri di area kiri atas dekat tenda biru & meja kamera.
2. **AI *Idle* & *Ambient Motion*:**
   - Setiap NPC menjalankan animasi bernapas (*idle breathing*) dengan fase waktu yang berbeda-beda agar gerakan mereka tidak terlihat kaku/serempak.
   - Secara berkala (setiap $3\text{--}5$ detik), AI membuat NPC melakukan lompatan kecil atau melambai (khususnya `NPC 1`) untuk menarik perhatian pemain.
   - Di atas kepala setiap NPC yang misinya belum selesai, melayang gelembung ikon hadiah `[🧩 + 🎁]` yang bergerak naik-turun secara halus.
3. **AI Deteksi Kedekatan (*Proximity Awareness*):**
   - Setiap NPC memiliki radius deteksi sebesar $60\text{ px}$.
   - Ketika pemain memasuki radius tersebut, AI NPC otomatis menoleh ke arah posisi pemain (*auto-flip horizontal* membandingkan $X_{\text{player}}$ dan $X_{\text{npc}}$) dan memunculkan indikator tombol aksi **"Bicara / Buka Hadiah"**.
4. **Perubahan Status Setelah Misi Selesai:**
   - Setelah pemain menamatkan *puzzle* dari NPC tersebut, gelembung hadiah di atas kepalanya berubah menjadi tanda centang hijau (`✔`) dan jika diajak bicara lagi, NPC akan mengucapkan selamat ulang tahun.

---

## 5. Tata Letak Peta, Spawn & Sistem Tabrakan (Collision)
1. **Titik Mulai (*Spawn Point*):**
   - Karakter utama muncul di koordinat bawah tengah peta ($X = 50\%$, $Y = 92\%$), tepat di jalan setapak batu di antara dua daun pintu pagar kayu yang terbuka.
2. **Kamera (*Viewport & Camera Follow*):**
   - Karena peta memiliki rasio vertikal memanjang, layar menampilkan area sekitar karakter dengan tingkat *zoom* yang pas (sekitar $1.5\times$ hingga $2\times$), dan kamera bergerak mulus (*lerp smoothing*) mengikuti karakter saat berjalan dari bawah ke atas peta.
3. **Zona Rintangan (*Collision Hitboxes*):**
   - Pemain tidak dapat menembus objek berikut:
     - Pagar kayu & pepohonan di seluruh tepi batas peta.
     - Meja kado kiri bawah & bilik *Photobooth* + tripod kamera.
     - Tenda biru & pohon dengan *pinata* di kiri atas.
     - Panggung & meja kue utama bertuliskan *"SELAMAT ULANG TAHUN!"* di bagian atas.
     - Perangkat DJ & speaker di kanan atas.
     - Meja makan panjang, meja prasmanan putih, serta set kursi santai hijau di sisi kanan.

---

## 6. Spesifikasi Mini-Game Puzzle $6 \times 6$
1. **Konversi Gambar Otomatis ($6 \times 6$ Grid Slicer):**
   - Sistem menerima file gambar `puzzle1`, `puzzle2`, dan `puzzle3`.
   - Jika gambar berbentuk persegi panjang, sistem melakukan *center-crop* otomatis ke rasio $1:1$ (persegi) agar potongan kotak tidak gepeng.
   - Gambar dibagi secara matematis menjadi $6 \text{ kolom} \times 6 \text{ baris} = 36 \text{ potongan}$ (*tiles*), masing-masing berukuran $\frac{W}{6} \times \frac{H}{6}$.
2. **Mekanik Bermain (*Swap Puzzle*):**
   - Ke-36 potongan diacak posisinya di atas papan grid $6 \times 6$ saat mini-game dimulai (dipastikan tidak langsung tersusun benar saat awal).
   - **Cara Main:** Pemain mengeklik/mengetuk satu potongan (ditandai bingkai sorotan kuning), lalu mengeklik potongan kedua untuk menukar posisi keduanya (*swap*). Mekanik *swap* dipilih agar nyaman dan tidak membuat frustrasi pada ukuran grid $6 \times 6$.
3. **Fitur Pendukung di Layar Puzzle:**
   - **Tombol "Lihat Gambar Asli":** Menampilkan pratinjau gambar utuh selama tombol ditekan/diklik untuk membantu pemain.
   - **Penghitung Langkah (*Moves Counter*):** Mencatat jumlah pertukaran yang dilakukan.
   - **Deteksi Kemenangan:** Setiap kali pertukaran terjadi, sistem mengecek apakah indeks setiap *tile* sudah sesuai dengan urutan aslinya ($0 \dots 35$). Jika cocok semua, mini-game selesai dan memicu animasi membuka *skin* baru.

---

## 7. Antarmuka Pengguna (HUD) & Kontrol
- **Kontrol Desktop:** Tombol `W, A, S, D` atau `Panah (Arrow Keys)` untuk berjalan; tombol `Spasi` atau `Enter` (atau klik mouse) untuk berinteraksi dengan NPC.
- **Kontrol Mobile / Layar Sentuh:** *Virtual D-Pad* transparan di pojok kiri bawah dan tombol aksi interaktif di pojok kanan bawah.
- **HUD Atas:**
  - Kiri atas: Status progres misi (**Hadiah Terkumpul: `0/3`**).
  - Kanan atas: Tombol **Ganti Skin** (membuka jendela pilih karakter antara `UTAMA` dan *skin* yang sudah terbuka; *skin* yang belum terbuka ditampilkan dalam siluet terkunci dengan ikon gembok).

---

## 8. Tahapan Implementasi (Development Milestones)
1. **Tahap 1 (Setup & Map Engine):** Memuat `map_pesta`, mengatur kamera *follow*, menempatkan titik *spawn* di bagian bawah, dan menerapkan *collision box* pada furnitur pesta.
2. **Tahap 2 (Karakter & AI NPC):** Memuat aset karakter utama dan 3 NPC dengan penghapusan latar putih otomatis, serta mengaktifkan animasi *idle*, pantulan langkah jalan, dan AI deteksi jarak NPC.
3. **Tahap 3 (Sistem Puzzle $6 \times 6$):** Membangun modul pemotong gambar $6 \times 6$ untuk `puzzle1`, `puzzle2`, dan `puzzle3` lengkap dengan mekanik *swap* dan pratinjau gambar asli.
4. **Tahap 4 (Sistem Hadiah Skin & Polish):** Menghubungkan penyelesaian *puzzle* dengan pembukaan `hadiahpuzzel1`–`3`, menu ganti *skin*, serta efek konfeti perayaan akhir.