'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, PlusCircle, Bell, LogOut, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bonds/new', label: 'Add Bond', icon: PlusCircle },
  { href: '/notifications', label: 'Notifications', icon: Bell },
]

interface SidebarProps {
  userEmail: string
  unreadCount: number
}

export default function Sidebar({ userEmail, unreadCount }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-[#0f1e3c] flex-col z-10">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-lg leading-tight">BondTrack</p>
          <p className="text-white/50 text-xs">Texas Bail Bonds</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{label}</span>
              {href === '/notifications' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + Sign Out */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-4 py-2 mb-2">
          <p className="text-white/50 text-xs uppercase tracking-wide mb-0.5">Signed in as</p>
          <p className="text-white text-sm truncate">{userEmail}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors text-base font-medium"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
