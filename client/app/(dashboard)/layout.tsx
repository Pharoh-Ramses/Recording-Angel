import React from 'react'
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import DashboardSidebar from '@/components/DashboardSidebar';

const Layout = async ({ children }: { children: React.ReactNode }) => {

  const session = await auth();
  if(!session) redirect('/sign-in')

  return (
    <main className="bg-gradient-to-br from-gray-300 via-white via-amber-50 to-gray-400 min-h-screen">
      <div className="flex">
        {/* Sidebar */}
        <DashboardSidebar session={session} />
        
        {/* Main Content */}
        <div className="flex-1 ml-72 pt-4 pr-4 pb-4">
          <div className="h-[calc(100vh-2rem)] bg-white/30 backdrop-blur-md border border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.3)] rounded-2xl p-6">
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}

export default Layout
