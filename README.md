# Home Account

Personal finance tracker I built because every app I tried was either too complex or didn't fit my needs.

> ⚠️ **Work in Progress** - Nothing to test yet, but coming together.

## 🎯 What I Built

A clean dashboard to track income, expenses, and balances with:

- **Transaction Management**: Pagination, filters, category colors
- **Balance Overview**: Monthly/yearly views with income/expense breakdown
- **Category Organization**: Custom categories with color coding
- **Excel Import**: Bulk upload from bank exports (main feature)

## 💡 The Import Flow

This is the core feature I wanted to get right:

1. Export transactions from your bank to Excel
2. Upload the file to Home Account
3. AI parses descriptions and suggests categories automatically
4. You review, edit, or confirm the suggested mappings
5. Transactions appear instantly (optimistic UI)
6. Server validates, syncs, and updates all stats

## 🏗️ Architecture

```
Frontend: Next.js 16 (App Router) + TypeScript + React Query + Zustand + Tailwind
Backend: Express + MySQL (Aiven)
Auth: JWT httpOnly cookies (5min access + 8h refresh)
Charts: Recharts (lazy loaded)
```

### RSC Pattern

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
    initialData: { stats: initialStats }, // hydration, no flash
  })
  // All tabs, filters, pagination handled client-side
}
```

Server pre-loads everything in parallel → Client hydrates and handles all interactivity. No waterfalls, no loading flashes.

### Why This Setup

| What | Why |
|------|-----|
| httpOnly cookies | No XSS risk, RSC can read auth |
| React Query | Server state caching, optimistic updates |
| Zustand | UI state only (modals, filters) |
| Dynamic imports | Recharts ~300KB lazy loaded |
| Promise.all | Fetches run in parallel, not sequential |

## 🔐 Authentication

JWT tokens in httpOnly cookies:
- Access token: 5 minutes
- Refresh token: 8 hours
- No localStorage, no memory leaks

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

## 📚 What I Learned

- RSC + Client Component separation isn't about "async" - it's about when data loads
- Cookie-based auth enables Server Components to fetch authenticated data
- Optimistic UI transforms "submit → loading → done" into "instant → background sync"
- Lazy loading charts makes a real difference in bundle size

---

**Built because the tools I needed didn't exist.**
