import React from 'react'
import Header from '@/components/Header'
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

const Layout = async ({ children }: { children: React.ReactNode }) => {

  const session = await auth();
  if(!session) redirect('/sign-in')

  return (
    <main className="bg-[#e8eaec]">
      <div className="mx-auto">
        
        <div >
          {children}
        </div>
      </div>
    </main>
  )
}

export default Layout
