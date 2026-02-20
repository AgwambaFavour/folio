# Folio 📄
**Study smarter. Your PDFs, finally smart.**

Folio is a mobile app for students that lets you upload course PDFs and ask questions about them. Claude answers using your documents as context — with citations. If your PDFs don't have the answer, a web search toggle lets Claude search the internet.

---

## Stack
| Layer | Tech |
|---|---|
| Mobile app | Expo (React Native) |
| Auth | Supabase + Google OAuth |
| Database | Supabase (Postgres + pgvector) |
| File storage | Supabase Storage |
| PDF indexing | Supabase Edge Function + OpenAI embeddings |
| AI answers | Supabase Edge Function → Anthropic Claude |

---

## Setup

### 1. Clone & install
```bash
git clone <your-repo>
cd folio
npm install
cp .env.example .env
```

### 2. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New project
2. In the SQL Editor, run the migration:
   ```
   supabase/migrations/001_init.sql
   ```
3. In **Settings → API**, copy your `URL` and `anon key` into `.env`

### 3. Enable Google OAuth in Supabase
1. Supabase Dashboard → **Authentication → Providers → Google**
2. Enable it, then go to [Google Cloud Console](https://console.cloud.google.com)
3. Create a project → **APIs & Services → Credentials → OAuth 2.0 Client IDs**
4. Create **iOS** client (bundle ID: `com.yourname.folio`)
5. Create **Web** client (add your Supabase callback URL)
6. Copy both client IDs into `.env` and `app.json`

### 4. Get API keys
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com) → API keys
- **OpenAI** (for embeddings): [platform.openai.com](https://platform.openai.com) → API keys

### 5. Deploy Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login and link to your project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets
supabase secrets set ANTHROPIC_KEY=sk-ant-...
supabase secrets set OPENAI_KEY=sk-...

# Deploy both functions
supabase functions deploy ask
supabase functions deploy ingest-pdf
```

### 6. Run the app
```bash
# iOS simulator
npx expo run:ios

# Android emulator
npx expo run:android

# Expo Go (limited — no Google Sign-In)
npx expo start
```

---

## How it works

### PDF Q&A pipeline
```
User uploads PDF
       ↓
Supabase Storage (pdfs bucket)
       ↓
ingest-pdf Edge Function
  ├── Extract text page-by-page (pdf.js)
  ├── Split into 500-word overlapping chunks
  └── Embed each chunk (OpenAI text-embedding-3-small)
       ↓
Stored in chunks table with pgvector embeddings

User asks a question
       ↓
ask Edge Function
  ├── Embed the question
  ├── Vector similarity search → top 6 chunks
  ├── Build context: [PDF excerpts + source metadata]
  └── Call Claude with context + question
       ↓
Answer with citation (PDF name + page number)
```

### Web search fallback
When the user toggles web search ON and relevant PDF chunks score < 0.5 similarity, the `ask` function passes Claude a `web_search` tool. Claude uses it automatically when needed.

---

## Project structure
```
folio/
├── app/
│   ├── _layout.tsx           # Root layout + auth guard
│   ├── (auth)/
│   │   └── landing.tsx       # Sign-in screen
│   └── (app)/
│       ├── _layout.tsx       # Tab navigator
│       ├── dashboard.tsx     # Channel list
│       ├── search.tsx        # Search
│       ├── settings.tsx      # Profile + settings
│       └── channel/
│           ├── [id].tsx      # Q&A chat screen
│           └── pdfs.tsx      # PDF manager
├── hooks/
│   ├── useAuth.tsx           # Google sign-in + session
│   ├── useChannels.ts        # Channel CRUD
│   ├── useMessages.ts        # Chat messages + ask()
│   └── usePdfs.ts            # PDF upload + indexing trigger
├── lib/
│   ├── supabase.ts           # Supabase client
│   └── theme.ts              # Colors, fonts, presets
├── supabase/
│   ├── migrations/
│   │   └── 001_init.sql      # All tables + RLS + storage
│   └── functions/
│       ├── ask/index.ts      # AI answer endpoint
│       └── ingest-pdf/index.ts  # PDF indexing endpoint
└── types/index.ts            # TypeScript types
```

---

## Roadmap
- [ ] Collaborative channels (share with classmates)
- [ ] PDF viewer with highlighted source passages
- [ ] Flashcard generation from Q&A history
- [ ] Formula/LaTeX rendering in answers
- [ ] Offline mode with cached answers
