# osu! Cheat Detector

A web-based tool for analyzing osu! replays to detect Relax hack usage and replay stealing. Built with Next.js and deployed on Vercel.

**Live:** https://osu-replay-analyzer.vercel.app

---

## Features

**Relax Detector**

- Upload `.osr` replay files directly — beatmap data is fetched automatically via the osu! API
- Upload CSV exports from [analyzer.osu.report](https://analyzer.osu.report) as an alternative
- Compare two replays side by side
- Suspicion scoring based on four weighted indicators:
  - Hold Time analysis (50%) — very short key hold durations suggest auto-clicking
  - Hit Error standard deviation (30%) — machine-like timing precision
  - Miss pattern (20%) — zero misses across many circles
  - On-circle rate (0%, informational only)
- Verdict levels: Clean / Borderline / Suspicious / Very Likely Cheating
- Download raw CSV output from `.osr` processing
- Download analysis report as a Markdown file

**Steal Checker**

- Compare a target replay against multiple comparison replays
- Similarity scoring across five aspects:
  - Aim trajectory (35%) — Pearson correlation of cursor delta vectors
  - Hit position (25%) — average Euclidean distance per note
  - Timing (20%) — hit error sequence correlation
  - Hold time distribution (10%) — KL divergence of hold time histograms
  - Miss pattern (10%) — Jaccard similarity of missed note timestamps
- Auto mode: fetch top leaderboard replays from osu! API and compare automatically
- Verdict levels: Different / Similar / Possibly Stolen / Very Similar

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS v4 |
| Charts | Recharts |
| File Upload | react-dropzone |
| CSV Parsing | PapaParse |
| OSR Parsing | osu-parsers, osu-classes |
| Deployment | Vercel |

---

## How It Works

### .osr Analysis Flow

1. The `.osr` binary is parsed using `osu-parsers` (LZMA decompression handled internally)
2. The beatmap MD5 hash from the replay header is used to fetch beatmap metadata from the osu! API
3. The `.osu` beatmap file is downloaded and parsed to extract hit objects and timing points
4. Cursor frames from the replay are matched against hit objects using the correct hit windows (adjusted for mods like DT/HT)
5. Each hit object becomes a `ReplayNote` with fields: `HoldTime`, `HitError`, `OnCircleHitWindow`, `IsHit`, `PosX`, `PosY`
6. The resulting note data is analyzed for cheat indicators

### Key Technical Detail: K1 + M1 Double-Count Fix

In osu!, pressing K1 simultaneously sets the M1 bit in the replay's button state bitmask. Naive parsing would generate two press events per physical key press, causing roughly half of all notes to be unmatched. This tool groups `M1|K1` as a single LEFT group and `M2|K2` as a single RIGHT group, resolving this.

### Suspicion Scoring

Hold time scoring targets the characteristic pattern of Relax hack: the key is pressed and released almost immediately (often within 1–3ms) since the tool handles timing automatically. Human players typically hold keys for 50–200ms.

Hit error scoring looks for unusually low standard deviation. A human player's timing varies naturally; consistent sub-5ms standard deviation is a strong indicator of automated clicking.

---

## Local Development

### Requirements

- Node.js 18+
- An osu! OAuth application ([register here](https://osu.ppy.sh/home/account/edit#oauth))

### Setup

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

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

1. Push the repository to GitHub
2. Import the project on [vercel.com](https://vercel.com)
3. Add the following environment variables under **Settings > Environment Variables**:

| Variable | Description |
|---|---|
| `OSU_CLIENT_ID` | Client ID from your osu! OAuth app |
| `OSU_CLIENT_SECRET` | Client secret from your osu! OAuth app |
| `OSU_REDIRECT_URI` | `https://your-domain.vercel.app/api/osu/callback` |

4. Make sure the `OSU_REDIRECT_URI` matches exactly what is registered in your osu! OAuth application settings.

---

## Project Structure

```
app/
  page.tsx              # Relax Detector main page
  steal/page.tsx        # Steal Checker page
  api/osu/
    token/              # Client credentials token endpoint
    oauth/              # OAuth redirect
    callback/           # OAuth callback handler
    me/                 # Fetch current user profile
    beatmap/            # Beatmap metadata lookup by MD5
    leaderboard/        # Leaderboard scores endpoint
    replay/             # Download replay by score ID
    download/           # Download .osu beatmap file
    logout/             # Clear session cookie

components/
  FileDropzone.tsx      # Unified file upload component
  AnalysisResult.tsx    # Full analysis result layout
  CompareView.tsx       # Side-by-side comparison view
  GeneralInfo.tsx       # Replay general info panel
  HitErrorChart.tsx     # Hit error histogram
  HoldTimeChart.tsx     # Hold time histogram
  IndicatorTable.tsx    # Suspicion indicator breakdown table
  VerdictCard.tsx       # Final verdict display
  steal/
    StealDropzone.tsx   # File upload for steal checker
    SimilarityCard.tsx  # Per-comparison result card
    AutoModePanel.tsx   # Auto leaderboard fetch panel

lib/
  analyzer.ts           # Metrics calculation and suspicion scoring
  osrParser.ts          # .osr binary parser and hit detection
  stealDetector.ts      # Replay similarity engine
  reportGenerator.ts    # Markdown report generator
  osuApi.ts             # osu! API client helpers
  types.ts              # Shared TypeScript types
```

---

## Disclaimer

This tool is intended for educational and investigative purposes. Analysis results are probabilistic and should not be used as the sole basis for any account-related decision. False positives can occur, particularly on maps with high note density or unusual timing patterns.

---

---

# osu! Cheat Detector (Bahasa Indonesia)

Alat berbasis web untuk menganalisis replay osu! guna mendeteksi penggunaan Relax hack dan pencurian replay. Dibangun dengan Next.js dan di-deploy di Vercel.

**Live:** https://osu-replay-analyzer.vercel.app

---

## Fitur

**Relax Detector**

- Upload file `.osr` secara langsung — data beatmap diambil otomatis lewat osu! API
- Upload CSV dari [analyzer.osu.report](https://analyzer.osu.report) sebagai alternatif
- Bandingkan dua replay secara bersamaan
- Skor kecurigaan berdasarkan empat indikator berbobot:
  - Analisis Hold Time (50%) — durasi tahan tombol yang sangat singkat mengindikasikan auto-click
  - Standar deviasi Hit Error (30%) — presisi timing seperti mesin
  - Pola miss (20%) — tidak ada miss sama sekali pada banyak circle
  - On-circle rate (0%, hanya informatif)
- Level verdict: Bersih / Abu-abu / Mencurigakan / Kemungkinan Besar Cheat
- Download output CSV mentah dari pemrosesan `.osr`
- Download laporan analisis dalam format Markdown

**Steal Checker**

- Bandingkan satu replay target dengan beberapa replay pembanding
- Skor kemiripan berdasarkan lima aspek:
  - Aim trajectory (35%) — korelasi Pearson dari delta vektor cursor
  - Hit position (25%) — rata-rata jarak Euclidean per note
  - Timing (20%) — korelasi sekuens hit error
  - Distribusi hold time (10%) — KL divergence histogram hold time
  - Pola miss (10%) — Jaccard similarity pada timestamp note yang miss
- Mode otomatis: ambil replay leaderboard teratas dari osu! API dan bandingkan secara otomatis
- Level verdict: Berbeda / Mirip / Mungkin Dicuri / Sangat Mirip

---

## Cara Kerja

### Alur Analisis .osr

1. File `.osr` binary di-parse menggunakan `osu-parsers` (dekompresi LZMA ditangani secara internal)
2. Hash MD5 beatmap dari header replay digunakan untuk mengambil metadata beatmap dari osu! API
3. File `.osu` beatmap diunduh dan di-parse untuk mengekstrak hit object dan timing point
4. Frame cursor dari replay dicocokkan dengan hit object menggunakan hit window yang sesuai (disesuaikan untuk mod seperti DT/HT)
5. Setiap hit object menjadi `ReplayNote` dengan kolom: `HoldTime`, `HitError`, `OnCircleHitWindow`, `IsHit`, `PosX`, `PosY`
6. Data note yang dihasilkan dianalisis untuk indikator cheat

### Detail Teknis: Perbaikan Double-Count K1 + M1

Dalam osu!, menekan K1 secara bersamaan mengatur bit M1 dalam bitmask button state replay. Parsing naif akan menghasilkan dua press event per satu tekanan tombol fisik, menyebabkan sekitar setengah dari semua note tidak cocok. Alat ini mengelompokkan `M1|K1` sebagai satu grup LEFT dan `M2|K2` sebagai satu grup RIGHT untuk mengatasi hal ini.

### Cara Menghitung Skor Kecurigaan

Skor hold time menargetkan pola khas Relax hack: tombol ditekan dan dilepas hampir seketika (sering dalam 1–3ms) karena alat tersebut menangani timing secara otomatis. Pemain manusia biasanya menahan tombol selama 50–200ms.

Skor hit error mencari standar deviasi yang sangat rendah. Timing pemain manusia berfluktuasi secara alami; standar deviasi konsisten di bawah 5ms merupakan indikator kuat adanya auto-clicking.

---

## Pengembangan Lokal

### Persyaratan

- Node.js 18+
- Aplikasi OAuth osu! ([daftar di sini](https://osu.ppy.sh/home/account/edit#oauth))

### Setup

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

Buka [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

1. Push repositori ke GitHub
2. Import proyek di [vercel.com](https://vercel.com)
3. Tambahkan environment variable berikut di **Settings > Environment Variables**:

| Variable | Keterangan |
|---|---|
| `OSU_CLIENT_ID` | Client ID dari osu! OAuth app kamu |
| `OSU_CLIENT_SECRET` | Client secret dari osu! OAuth app kamu |
| `OSU_REDIRECT_URI` | `https://domain-kamu.vercel.app/api/osu/callback` |

4. Pastikan `OSU_REDIRECT_URI` sama persis dengan yang terdaftar di pengaturan aplikasi OAuth osu!.

---

## Disclaimer

Alat ini ditujukan untuk keperluan edukasi dan investigasi. Hasil analisis bersifat probabilistik dan tidak boleh dijadikan satu-satunya dasar untuk keputusan terkait akun. False positive dapat terjadi, terutama pada map dengan kepadatan note tinggi atau pola timing yang tidak biasa.
