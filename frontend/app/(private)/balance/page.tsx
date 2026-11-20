import { redirect } from 'next/navigation'

// Balance was folded into Resumen (figures, expenses and income by category) and Transacciones
// (lists by type). Old links and bookmarks land on Resumen.
export default function BalancePage() {
  redirect('/dashboard')
}
