'use client'

import { useState } from 'react'
import Sidebar from '@/app/components/Sidebar'

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <main
        className={`flex-1 transition-all duration-300 w-full ${
          isCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {children}
      </main>
    </div>
  )
}
