# osu! Hit Window Reference (Standard Mode)

> Dokumen ini berisi **semua data hit window** untuk setiap OD (Overall Difficulty) pada osu! standard mode.
> Termasuk perhitungan untuk **NoMod**, **DT/NC (÷1.5)**, dan **HT (÷0.75)**.

---

## Rumus Dasar

```
300 (Great) = ±(80 - 6 × OD) ms
100 (Ok)    = ±(140 - 8 × OD) ms
50  (Meh)   = ±(200 - 10 × OD) ms
```

Dengan speed mod, window dibagi oleh speed factor:

```
DT / Nightcore : window ÷ 1.5  (lebih ketat)
HT             : window ÷ 0.75 (lebih longgar)
```

---

## Tabel Lengkap: NoMod

| OD | 🔵 300 (±ms) | 🟢 100 (±ms) | 🟡 50 (±ms) |
|----|-------------|-------------|------------|
| 0  | ±80.0       | ±140.0      | ±200.0     |
| 1  | ±74.0       | ±132.0      | ±190.0     |
| 2  | ±68.0       | ±124.0      | ±180.0     |
| 3  | ±62.0       | ±116.0      | ±170.0     |
| 4  | ±56.0       | ±108.0      | ±160.0     |
| 5  | ±50.0       | ±100.0      | ±150.0     |
| 6  | ±44.0       | ±92.0       | ±140.0     |
| 7  | ±38.0       | ±84.0       | ±130.0     |
| 8  | ±32.0       | ±76.0       | ±120.0     |
| 9  | ±26.0       | ±68.0       | ±110.0     |
| 10 | ±20.0       | ±60.0       | ±100.0     |

---

## Tabel Lengkap: DT / Nightcore (÷1.5)

> DT mempercepat lagu 1.5×, membuat semua hit window **lebih ketat**.

| OD | 🔵 300 (±ms) | 🟢 100 (±ms) | 🟡 50 (±ms) |
|----|-------------|-------------|------------|
| 0  | ±53.33      | ±93.33      | ±133.33    |
| 1  | ±49.33      | ±88.00      | ±126.67    |
| 2  | ±45.33      | ±82.67      | ±120.00    |
| 3  | ±41.33      | ±77.33      | ±113.33    |
| 4  | ±37.33      | ±72.00      | ±106.67    |
| 5  | ±33.33      | ±66.67      | ±100.00    |
| 6  | ±29.33      | ±61.33      | ±93.33     |
| 7  | ±25.33      | ±56.00      | ±86.67     |
| 8  | ±21.33      | ±50.67      | ±80.00     |
| 9  | ±17.33      | ±45.33      | ±73.33     |
| 10 | ±13.33      | ±40.00      | ±66.67     |

---

## Tabel Lengkap: HT (÷0.75)

> HT memperlambat lagu 0.75×, membuat semua hit window **lebih longgar**.

| OD | 🔵 300 (±ms) | 🟢 100 (±ms) | 🟡 50 (±ms) |
|----|-------------|-------------|------------|
| 0  | ±106.67     | ±186.67     | ±266.67    |
| 1  | ±98.67      | ±176.00     | ±253.33    |
| 2  | ±90.67      | ±165.33     | ±240.00    |
| 3  | ±82.67      | ±154.67     | ±226.67    |
| 4  | ±74.67      | ±144.00     | ±213.33    |
| 5  | ±66.67      | ±133.33     | ±200.00    |
| 6  | ±58.67      | ±122.67     | ±186.67    |
| 7  | ±50.67      | ±112.00     | ±173.33    |
| 8  | ±42.67      | ±101.33     | ±160.00    |
| 9  | ±34.67      | ±90.67      | ±146.67    |
| 10 | ±26.67      | ±80.00      | ±133.33    |

---

## Visual: Cara Baca Hit Error

```
         ❌ Miss        🟡 50       🟢 100      🔵 300      🟢 100      🟡 50        ❌ Miss
    ◄──────────────|────────────|───────────|═══════════|───────────|────────────|──────────────►
                -w50          -w100       -w300    0 (tepat)    +w300        +w100          +w50
```

**Contoh OD 6 NoMod:**
```
    ❌ Miss         🟡 50        🟢 100       🔵 300       🟢 100       🟡 50         ❌ Miss
    ◄──────────|────────────|────────────|════════════|────────────|────────────|──────────►
            -140ms       -92ms       -44ms    0 (tepat)    +44ms        +92ms        +140ms
```

**Contoh OD 6 + DT:**
```
    ❌ Miss       🟡 50       🟢 100      🔵 300      🟢 100      🟡 50       ❌ Miss
    ◄────────|──────────|───────────|═══════════|───────────|──────────|────────►
          -93ms      -61ms      -29ms   0 (tepat)   +29ms      +61ms      +93ms
```

---

## Tabel OD Desimal (0.0 – 10.0, step 0.5)

### NoMod

| OD   | 🔵 300 (±ms) | 🟢 100 (±ms) | 🟡 50 (±ms) |
|------|-------------|-------------|------------|
| 0.0  | ±80.0       | ±140.0      | ±200.0     |
| 0.5  | ±77.0       | ±136.0      | ±195.0     |
| 1.0  | ±74.0       | ±132.0      | ±190.0     |
| 1.5  | ±71.0       | ±128.0      | ±185.0     |
| 2.0  | ±68.0       | ±124.0      | ±180.0     |
| 2.5  | ±65.0       | ±120.0      | ±175.0     |
| 3.0  | ±62.0       | ±116.0      | ±170.0     |
| 3.5  | ±59.0       | ±112.0      | ±165.0     |
| 4.0  | ±56.0       | ±108.0      | ±160.0     |
| 4.5  | ±53.0       | ±104.0      | ±155.0     |
| 5.0  | ±50.0       | ±100.0      | ±150.0     |
| 5.5  | ±47.0       | ±96.0       | ±145.0     |
| 6.0  | ±44.0       | ±92.0       | ±140.0     |
| 6.5  | ±41.0       | ±88.0       | ±135.0     |
| 7.0  | ±38.0       | ±84.0       | ±130.0     |
| 7.5  | ±35.0       | ±80.0       | ±125.0     |
| 8.0  | ±32.0       | ±76.0       | ±120.0     |
| 8.5  | ±29.0       | ±72.0       | ±115.0     |
| 9.0  | ±26.0       | ±68.0       | ±110.0     |
| 9.5  | ±23.0       | ±64.0       | ±105.0     |
| 10.0 | ±20.0       | ±60.0       | ±100.0     |

### DT / Nightcore (÷1.5)

| OD   | 🔵 300 (±ms) | 🟢 100 (±ms) | 🟡 50 (±ms) |
|------|-------------|-------------|------------|
| 0.0  | ±53.33      | ±93.33      | ±133.33    |
| 0.5  | ±51.33      | ±90.67      | ±130.00    |
| 1.0  | ±49.33      | ±88.00      | ±126.67    |
| 1.5  | ±47.33      | ±85.33      | ±123.33    |
| 2.0  | ±45.33      | ±82.67      | ±120.00    |
| 2.5  | ±43.33      | ±80.00      | ±116.67    |
| 3.0  | ±41.33      | ±77.33      | ±113.33    |
| 3.5  | ±39.33      | ±74.67      | ±110.00    |
| 4.0  | ±37.33      | ±72.00      | ±106.67    |
| 4.5  | ±35.33      | ±69.33      | ±103.33    |
| 5.0  | ±33.33      | ±66.67      | ±100.00    |
| 5.5  | ±31.33      | ±64.00      | ±96.67     |
| 6.0  | ±29.33      | ±61.33      | ±93.33     |
| 6.5  | ±27.33      | ±58.67      | ±90.00     |
| 7.0  | ±25.33      | ±56.00      | ±86.67     |
| 7.5  | ±23.33      | ±53.33      | ±83.33     |
| 8.0  | ±21.33      | ±50.67      | ±80.00     |
| 8.5  | ±19.33      | ±48.00      | ±76.67     |
| 9.0  | ±17.33      | ±45.33      | ±73.33     |
| 9.5  | ±15.33      | ±42.67      | ±70.00     |
| 10.0 | ±13.33      | ±40.00      | ±66.67     |

### HT (÷0.75)

| OD   | 🔵 300 (±ms) | 🟢 100 (±ms) | 🟡 50 (±ms) |
|------|-------------|-------------|------------|
| 0.0  | ±106.67     | ±186.67     | ±266.67    |
| 0.5  | ±102.67     | ±181.33     | ±260.00    |
| 1.0  | ±98.67      | ±176.00     | ±253.33    |
| 1.5  | ±94.67      | ±170.67     | ±246.67    |
| 2.0  | ±90.67      | ±165.33     | ±240.00    |
| 2.5  | ±86.67      | ±160.00     | ±233.33    |
| 3.0  | ±82.67      | ±154.67     | ±226.67    |
| 3.5  | ±78.67      | ±149.33     | ±220.00    |
| 4.0  | ±74.67      | ±144.00     | ±213.33    |
| 4.5  | ±70.67      | ±138.67     | ±206.67    |
| 5.0  | ±66.67      | ±133.33     | ±200.00    |
| 5.5  | ±62.67      | ±128.00     | ±193.33    |
| 6.0  | ±58.67      | ±122.67     | ±186.67    |
| 6.5  | ±54.67      | ±117.33     | ±180.00    |
| 7.0  | ±50.67      | ±112.00     | ±173.33    |
| 7.5  | ±46.67      | ±106.67     | ±166.67    |
| 8.0  | ±42.67      | ±101.33     | ±160.00    |
| 8.5  | ±38.67      | ±96.00      | ±153.33    |
| 9.0  | ±34.67      | ±90.67      | ±146.67    |
| 9.5  | ±30.67      | ±85.33      | ±140.00    |
| 10.0 | ±26.67      | ±80.00      | ±133.33    |

---

## Mod OD Override

Beberapa mod mengubah OD sebelum hit window dihitung:

| Mod | Efek pada OD | Contoh (OD 6) |
|-----|-------------|---------------|
| **HR (Hard Rock)** | OD × 1.4 (max 10) | 6 × 1.4 = **8.4** |
| **EZ (Easy)** | OD × 0.5 | 6 × 0.5 = **3.0** |
| **NoMod** | Tidak berubah | **6.0** |

> **Catatan:** HR dan EZ mengubah OD **sebelum** perhitungan hit window.
> DT/HT mengubah hit window **setelah** perhitungan dari OD.
>
> Jadi HR + DT: pertama OD dikali 1.4, lalu window dibagi 1.5.

### Contoh: OD 6 + HR + DT

```
Effective OD = 6 × 1.4 = 8.4

300 window = (80 - 6 × 8.4) / 1.5 = (80 - 50.4) / 1.5 = 29.6 / 1.5 = ±19.73 ms
100 window = (140 - 8 × 8.4) / 1.5 = (140 - 67.2) / 1.5 = 72.8 / 1.5 = ±48.53 ms
50  window = (200 - 10 × 8.4) / 1.5 = (200 - 84) / 1.5 = 116 / 1.5 = ±77.33 ms
```

---

## Catatan Penting

1. **Hit error negatif** = kamu menekan **terlalu cepat** (sebelum note tiba)
2. **Hit error positif** = kamu menekan **terlalu lambat** (setelah note lewat)
3. **Hit error 0** = timing sempurna
4. Semua window bersifat **simetris** (± sama untuk cepat dan lambat)
5. Di luar window ±w50 = **MISS** (note tidak terkena sama sekali)
6. OD desimal (misalnya 6.5) valid di osu! dan mengikuti rumus yang sama

---

*Sumber: osu! wiki — Overall Difficulty & Hit Windows*
*Berlaku untuk osu! standard mode (mode 0)*

---

## Judgment Types

Setiap note yang dimainkan akan mendapat salah satu judgment berikut berdasarkan **Hit Error** (selisih waktu klik vs waktu ideal note):

| Judgment | Warna | Kondisi |
|----------|-------|---------|
| **🔵 300 (Great)** | Biru | `\|Hit Error\| ≤ (80 − 6 × OD) ms` |
| **🟢 100 (Ok)** | Hijau | `\|Hit Error\| ≤ (140 − 8 × OD) ms` |
| **🟡 50 (Meh)** | Kuning | `\|Hit Error\| ≤ (200 − 10 × OD) ms` |
| **❌ Miss** | Merah | Di luar window 50, atau tidak ada klik yang cocok |

> **Catatan:** Hit Error negatif = klik terlalu cepat (early). Positif = terlalu lambat (late). 0 = sempurna.

### Contoh Judgment untuk OD 8 NoMod:

```
300 window : ±32.0 ms   → klik dalam 32ms dari waktu ideal
100 window : ±76.0 ms   → klik dalam 76ms dari waktu ideal
50  window : ±120.0 ms  → klik dalam 120ms dari waktu ideal
Miss       : lebih dari ±120ms, atau tidak klik sama sekali
```

---

## Full Note Log — Penjelasan Kolom

Kolom-kolom yang muncul di Full Note Log (UI maupun MD export):

| Kolom | Penjelasan |
|-------|------------|
| **#** | Nomor urut note dalam replay |
| **Time (ms)** | Waktu saat tombol ditekan, diukur dalam milidetik dari awal lagu |
| **End (ms)** | Waktu saat tombol dilepas (ms dari awal lagu). Untuk miss: sama dengan Time. |
| **Hold (ms)** | Durasi tombol ditekan = End − Time (ms). Circle normal: 10–200ms. **≤3ms mencurigakan** (indikator Relax hack). |
| **Hold% Beat** | Hold time sebagai persentase dari panjang 1 beat pada BPM saat itu. 100% = menahan selama 1 ketukan penuh. |
| **Key** | Tombol yang ditekan: `K1`/`K2` = tombol keyboard, `M1`/`M2` = tombol mouse. |
| **Type** | Tipe hit object: `Circle` = note bulat (ditekan sekali), `Slider/Spinner` = note panjang/berputar. |
| **Status** | `✅ Hit` = tombol ditekan dalam hit window yang valid. `❌ Miss` = tidak ada klik yang cocok. |
| **Hit Error** | Selisih waktu klik vs waktu ideal note (ms). **Negatif = terlalu cepat (early)**, **Positif = terlambat (late)**, **0 = sempurna**. |
| **Pos X** | Posisi kursor horizontal saat tombol ditekan (0–512 osu!pixels, kiri→kanan). |
| **Pos Y** | Posisi kursor vertikal saat tombol ditekan (0–384 osu!pixels, atas→bawah). |

### Catatan Hold Time

```
Circle Hit Normal  : Hold 10 – 200 ms  → ✅ Wajar
Circle Hit Pendek  : Hold 4  – 10  ms  → ⚠️ Perlu perhatian
Circle Hit Ekstrem : Hold ≤ 3 ms       → 🚨 Sangat mencurigakan (Relax hack indicator)
Slider/Spinner     : Hold panjang sesuai durasi note → Normal
```

> HoldTime ≤ 3ms pada circle notes adalah **indikator utama Relax hack**, karena software klik otomatis
> tidak dapat menahan tombol selama durasi yang wajar seperti manusia.

---

*Diperbarui: 2026-06-01*  
*Sumber: osu! wiki — Overall Difficulty & Hit Windows*  
*Berlaku untuk osu! standard mode (mode 0)*
