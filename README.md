<div align="center">

# osu! Cheat Detector

**[🇮🇩 Bahasa Indonesia](#bahasa-indonesia) &nbsp;|&nbsp; [🇬🇧 English](#english)**

Alat berbasis web untuk mendeteksi Relax hack dan pencurian replay di osu!

**Live →** https://osu-replay-analyzer.vercel.app

</div>

---

<a name="bahasa-indonesia"></a>

## Bahasa Indonesia

**[Lihat versi English](#english)**

### Gambaran Umum

osu! Cheat Detector menganalisis file replay `.osr` untuk menentukan apakah seorang pemain menggunakan alat otomasi, khususnya Relax hack (yang mengotomasi penekanan tombol) dan pencurian replay. Alat ini memproses data replay sepenuhnya di sisi server, mengambil informasi beatmap secara otomatis dari osu! API.

### Fitur

**Relax Detector**

Upload file `.osr` secara langsung dan alat akan mengambil beatmap yang sesuai secara otomatis. Sebagai alternatif, upload ekspor CSV dari [analyzer.osu.report](https://analyzer.osu.report). Analisis menghasilkan skor kecurigaan berdasarkan empat indikator berbobot.

| Indikator | Bobot | Keterangan |
|---|---|---|
| Hold Time | 50% | Durasi tahan tombol yang sangat singkat (1–3ms) mengindikasikan auto-click |
| Std. Dev. Hit Error | 30% | Presisi timing seperti mesin dengan variansi yang tidak wajar |
| Pola Miss | 20% | Tidak ada miss sama sekali pada jumlah circle yang banyak |
| On-Circle Rate | 0% | Hanya informatif — bukan indikator cheat yang andal |

Level verdict: **Bersih / Abu-abu / Mencurigakan / Kemungkinan Besar Cheat**

**Steal Checker**

Bandingkan satu replay target dengan beberapa replay referensi. Alat menghitung kemiripan dari lima aspek dan menghasilkan satu skor keseluruhan.

| Aspek | Bobot | Metode |
|---|---|---|
| Aim Trajectory | 35% | Korelasi Pearson dari delta vektor cursor |
| Hit Position | 25% | Rata-rata jarak Euclidean per note |
| Timing | 20% | Korelasi sekuens hit error |
| Distribusi Hold Time | 10% | KL divergence histogram hold time |
| Pola Miss | 10% | Jaccard similarity pada timestamp note yang miss |

Mode otomatis mengambil replay leaderboard teratas dari osu! API untuk dibandingkan secara otomatis.

Level verdict: **Berbeda / Mirip / Mungkin Dicuri / Sangat Mirip**

Fitur tambahan mencakup download CSV mentah dari file `.osr` dan ekspor laporan analisis lengkap dalam format Markdown.

### Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) |
| Bahasa | TypeScript |
| Styling | Tailwind CSS v4 |
| Chart | Recharts |
| Upload File | react-dropzone |
| Parsing CSV | PapaParse |
| Parsing OSR | osu-parsers, osu-classes |
| Deployment | Vercel |

### Cara Kerja

**Alur Analisis OSR**

1. File binary `.osr` di-decode menggunakan `osu-parsers`, yang menangani dekompresi LZMA secara internal.
2. Hash MD5 beatmap dari header replay digunakan untuk mengambil metadata beatmap dari osu! API.
3. File beatmap `.osu` diunduh dan di-parse untuk mengekstrak hit object dan timing point.
4. Frame cursor dari replay dicocokkan dengan setiap hit object menggunakan hit window yang dihitung dari OD, disesuaikan untuk mod aktif (DT, HT).
5. Setiap hit object dikonversi menjadi `ReplayNote` yang berisi: `HoldTime`, `HitError`, `OnCircleHitWindow`, `IsHit`, `PosX`, `PosY`.
6. Array note diproses melalui mesin scoring untuk menghasilkan verdict akhir.

**Perbaikan Double-Count K1 + M1**

Dalam osu!, menekan K1 secara bersamaan mengatur bit M1 dalam bitmask button state replay. Parsing yang naif menghasilkan dua press event per satu tekanan tombol fisik, menyebabkan sekitar setengah dari semua note tidak dapat dicocokkan. Alat ini mengelompokkan `M1|K1` sebagai satu event LEFT dan `M2|K2` sebagai satu event RIGHT, menyelesaikan masalah ini sepenuhnya.

**Logika Scoring**

Scoring hold time menargetkan pola khas Relax hack: karena alat tersebut menangani timing secara otomatis, tombol ditekan dan dilepas hampir seketika — sering dalam 1 hingga 3 milidetik. Pemain manusia pada umumnya menahan tombol selama 50 hingga 200 milidetik.

Scoring hit error mencari standar deviasi yang sangat rendah. Timing manusia secara alami berfluktuasi antar percobaan; standar deviasi konsisten di bawah 5ms di banyak note merupakan indikator kuat adanya auto-clicking.

### Pengembangan Lokal

**Persyaratan**

Node.js versi 18 atau lebih baru dan aplikasi OAuth osu! ([daftar di sini](https://osu.ppy.sh/home/account/edit#oauth)).

**Setup**

```bash
git clone https://github.com/LippyyDev/Osu-Replay-Analyzer.git
cd Osu-Replay-Analyzer
npm install
```

Buat file `.env.local` di root proyek:

```env
OSU_CLIENT_ID=your_client_id
OSU_CLIENT_SECRET=your_client_secret
OSU_REDIRECT_URI=http://localhost:3000/api/osu/callback
```

Jalankan development server:

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### Deployment di Vercel

1. Push repositori ke GitHub.
2. Import proyek di [vercel.com](https://vercel.com).
3. Di **Settings > Environment Variables**, tambahkan variabel berikut:

| Variable | Keterangan |
|---|---|
| `OSU_CLIENT_ID` | Client ID dari aplikasi OAuth osu! kamu |
| `OSU_CLIENT_SECRET` | Client secret dari aplikasi OAuth osu! kamu |
| `OSU_REDIRECT_URI` | `https://domain-kamu.vercel.app/api/osu/callback` |

4. Pastikan `OSU_REDIRECT_URI` sama persis dengan nilai yang terdaftar di pengaturan aplikasi OAuth osu!, termasuk protokol dan path-nya.
5. Lakukan redeployment setelah menyimpan variabel.

### Struktur Proyek

```
app/
  page.tsx                  Halaman utama Relax Detector
  steal/page.tsx            Halaman Steal Checker
  api/osu/
    token/                  Endpoint token client credentials
    oauth/                  Inisiasi redirect OAuth
    callback/               Handler callback OAuth
    me/                     Ambil profil pengguna terautentikasi
    beatmap/                Lookup metadata beatmap berdasarkan MD5
    leaderboard/            Endpoint skor leaderboard
    replay/                 Download replay berdasarkan score ID
    download/               Download file beatmap .osu
    logout/                 Hapus session cookie

components/
  FileDropzone.tsx          Komponen upload file terpadu
  AnalysisResult.tsx        Layout hasil analisis lengkap
  CompareView.tsx           Tampilan perbandingan dua replay
  GeneralInfo.tsx           Panel informasi umum replay
  HitErrorChart.tsx         Histogram hit error
  HoldTimeChart.tsx         Histogram dan distribusi hold time
  IndicatorTable.tsx        Tabel breakdown indikator kecurigaan
  VerdictCard.tsx           Tampilan verdict akhir
  steal/
    StealDropzone.tsx       Upload file untuk Steal Checker
    SimilarityCard.tsx      Kartu hasil kemiripan per perbandingan
    AutoModePanel.tsx       Panel fetch leaderboard otomatis

lib/
  analyzer.ts               Kalkulasi metrik dan scoring kecurigaan
  osrParser.ts              Parser binary .osr dan mesin hit detection
  stealDetector.ts          Mesin kemiripan replay
  reportGenerator.ts        Generator laporan Markdown
  osuApi.ts                 Helper client osu! API
  types.ts                  Definisi tipe TypeScript bersama
```

### Disclaimer

Alat ini ditujukan hanya untuk keperluan edukasi dan investigasi. Hasil analisis bersifat probabilistik dan tidak boleh dijadikan satu-satunya dasar untuk keputusan yang berkaitan dengan akun. False positive dapat terjadi, terutama pada map dengan kepadatan note tinggi atau karakteristik timing yang tidak umum.

---

<a name="english"></a>

## English

**[Back to Bahasa Indonesia](#bahasa-indonesia)**

### Overview

osu! Cheat Detector analyzes `.osr` replay files to determine whether a player is using automation tools, specifically the Relax hack (which automates key presses) and replay stealing. The tool processes replay data entirely on the server side, fetching beatmap information automatically from the osu! API.

### Features

**Relax Detector**

Upload a `.osr` file directly and the tool will fetch the corresponding beatmap automatically. Alternatively, upload a CSV export from [analyzer.osu.report](https://analyzer.osu.report). The analysis produces a suspicion score based on four weighted indicators.

| Indicator | Weight | Description |
|---|---|---|
| Hold Time | 50% | Very short key hold durations (1–3ms) indicate auto-clicking |
| Hit Error Std. Dev. | 30% | Machine-like timing precision with abnormally low variance |
| Miss Pattern | 20% | Zero misses across a large number of circles |
| On-Circle Rate | 0% | Informational only — not a reliable cheat indicator |

Verdict levels: **Clean / Borderline / Suspicious / Very Likely Cheating**

**Steal Checker**

Compare a target replay against multiple reference replays. The tool computes similarity across five aspects and returns an overall score.

| Aspect | Weight | Method |
|---|---|---|
| Aim Trajectory | 35% | Pearson correlation of cursor delta vectors |
| Hit Position | 25% | Average Euclidean distance per note |
| Timing | 20% | Hit error sequence correlation |
| Hold Time Distribution | 10% | KL divergence of hold time histograms |
| Miss Pattern | 10% | Jaccard similarity on missed note timestamps |

Auto mode fetches top leaderboard replays from the osu! API for comparison automatically.

Verdict levels: **Different / Similar / Possibly Stolen / Very Similar**

Additional capabilities include downloading the raw CSV extracted from `.osr` files and exporting a full analysis report in Markdown format.

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| File Upload | react-dropzone |
| CSV Parsing | PapaParse |
| OSR Parsing | osu-parsers, osu-classes |
| Deployment | Vercel |

### How It Works

**OSR Analysis Pipeline**

1. The `.osr` binary is decoded using `osu-parsers`, which handles LZMA decompression internally.
2. The beatmap MD5 hash from the replay header is used to fetch beatmap metadata from the osu! API.
3. The `.osu` beatmap file is downloaded and parsed to extract hit objects and timing points.
4. Cursor frames from the replay are matched against each hit object using hit windows calculated from OD, adjusted for active mods (DT, HT).
5. Each hit object is converted into a `ReplayNote` containing: `HoldTime`, `HitError`, `OnCircleHitWindow`, `IsHit`, `PosX`, `PosY`.
6. The note array is passed through the scoring engine to produce a final verdict.

**K1 + M1 Double-Count Fix**

In osu!, pressing K1 simultaneously sets the M1 bit in the replay's button state bitmask. Naïve parsing generates two press events per physical key press, leaving roughly half of all notes unmatched. This tool groups `M1|K1` as a single LEFT event and `M2|K2` as a single RIGHT event, resolving the issue entirely.

**Scoring Logic**

Hold time scoring targets the signature pattern of Relax hack: because the tool handles timing automatically, the key is pressed and released almost instantaneously — often within 1 to 3 milliseconds. Human players typically hold a key for 50 to 200 milliseconds.

Hit error scoring looks for unusually low standard deviation. Natural human timing varies across attempts; a consistent standard deviation below 5ms across many notes is a strong indicator of automated clicking.

### Local Development

**Requirements**

Node.js 18 or later and an osu! OAuth application ([register here](https://osu.ppy.sh/home/account/edit#oauth)).

**Setup**

```bash
git clone https://github.com/LippyyDev/Osu-Replay-Analyzer.git
cd Osu-Replay-Analyzer
npm install
```

Create a `.env.local` file in the project root:

```env
OSU_CLIENT_ID=your_client_id
OSU_CLIENT_SECRET=your_client_secret
OSU_REDIRECT_URI=http://localhost:3000/api/osu/callback
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deployment on Vercel

1. Push the repository to GitHub.
2. Import the project at [vercel.com](https://vercel.com).
3. Under **Settings > Environment Variables**, add the following:

| Variable | Description |
|---|---|
| `OSU_CLIENT_ID` | Client ID from your osu! OAuth application |
| `OSU_CLIENT_SECRET` | Client secret from your osu! OAuth application |
| `OSU_REDIRECT_URI` | `https://your-domain.vercel.app/api/osu/callback` |

4. Ensure `OSU_REDIRECT_URI` exactly matches the value registered in your osu! OAuth application settings, including the protocol and path.
5. Trigger a redeployment after saving the variables.

### Project Structure

```
app/
  page.tsx                  Relax Detector main page
  steal/page.tsx            Steal Checker page
  api/osu/
    token/                  Client credentials token endpoint
    oauth/                  OAuth redirect initiation
    callback/               OAuth callback handler
    me/                     Fetch authenticated user profile
    beatmap/                Beatmap metadata lookup by MD5
    leaderboard/            Leaderboard scores endpoint
    replay/                 Download replay by score ID
    download/               Download .osu beatmap file
    logout/                 Clear session cookie

components/
  FileDropzone.tsx          Unified file upload component
  AnalysisResult.tsx        Full analysis result layout
  CompareView.tsx           Side-by-side comparison view
  GeneralInfo.tsx           Replay general info panel
  HitErrorChart.tsx         Hit error histogram
  HoldTimeChart.tsx         Hold time histogram and distribution
  IndicatorTable.tsx        Suspicion indicator breakdown table
  VerdictCard.tsx           Final verdict display
  steal/
    StealDropzone.tsx       File upload for Steal Checker
    SimilarityCard.tsx      Per-comparison similarity result card
    AutoModePanel.tsx       Auto leaderboard fetch panel

lib/
  analyzer.ts               Metrics calculation and suspicion scoring
  osrParser.ts              .osr binary parser and hit detection engine
  stealDetector.ts          Replay similarity engine
  reportGenerator.ts        Markdown report generator
  osuApi.ts                 osu! API client helpers
  types.ts                  Shared TypeScript type definitions
```

### Disclaimer

This tool is intended for educational and investigative purposes only. Results are probabilistic and should not be used as the sole basis for any account-related decision. False positives can occur, particularly on maps with high note density or unusual timing characteristics.
