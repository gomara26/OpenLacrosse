'use client'

import { useState } from 'react'
import Sidebar from '@/app/components/Sidebar'

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <main
        className="flex-1 transition-all duration-300"
        style={{
          marginLeft: isCollapsed ? '4rem' : '16rem'
        }}
      >
        {children}
      </main>
    </div>
  )
}
