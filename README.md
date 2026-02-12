# Home Account

Personal finance tracker I built because every app I tried was either too complex or didn't fit my needs.

> ⚠️ **Work in Progress** - Nothing to test yet, but coming together.

## 🎯 What I Built

A clean dashboard to track income, expenses, and balances with:

- **Transaction Management**: Pagination, filters, category colors
- **Balance Overview**: Monthly/yearly views with income/expense breakdown
- **Category Organization**: Custom categories with color coding
- **Excel Import**: Bulk upload from bank exports (main feature)
- **Investment Module**: AI-powered portfolio recommendations, chat assistant, market data

## 💡 The Import Flow

This is the core feature I wanted to get right:

1. Export transactions from your bank to Excel
2. Upload the file to Home Account
3. AI parses descriptions and suggests categories automatically
4. You review, edit, or confirm the suggested mappings
5. Transactions appear instantly (optimistic UI)
6. Server validates, syncs, and updates all stats

## 🔐 End-to-End Encryption

**Why E2E?** Your financial data is yours, not mine. Even if someone hacks my server, they get encrypted blobs, not your transactions.

### The Problem

Traditional apps store data in plain text. If I get hacked, your transaction history is exposed. I didn't want that.

### The Solution: Envelope Encryption

```
┌─────────────────────────────────────────────────────────────────┐
│                      E2E ENCRYPTION MODEL                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐                                           │
│   │   User Password │  ← You type this on login                 │
│   └────────┬────────┘                                           │
│            │ Argon2id                                           │
│            ▼                                                    │
│   ┌─────────────────┐                                           │
│   │   User Key (UK) │  ← Never leaves your browser             │
│   └────────┬────────┘                                           │
│            │ Decrypts                                          │
│            ▼                                                    │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │              account_keys table (database)              │  │
│   │  account_id │ user_id │ encrypted_account_key           │  │
│   │  acc-001    │ user-A  │ [UK_A(AK) - encrypted blob]   │  │
│   └─────────────────────────────────────────────────────────┘  │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                           │
│   │ Account Key (AK)│  ← Shared key for all account members  │
│   └────────┬────────┘                                           │
│            │ Encrypts/Decrypts                                 │
│            ▼                                                    │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │         ENCRYPTED DATA (AES-256-GCM)                   │  │
│   │  transactions.description_encrypted                     │  │
│   │  transactions.amount_encrypted                         │  │
│   │  categories.name_encrypted                             │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### What Gets Encrypted

| Field | Why |
|-------|-----|
| `transactions.description` | Reveals spending habits |
| `transactions.amount` | Your exact financial position |
| `categories.name` | Personal category structure |

### What Stays Plain

| Field | Why |
|-------|-----|
| `transactions.date` | Needed for filtering by date |
| `transactions.amount_sign` | + or - (income/expense) |
| `categories.color` | UI only, not sensitive |

### The Unlock Flow

```
LOGIN
  │
  ├─► Email + password
  │
  ├─► Backend: bcrypt validate → returns { user, key_salt, encrypted_keys[] }
  │
  ├─► Frontend: UK = Argon2id(password, key_salt)
  │
  ├─► Frontend: AK = decrypt(encrypted_key, UK)
  │
  └─► Dashboard loads encrypted data → decrypts client-side

REFRESH (F5)
  │
  ├─► Cookies persist (session valid)
  ├─► Crypto store cleared (keys lost)
  │
  └─► Redirect to /unlock
       │
       ├─► Re-enter password
       ├─► GET /auth/keys → get key_salt, encrypted_keys
       ├─► Re-derive UK, decrypt AKs
       └─► Back to dashboard

LOGOUT
  │
  ├─► Clear cookies
  └─► Clear crypto store (keys gone forever)
```

**Key insight:** The server never sees your password after login, never sees your decrypted keys, and never sees your plain text data. It's just a dumb storage layer for encrypted blobs.

### ⚠️ Critical Trade-off

If you lose your password, your data is **gone forever**. No password reset, no recovery, no "forgot my password" flow. The server can't reset it because it never sees your password or your decrypted data.

**Future v2:** BIP39 recovery phrase (24 words) for emergency backup.

### Performance Trade-offs

With E2E encryption, all data processing happens client-side because the server can't read encrypted blobs.

| Operation | Traditional | This App |
|-----------|-------------|----------|
| SUM(amount) | SQL on server | JS reduce on decrypted data |
| Filter by amount | SQL WHERE | JS filter |
| Search text | SQL LIKE | JS filter after decrypt |
| Monthly stats | SQL GROUP BY | JS reduce |

**Numbers:** 5000 transactions take ~5-50ms to decrypt and ~5ms to calculate totals. That's imperceptible for personal use.

**Scaling decision:** For a family accounting app, we'll never hit limits that justify complex optimizations (Web Workers, virtualization, etc.). These were evaluated and rejected - the trade-offs are accepted for this scope.

## 👥 Account Sharing & Invitations

Invite family members to share an account. The system uses an `invitation_secret` transferred via URL (one-time use, expires in 24h) to securely share the Account Key between users.

## 🔑 OAuth + PIN

Login with Google or GitHub is supported, but there's a catch: OAuth proves identity, not secrecy. For E2E encryption, you need something only you know.

**The solution:** A 6-8 digit PIN that replaces your password for the encryption layer.

```
OAuth (Google/GitHub) → JWT session (authentication)
PIN (6-8 digits)      → User Key derivation (encryption)

Flow:
  1. Continue with Google → Authenticated via OAuth
  2. Redirect to /unlock → Enter PIN
  3. PIN → Argon2id → User Key → Decrypt account keys
  4. Access your data
```

**Why 6-8 digits?**
- UX: Faster to type than a password
- Argon2id parameters compensate for lower entropy (t=3, m=64MB, p=4)
- Mobile-friendly numeric keyboard
- Rate limited to prevent brute force

## 📊 Investment Module

AI-powered investment features integrated into the dashboard:

- **Risk Profile Questionnaire**: 7-step assessment via AI
- **Personalized Recommendations**: Investment suggestions based on your savings capacity
- **AI Chat Assistant**: Conversational finance Q&A with context
- **Market Data**: Real-time prices (BTC, ETH, EUR/USD, S&P 500, MSCI)
- **Simulator**: Long-term projection scenarios

### AI Providers

| Provider | Type | Use Case |
|----------|------|----------|
| **Groq** | Cloud | Recommended - free, fast, 15 req/hour |
| **Ollama** | Local | Private, no limits, runs on your machine | This is only for me just to test
| **Claude** | Cloud | Best reasoning, paid | Planned for future implementation through a payment system (not implemented yet)
| **Gemini** | Cloud | Good free tier | limited req/hour

### ⚠️ Known Limitation

**AI chats and investment profiles are NOT encrypted yet.** Only transactions and categories are currently E2E encrypted.
**AI chat content isn’t end-to-end encrypted and is visible to the provider, so adding extra protection here wouldn’t meaningfully increase privacy.**

## 🏗️ Architecture

```
Frontend: Next.js 16 (App Router) + TypeScript + React Query + Zustand + Tailwind
Backend:  Express + MySQL (Aiven)
Auth:     JWT httpOnly cookies (15min access + 8h refresh) + CSRF protection
Charts:   Recharts (lazy loaded)
Crypto:   AES-256-GCM + Argon2id (@noble/hashes)
AI:      Multi-provider (Groq, Ollama, Claude, Gemini)
```

### Server Components (RSC)

```tsx
// page.tsx - Server Component (initial load)
export default async function DashboardPage({ searchParams }) {
  const [stats, summary] = await Promise.all([
    getTransactionStats(accountId, startDate, endDate),
    getTransactionSummary(accountId, startDate, endDate),
  ])
  return <DashboardClient initialStats={stats} initialSummary={summary} />
}

// DashboardClient.tsx - Client Component (interactivity)
'use client'
export function DashboardClient({ initialStats, initialSummary }) {
  const { data: stats } = useQuery({
    queryKey: ['transactions', 'stats', accountId, startDate, endDate],
    queryFn: () => transactions.getStats(accountId, startDate, endDate),
    initialData: { stats: initialStats },
  })
}
```

**Why RSC + Client?** Server pre-loads initial data, client handles all interactivity. With E2E encryption, RSCs can't access encrypted data anyway - the server is just a proxy/storage layer.

### Why This Setup

| What | Why |
|------|-----|
| httpOnly cookies | No XSS risk, RSC can read auth |
| React Query | Server state caching, optimistic updates |
| Zustand | UI state only (modals, filters) |
| Dynamic imports | Recharts ~300KB lazy loaded |
| Promise.all | Fetches run in parallel, not sequential |
| Client-side math | E2E encryption - server can't read data |
| Rate limiting | 7 login attempts/15min, AI varies by provider |
| CSRF protection | Double Submit Cookie pattern |
| Security headers | CSP, X-Frame-Options, X-Content-Type-Options |
| XSS sanitization | DOMPurify on frontend, regex sanitization on backend |

## 📦 Import System

Optimistic updates for instant feedback:

```typescript
// onMutate - show immediately
queryClient.setQueryData(['transactions'], (old) => ({
  ...old,
  transactions: [
    ...newTransactions.map(t => ({ ...t, _optimistic: true })),
    ...(old?.transactions || []),
  ],
}))

// onError - rollback
queryClient.setQueryData(['transactions'], context.previousTransactions)

// onSettled - sync with server
queryClient.invalidateQueries({ queryKey: ['transactions'] })
```

## 🚀 Deploy Ready

Production configuration included for:
- **Vercel**: Frontend (Next.js App Router)
- **Render**: Backend (Express)
- **Aiven**: MySQL database

## 📱 PWA

Installable as a standalone app on mobile and desktop.

## 👤 Multiple Accounts

Users can manage multiple accounts (e.g., personal, shared household, savings goals) from the same session.

## 📚 What I Learned

- E2E encryption means the server is just a dumb storage layer - it can't search, filter, or aggregate your data because it's all encrypted blobs
- RSC + Client Component separation isn't about "async" - it's about when data loads
- Cookie-based auth enables Server Components to fetch authenticated data
- OAuth doesn't provide a secret, so I needed a separate PIN for the encryption layer
- For a family accounting app, complex performance optimizations aren't justified - we're not at scale
- Optimistic UI transforms "submit → loading → done" into "instant → background sync"
- Lazy loading charts makes a real difference in bundle size
- AI chat for finance needs sanitization - users will try prompt injection
- Trade-offs are design decisions - accepting client-side math, no server-side search, and "password lost = data lost" for true privacy

---

**Built because the tools I needed didn't exist.**
