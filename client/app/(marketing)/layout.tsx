import React from 'react'
import Header from '@/components/MarketingHeader'
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth();

  return (
    <main className="root-container">
      <div className="container mx-auto max-w-7xl">
        <Header session={session} />
        <div>
          {children}
        </div>
      </div>
    </main>
  )
}

export default Layout
