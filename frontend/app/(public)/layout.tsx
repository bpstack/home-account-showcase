import React from 'react'

// Every public screen draws its own frame with AuthShell (components/auth), theme switch included.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
