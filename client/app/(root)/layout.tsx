import React from 'react'
import Header from '@/components/Header'

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main >
      <div >
        <div >
          {children}
        </div>
      </div>
    </main>
  )
}

export default layout
