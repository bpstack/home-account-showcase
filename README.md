# Home Account

A personal finance tracker I built because every app I tried was either too complex or didn't fit
my needs. The interface is in Spanish.

> **Live demo:** [home-account.stackbp.es](https://home-account.stackbp.es/)
>
> It is a work in progress: features land as I need them, so expect rough edges.

## What it does

- **Summary and history.** Income, expenses and balance for a month, a year, everything or a date
  range, with spending by category. The history view shows a year month by month, with the
  balance carried over from earlier years.
- **Transactions.** Filters, pagination and bulk edits (change category, delete).
- **Categories and subcategories**, with colors.
- **Budgets.** A limit per category (weekly, monthly or yearly) with an alert threshold.
- **Statement import.** Read a bank export (`.xls`, `.xlsx` or `.csv`) in the browser, map the
  bank's categories to yours and review before saving. The file never leaves your device.
- **Investment section.** A short risk-profile test and a monthly plan, both by fixed rules (no AI);
  a long-term simulator; market data (Bitcoin and Ethereum from CoinGecko, euro exchange rates from
  the ECB through Frankfurter, economic indicators from the ECB and Eurostat); and a finance chat
  assistant.
- **Several accounts and sharing.** Keep personal and shared accounts side by side and invite
  family members with a link that expires in 24 hours.
- **Installable** on phone and desktop as a PWA.

## Privacy

Transaction descriptions and amounts are encrypted **in your browser** (AES-256-GCM) before they
reach the server. The key is derived from your password with Argon2id and is not sent anywhere. The
server rejects transactions sent in plain text.

Because the server cannot read them, totals, filters, charts and budget progress are calculated in
the browser, after decrypting.

### E2E encryption model

Two layers of keys: your password (or PIN) opens a **User Key**, and that key opens the **Account
Key** of each account you belong to. The Account Key is the one that encrypts the data.

```
┌─────────────────────────────────────────────────────────────────┐
│                      E2E ENCRYPTION MODEL                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐                                           │
│   │ Password / PIN  │  <- You type this on login                │
│   └────────┬────────┘                                           │
│            │ Argon2id                                           │
│            v                                                    │
│   ┌─────────────────┐                                           │
│   │   User Key (UK) │  <- Never leaves your browser             │
│   └────────┬────────┘                                           │
│            │ Decrypts                                           │
│            v                                                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              account_keys table (database)              │   │
│   │  account_id | user_id | encrypted_key                   │   │
│   │  acc-001    | user-A  | [UK_A(AK) - encrypted blob]     │   │
│   └─────────────────────────────────────────────────────────┘   │
│            │                                                    │
│            v                                                    │
│   ┌─────────────────┐                                           │
│   │ Account Key (AK)│  <- Shared by all members of an account   │
│   └────────┬────────┘                                           │
│            │ Encrypts / decrypts                                │
│            v                                                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              ENCRYPTED DATA (AES-256-GCM)               │   │
│   │  transactions.description_encrypted                     │   │
│   │  transactions.amount_encrypted                          │   │
│   │  categories.name_encrypted                              │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

The server only ever stores the encrypted blobs. Each member has their own copy of the Account Key,
encrypted with their own User Key, so adding someone never exposes it.

- **Sign in** with email and password, or with Google or GitHub plus a 6 to 8 digit PIN that
  protects the encryption key. Wrong PIN attempts are counted on the server and lock the PIN.
- **Recovery.** A 24-word recovery phrase you save once, or a password reset by email.
- **Sharing.** Members of an account share its key, and an owner decides who gets in.

### Known limitations

- **Dates, the sign of an amount (income or expense) and category colors** are stored in clear so
  the server can filter by date.
- **The AI chat and the investment profile are not end-to-end encrypted.** Chat messages go to the
  AI provider and are kept for 7 days at most.
- There is no automated test against a real database: the SQL is checked by hand.

## Stack

| Part     | What it uses                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------ |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 3, TanStack Query, Zustand, Recharts |
| Backend  | Express 5, MySQL 8.4 with `mysql2` (plain SQL, no ORM), TypeScript run with `tsx`                |
| Auth     | Email and password, Google and GitHub; JWT in httpOnly cookies; CSRF protection                  |
| Crypto   | Web Crypto (AES-256-GCM) and Argon2id from `@noble/hashes`                                       |
| AI       | Groq for the chat; the code can also use Ollama, Claude, Gemini or Hugging Face                  |
| Tests    | Vitest in both packages (about 250 in the backend and 130 in the frontend)                       |
| Hosting  | Vercel (frontend), Render (backend), a self-hosted MySQL on a VPS                                |

## Repository

Three independent packages. There is no workspace: each one is installed and run on its own.

| Folder      | What it is                          |
| ----------- | ----------------------------------- |
| `frontend/` | The Next.js app                     |
| `backend/`  | The Express API                     |
| `video/`    | The promo video, made with Remotion |

## Running it yourself

You need Node 24, pnpm 10 and a MySQL 8.4 database.

```bash
# backend
cd backend
cp .env.example .env     # then fill it in
pnpm install
pnpm run dev

# frontend, in another terminal
cd frontend
cp .env.example .env.local
pnpm install
pnpm run dev
```

Each package has a `pnpm run verify` that runs the same checks as the CI: lint, tests and, in the
frontend, the build (the backend runs a typecheck instead).

## License

[MIT](LICENSE) © 2026 [bpstack](https://stackbp.es)
