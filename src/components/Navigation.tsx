
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Users, HandCoins, LogOut, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: Receipt },
  { name: 'Settlements', href: '/settlements', icon: HandCoins },
  { name: 'Partners', href: '/partners', icon: Users },
];

import { useAuth } from '@/components/AuthContext';

export function Navigation() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r bg-card md:block">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden">
            <img src="/logo.png" alt="Braingig LLC" className="h-full w-full object-cover" />
          </div>
          <span className="text-lg font-bold tracking-tight">Braingig LLC</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={() => logout()}
          >
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 z-50 flex w-full justify-around bg-background/60 backdrop-blur-2xl backdrop-saturate-[180%] border-t border-border/50 pt-3 md:hidden"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'relative flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all duration-200 ease-out',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className={cn(
              "flex items-center justify-center transition-transform duration-200",
              isActive ? "scale-110" : "scale-100"
            )}>
              <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />
            </div>
            <span className={cn(
              "text-[10px] font-medium tracking-tight transition-all",
              isActive ? "font-semibold" : "font-medium"
            )}>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
