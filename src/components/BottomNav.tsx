'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PlusCircle, Bell } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bonds/new', label: 'Add Bond',  icon: PlusCircle },
  { href: '/notifications', label: 'Alerts', icon: Bell },
]

export default function BottomNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-[#0f1e3c] border-t border-white/10 flex md:hidden z-20 safe-area-inset-bottom">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/bonds/new' && pathname.startsWith(href + '/'))
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center py-3 min-h-[60px] transition-colors relative',
              isActive ? 'text-white' : 'text-white/55 active:text-white'
            )}
          >
            <div className="relative">
              <Icon className="w-6 h-6" />
              {href === '/notifications' && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-1 font-medium">{label}</span>
            {isActive && (
              <span className="absolute top-0 inset-x-4 h-0.5 bg-white rounded-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
