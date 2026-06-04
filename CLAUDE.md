# CLAUDE.md — Osu Replay Analyzer

> This file describes the project for AI coding assistants (Antigravity, Claude Code, etc.).
> Keep this file up to date as the project evolves.

---

## 1. Project Overview

- **Name**: Osu Replay Analyzer
- **Description**: A web tool that analyzes osu! replay files (`.osr`) and CSV data to detect potential cheating behaviors — specifically Relax hack usage and Replay Stealing. Includes a community forum for sharing and discussing analysis results.
- **Goal**: Help the osu! community identify suspicious replays through heuristic analysis of hold times, hit errors, cursor trajectory, and timing patterns. Provide a shareable, public link for every analysis result.
- **Target Users**: osu! players, tournament staff, community moderators who want to investigate potentially cheated scores.
- **Version**: v0.1.0
- **Status**: Active Development

---

## 2. Tech Stack

- **Language**: TypeScript (strict mode)
- **Framework**: Next.js 16.2.6 (App Router) — read `node_modules/next/dist/docs/` before writing any Next.js code
- **Styling**: Tailwind CSS v4 (via `@import "tailwindcss"` + `@theme` block in `globals.css`)
- **UI Library**: Lucide React (icons), Recharts (charts)
- **Database**: PostgreSQL via Supabase (`@supabase/supabase-js`)
- **Auth**: Custom JWT sessions (`jose`) + Firebase Auth (Google Sign-In) + osu! OAuth 2.0
- **State Management**: React Context (`ReplayContext`, `AuthContext`) — no external state library
- **Data Fetching**: Native `fetch` — no SWR or React Query
- **Package Manager**: **npm** — always use `npm`, never `yarn` or `pnpm` or `bun`
- **Deployment**: Not yet deployed (local development only)
- **Key Libraries**:
  - `osu-parsers` + `osu-classes` — parse `.osr` binary replay files
  - `papaparse` — parse CSV files
  - `jspdf` + `jspdf-autotable` — generate downloadable PDF/Markdown reports
  - `react-dropzone` — drag-and-drop file upload
  - `firebase-admin` — verify Google ID tokens server-side
  - `firebase` (client) — Google Sign-In popup

---

## 3. Commands

```bash
# Development
npm run dev        # Start Next.js dev server on localhost:3000
npm run build      # Build production bundle (also runs TypeScript check)
npm run start      # Serve production build
npm run lint       # Run ESLint

# Package Management
npm install [pkg]  # Install a package

# Database (manual — run SQL in Supabase SQL Editor)
# supabase/migrations/001_forum_schema.sql  — users, posts, comments, votes
# supabase/migrations/002_reports_table.sql  — shareable analysis reports
# supabase/migrations/003_reports_dedup.sql  — deduplication index on online_score_id
```

> **IMPORTANT**: There is no automated DB migration runner. All SQL migrations must be run manually in the [Supabase SQL Editor](https://supabase.com/dashboard/project/ndggpuouzoxqokyqyhsq).

---

## 4. Project Structure

**Architecture**: Feature-grouped under `app/` (App Router), shared logic in `lib/`, UI components in `components/`.

```
OsuReplayAnalyzer/
├── app/
│   ├── page.tsx              # Home — file upload + analysis trigger
│   ├── layout.tsx            # Root layout: AuthProvider > ReplayProvider > Navbar
│   ├── globals.css           # Tailwind v4 @theme tokens + Neo Brutalism utilities
│   ├── relax/
│   │   └── page.tsx          # Relax hack detector results page
│   ├── steal/
│   │   └── page.tsx          # Replay steal checker results page
│   ├── forum/
│   │   ├── page.tsx          # Forum listing (Hot/New/Top)
│   │   ├── [id]/page.tsx     # Thread detail + nested comments
│   │   └── create/page.tsx   # Create new post
│   ├── report/
│   │   └── [id]/page.tsx     # Public shareable analysis report (read-only)
│   ├── admin/
│   │   └── page.tsx          # Admin dashboard (posts + users moderation)
│   └── api/
│       ├── osu/              # osu! OAuth flow + beatmap/user/replay API calls
│       ├── auth/             # Google login, logout, /me, link-osu
│       ├── forum/            # Posts CRUD, comments CRUD, voting
│       ├── admin/            # Admin delete & user management
│       └── report/           # Save + fetch shareable reports
│
├── components/
│   ├── layout/
│   │   └── Navbar.tsx        # Sticky navbar with auth state
│   ├── relax/                # All components used ONLY by the relax page
│   │   ├── AnalysisResult.tsx
│   │   ├── GeneralInfo.tsx   # osr metadata + player profile + hero banner
│   │   ├── VerdictCard.tsx
│   │   ├── IndicatorTable.tsx
│   │   ├── HitErrorChart.tsx
│   │   ├── HoldTimeChart.tsx
│   │   ├── MetricCard.tsx
│   │   ├── ScoreGauge.tsx
│   │   ├── CompareView.tsx
│   │   ├── FileDropzone.tsx
│   │   └── FullNoteLog.tsx
│   ├── steal/                # All components used ONLY by the steal page
│   ├── forum/                # Forum UI components (shared across forum pages)
│   │   ├── PostCard.tsx
│   │   ├── VoteButton.tsx
│   │   ├── CommentThread.tsx
│   │   ├── CommentForm.tsx
│   │   ├── AuthModal.tsx     # Login popup (Google + osu!)
│   │   └── ReportEmbed.tsx
│   └── ShareButton.tsx       # "Share" button that saves to Supabase + copies link
│
├── lib/
│   ├── types.ts              # ALL shared TypeScript types and interfaces
│   ├── analyzer.ts           # Relax hack heuristic analysis logic
│   ├── stealDetector.ts      # Replay steal similarity computation
│   ├── osrParser.ts          # Binary .osr parser, beatmap parser, framesToNotes
│   ├── osuApi.ts             # osu! API calls (beatmap fetch, user profile)
│   ├── reportGenerator.ts    # Markdown/PDF report generation
│   ├── context/
│   │   ├── ReplayContext.tsx  # Shared replay file + analysis state across pages
│   │   └── AuthContext.tsx    # Forum auth session (user, logout, loading)
│   ├── auth/
│   │   ├── session.ts        # JWT sign/verify using jose
│   │   └── getUser.ts        # Server-side helper: extract user from cookie
│   ├── firebase/
│   │   ├── client.ts         # Firebase app + GoogleAuthProvider (client-side)
│   │   └── admin.ts          # Firebase Admin SDK (server-side token verification)
│   ├── supabase/
│   │   ├── client.ts         # Supabase browser client
│   │   └── server.ts         # Supabase admin client (service role key)
│   └── utils/
│       └── timeFormat.ts     # formatDistanceToNow helper
│
├── supabase/
│   └── migrations/           # SQL migration files (run manually in Supabase dashboard)
│
├── public/                   # Static assets
├── .env.local                # Environment variables (never commit)
└── CLAUDE.md                 # This file
```

**File placement rules:**
- New UI components → `components/[feature]/ComponentName.tsx`
- Components shared across features → `components/ComponentName.tsx`
- Business logic (pure functions) → `lib/`
- TypeScript types → `lib/types.ts` (all in one file, keep it organized)
- API route handlers → `app/api/[domain]/[resource]/route.ts`
- **Do NOT create new top-level folders** without confirmation

---

## 5. Naming Conventions

```
# Files and Folders
- React components     : PascalCase       e.g. PostCard.tsx, VerdictCard.tsx
- Hooks / utilities    : camelCase        e.g. useAuth.ts, timeFormat.ts
- API routes           : route.ts         (always named route.ts in Next.js App Router)
- Folders              : kebab-case       e.g. osu-replay/
- Pages                : page.tsx
- Layouts              : layout.tsx

# Inside Code
- Variables            : camelCase        e.g. analysisState, beatmapInfo
- Constants            : UPPER_SNAKE      e.g. MAX_RETRY, SORT_OPTIONS
- Functions            : camelCase        e.g. analyzeReplay, formatDistanceToNow
- Types / Interfaces   : PascalCase       e.g. AnalysisResult, OsrReplayInfo
- CSS utility classes  : kebab-case       e.g. brutal-card, no-scrollbar

# Git Branches
- Feature              : feat/[name]      e.g. feat/shareable-reports
- Bug fix              : fix/[name]       e.g. fix/bigint-serialization
- Refactor             : refactor/[name]
```

---

## 6. Code Conventions

```
# General
- TypeScript strict mode is enabled — never use 'any'
- DRY: extract repeated logic into a function or component
- Prefer explicit, readable code over clever one-liners

# TypeScript
- Use 'interface' for object shapes, 'type' for unions and intersections
- Always annotate function return types explicitly for public/exported functions
- Use 'unknown' instead of 'any' for catch block errors: catch (err: unknown)
- BigInt warning: JSON.stringify cannot serialize bigint. Always convert to string
  before serialization: someValue.toString()
- Date warning: JSON.parse produces strings, not Date objects. When reading data
  from Supabase/JSON, always reconvert: new Date(someString)

# Import Order
1. React and Next.js built-ins
2. Third-party packages
3. Internal absolute paths (@/lib, @/components)
4. Internal relative paths
5. Types (import type ...)

# Export Pattern
- Named exports for all components, hooks, and utility functions
- Default export ONLY for page.tsx and layout.tsx (Next.js App Router requirement)

# Error Handling
- Always use try-catch in async functions
- Log errors with context: console.error('[ComponentName] message:', err)
- Return meaningful error responses from API routes with correct HTTP status codes
```

---

## 7. Component Rules

```
# Component File Order
1. 'use client' directive (if needed)
2. Imports
3. Types / Interfaces (local, not in lib/types.ts)
4. Helper functions (pure, no side effects)
5. Component definition
6. Hooks (useState, useEffect, useCallback, etc.)
7. Event handlers
8. JSX return
9. Sub-components (if small and only used here)

# Server vs Client Components
- Default: Server Component (no 'use client')
- Add 'use client' only when you need:
    - useState / useEffect / useCallback / useRef
    - onClick / onChange / other event handlers
    - Browser APIs (localStorage, sessionStorage, clipboard, window)
    - Contexts (useReplay, useAuth)
    - Third-party libraries that require browser (recharts, react-dropzone)

# Shared Report View (read-only)
- When a component renders data fetched from Supabase JSON, it must handle:
  - timestamp: could be Date object OR ISO string → use 'instanceof Date' check
  - onlineScoreId: could be bigint OR string → use 'typeof' check before BigInt()
  - See GeneralInfo.tsx for reference implementation

# Forum Auth Gate
- Any action requiring auth (post, comment, vote) must show AuthModal if !user
- Use the useAuth() hook from @/lib/context/AuthContext
```

---

## 8. Styling Rules

```
# Approach
- Tailwind CSS v4 — utility classes directly in JSX
- Design theme: Neo Brutalism (thick borders, hard shadows, bold typography)
- DO NOT use inline styles except for truly dynamic values (e.g. style={{ flex: count }})
- DO NOT use !important

# Tailwind v4 Specifics
- Theme tokens are defined in app/globals.css inside @theme {}
- Custom utilities are defined in @layer utilities {} in the same file
- DO NOT use tailwind.config.js (v4 uses CSS-based config)

# Design Tokens (defined in globals.css @theme)
--color-neo-yellow : #FFD166   (primary accent, buttons)
--color-neo-red    : #EF476F   (destructive, danger, admin)
--color-neo-blue   : #118AB2   (info, steal analysis)
--color-neo-green  : #06D6A0   (success, share, forum)
--color-neo-pink   : #FF69B4   (relax analysis, primary brand)
--color-neo-bg     : #F4F4F0   (page background)
--color-neo-text   : #1E1E1E   (primary text)

# Neo Brutalism Utility Classes (defined in globals.css @layer utilities)
.brutal-border     : 3px solid border + 8px radius
.brutal-shadow     : 6px offset hard shadow
.brutal-shadow-sm  : 4px offset hard shadow
.brutal-card       : white bg + border + shadow + hover lift effect
.brutal-btn        : border + shadow + hover/active states
.no-scrollbar      : hide scrollbar but keep scroll

# Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px) / md (768px) / lg (1024px)

# Typography
- Font: Work Sans (loaded via next/font/google)
- Monospace: ui-monospace / Fira Code (for data, metrics, code)
- Font classes: font-mono for all data display, font-sans for body text
- font-black (900 weight) for headings and labels
```

---

## 9. API & Data Fetching Rules

```
# API Route Conventions
- Location: app/api/[domain]/[resource]/route.ts
- Export named HTTP method functions: GET, POST, DELETE, PATCH
- Always return NextResponse.json() with appropriate status code
- Always wrap in try-catch and log errors

# Standard Response Format
Success: { data: T } or { id: string } or { posts: T[] }
Error:   { error: string }

# Auth in API Routes
- Use getUser() from @/lib/auth/getUser to read the forum session cookie
- getUser() returns null if not authenticated (does not throw)
- Admin routes: check user.is_admin === true, return 403 if false

# osu! API calls
- All osu! API helpers are in lib/osuApi.ts
- The osu! access token is in the 'osu_user_token' cookie (separate from forum session)
- Never expose osu! tokens to the client

# Supabase
- Client-side (browser): use lib/supabase/client.ts → createBrowserClient()
- Server-side (API routes): use lib/supabase/server.ts → getSupabaseAdmin()
- The admin client uses SUPABASE_SECRET_KEY (service role) — NEVER expose to client

# Data Serialization Gotcha
- BigInt values (like osu! score IDs) cannot be JSON.stringify'd
- Convert before saving: onlineScoreId.toString()
- Convert after loading from JSON: BigInt(str)
- Date objects become strings after JSON round-trip — use new Date(str) to reconvert
```

---

## 10. State Management Rules

```
# Global State via React Context
Two contexts exist, both wrap the entire app in layout.tsx:

1. ReplayContext (lib/context/ReplayContext.tsx)
   - Holds: sharedFile (uploaded replay), analysisState (idle/loading/single/dual)
   - Used by: Home page (set), Relax page (read + set), Steal page (read + set)
   - The sharedFile allows the same .osr to be reused across Relax and Steal tabs

2. AuthContext (lib/context/AuthContext.tsx)
   - Holds: user (forum session), loading, logout()
   - Populated by: GET /api/auth/me on mount
   - Used by: Navbar, all forum pages, admin page

# When to use local state vs context
- Local state (useState): data used only within one component or its direct children
- Context: data needed by many unrelated components (auth, shared file)
- DO NOT create additional global state managers (Zustand, Redux, etc.)

# analysisState shape
type AnalysisState =
  | { mode: 'idle' }
  | { mode: 'loading'; step: string }
  | { mode: 'single'; result: AnalysisResult; warnings: AnalysisWarning[]; osrData?: OsrData }
  | { mode: 'dual'; results: [...]; view: 'individual' | 'compare'; activeIndex: 0 | 1 }
```

---

## 11. Auth System

```
# Two separate auth systems exist side by side:

1. osu! OAuth (legacy, for replay analysis)
   - Cookie: 'osu_user_token' — the osu! API Bearer token
   - Flow: /api/osu/oauth → osu! → /api/osu/callback → set cookie
   - Used by: replay analysis API calls (beatmap, user profile, leaderboard)
   - NOT related to forum auth

2. Forum Auth (custom JWT, for forum features)
   - Cookie: 'forum_session' — JWT signed with AUTH_SECRET
   - Google flow: Firebase popup → ID token → POST /api/auth/google → set JWT cookie
   - osu! flow: /api/osu/callback ALSO upserts user to Supabase + sets JWT cookie
   - Session payload: { sub: uuid, username, avatar_url, is_admin, osu_id?, google_uid? }
   - Server helper: getUser() in lib/auth/getUser.ts

# Account Linking
- A user can link both Google and osu! to one Supabase 'users' row
- Link endpoint: POST /api/auth/link-osu (must already have forum_session cookie)
- The 'users' table has both osu_id and google_uid columns (both nullable + unique)

# Admin Access
- is_admin flag in Supabase users table
- Set manually via SQL: UPDATE users SET is_admin = TRUE WHERE ...
- Checked in: admin API routes, /admin page, Navbar (shows admin link)
```

---

## 12. Database Schema (Supabase / PostgreSQL)

```sql
-- Forum users (unified osu! + Google)
users: id, osu_id, osu_username, osu_avatar_url,
       google_uid, google_email, google_display_name, google_photo_url,
       username, avatar_url, is_admin, created_at, updated_at

-- Forum posts
posts: id, user_id→users, title, body, report_data (JSONB),
       report_type ('relax'|'steal'), created_at, updated_at

-- Forum comments (nested via parent_id self-reference)
comments: id, post_id→posts, user_id→users, parent_id→comments (nullable),
          body, created_at, updated_at

-- Vote system (one vote per user per post, +1 or -1)
votes: id, user_id→users, post_id→posts, value (1|-1), created_at
       UNIQUE(user_id, post_id)

-- Shareable analysis reports
reports: id, user_id→users (nullable), relax_result (JSONB),
         relax_warnings (JSONB), osr_data (JSONB), filename,
         player_name, beatmap_title, online_score_id (TEXT, unique partial),
         created_at

-- View: posts_with_meta (includes upvotes, downvotes, author info)
```

---

## 13. Features

```
# Completed and working
- [x] Home page — drag-and-drop .osr and CSV file upload
- [x] Relax hack detector — heuristic analysis (hold time, hit error, on-circle rate, miss rate)
- [x] Replay steal checker — similarity analysis against leaderboard replays
- [x] .osr binary parser — full frame extraction, hit detection, osu! beatmap parser
- [x] osu! OAuth login (for API access to player data and leaderboards)
- [x] General Info panel — beatmap hero banner, player stats, computed UR, hit breakdown
- [x] Dual replay comparison + side-by-side compare mode
- [x] Downloadable Markdown + PDF reports
- [x] RAW CSV download
- [x] Forum — post listing with Hot/New/Top sort
- [x] Forum — thread detail with vote sidebar (Reddit-style up/downvote)
- [x] Forum — nested comments (recursive, up to depth 4)
- [x] Forum — create post with optional analysis report attachment
- [x] Forum auth — Google Sign-In (Firebase popup) + forum JWT session
- [x] Forum auth — osu! login also creates/links forum account
- [x] Shareable analysis report links (/report/[uuid])
- [x] Report deduplication by osu! online score ID
- [x] Admin dashboard — view all posts, manage users, grant/revoke admin
- [x] Navbar — auth state, forum link, admin shield icon

# Planned / Not started
- [ ] Profile page (/profile) — edit display name, avatar, link/unlink accounts
- [ ] Post a forum thread from analysis result with "Post to Forum" shortcut
- [ ] Steal checker results as shareable reports (currently only Relax is supported)
- [ ] Email notifications for replies (requires email provider)
- [ ] Pagination UI for forum (currently load-more button)
```

---

## 14. Performance Rules

```
# Image Optimization
- Use <img> tags only for external osu! CDN images (covers, avatars)
- Use next/image for local/static images
- Always specify width and height

# Code Splitting
- All forum pages are already 'use client' components — they hydrate client-side
- The heavy .osr parsing happens client-side in the browser (cannot SSR — uses ArrayBuffer)
- Dynamic imports are not currently used but can be added for large chart components

# Bundle
- Import only named exports from libraries
  Correct: import { signInWithPopup } from 'firebase/auth'
  Wrong:   import firebase from 'firebase'
- recharts, jspdf, osu-parsers are large — load lazily if possible in future
```

---

## 15. Git Rules

```
# Commit after every meaningful change — do not batch unrelated changes

# Format
feat     : add shareable report links with deduplication
fix      : handle bigint serialization in ShareButton
fix      : reconvert ISO string to Date in GeneralInfo
refactor : extract auth helpers into lib/auth/getUser.ts
style    : update Neo Brutalism tokens in globals.css
docs     : update CLAUDE.md with forum and reports architecture
chore    : add Firebase service account to .gitignore

# Rules
- NEVER commit .env or .env.local
- NEVER commit osu-replay-analyzer-firebase-adminsdk-fbsvc-31826be7c6.json
  (already in .gitignore via *-adminsdk-*.json pattern)
- One commit per logical change
- Branch from main, merge via PR
```

---

## 16. Do Not

```
# Structure
- Do NOT create new top-level folders without confirmation
- Do NOT rename or move existing files without confirmation
- Do NOT delete any feature without explicit instruction

# Code
- Do NOT use 'any' in TypeScript (use 'unknown' or proper types)
- Do NOT hardcode API keys, secrets, or URLs — use .env.local
- Do NOT use useEffect for data fetching — use async functions called on mount or by events
- Do NOT install new npm packages without confirmation
- Do NOT use yarn, pnpm, or bun — always use npm

# Database
- Do NOT add new columns or tables without creating a migration file first
- Do NOT run DROP TABLE or DELETE without explicit confirmation
- Do NOT expose SUPABASE_SECRET_KEY or any server-only keys to client code

# Auth
- Do NOT expose AUTH_SECRET or FIREBASE_PRIVATE_KEY to the client
- Do NOT skip getUser() auth check in admin API routes
- The 'osu_user_token' cookie and 'forum_session' cookie are SEPARATE — do not mix them

# Serialization
- Do NOT use JSON.stringify on objects containing BigInt or Date without converting first
- Do NOT assume a value read from Supabase JSON is a Date object — always check instanceof

# Next.js
- ALWAYS read node_modules/next/dist/docs/ before writing Next.js-specific code
- ALWAYS use async params in dynamic route handlers: { params }: { params: Promise<{ id: string }> }
  then: const { id } = await params;
- Default to Server Components; only add 'use client' when necessary
```

---

## 17. Environment Variables

```bash
# ── osu! OAuth ───────────────────────────────────────────────────────────────
OSU_CLIENT_ID          # osu! OAuth application client ID
OSU_CLIENT_SECRET      # osu! OAuth application client secret (server only)
OSU_REDIRECT_URI       # osu! OAuth callback URL (e.g. http://localhost:3000/api/osu/callback)

# ── Supabase ─────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL         # Supabase project URL (safe for client)
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Supabase anon/publishable key (safe for client)
SUPABASE_SECRET_KEY              # Supabase service role key — SERVER ONLY, never expose

# ── Firebase (Google Auth — client side) ─────────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# ── Firebase Admin SDK (server side) ─────────────────────────────────────────
FIREBASE_PROJECT_ID              # Firebase project ID — SERVER ONLY
FIREBASE_CLIENT_EMAIL            # Service account email — SERVER ONLY
FIREBASE_PRIVATE_KEY             # Service account private key — SERVER ONLY

# ── Forum Session ─────────────────────────────────────────────────────────────
AUTH_SECRET                      # Random secret for JWT signing — SERVER ONLY
                                 # Generate with: openssl rand -base64 32
```

> **NEVER** commit `.env.local`. It is in `.gitignore`.
> The Firebase service account JSON file (`*-adminsdk-*.json`) is also gitignored.
> If you need to add a new environment variable, add it to `.env.local` AND document it here.

---

## 18. Key Architecture Decisions

```
# Why two auth systems?
The osu! OAuth flow was built first for replay analysis API access.
The forum auth was added later using Firebase (Google) + custom JWT.
They are intentionally separate — osu! token is for API calls,
forum_session JWT is for user identity in forum features.

# Why custom JWT instead of NextAuth?
Simpler to control, easier to add fields (is_admin, osu_id, google_uid)
without needing adapters. jose library handles signing/verification.

# Why Supabase instead of Prisma + raw Postgres?
Supabase provides a hosted PostgreSQL with a REST API client,
eliminating the need for a separate DB server in development.

# Why no Firestore?
Firebase was added ONLY for Google Sign-In (token verification via Admin SDK).
Firestore is NOT used — all data lives in Supabase PostgreSQL.
Firebase security rules are set to allow read/write: false (unused).

# Why client-side .osr parsing?
The .osr files can be up to ~50MB. Parsing them server-side would require
file upload infrastructure. Parsing client-side with ArrayBuffer is faster
and simpler, avoiding server memory pressure.

# Shareable Reports
When a user clicks "SHARE", the analysis result (JSON) is saved to Supabase
reports table. The route /report/[uuid] fetches and renders it publicly.
If the replay has a real osu! online_score_id (non-zero), the same UUID is
returned on subsequent Share clicks (deduplication).
```
