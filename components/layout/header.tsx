'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButtonWrapper } from '@/components/wallet/connect-button-wrapper';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ROUTES } from '@/lib/constants/routes';
import { UI_TEXT } from '@/lib/constants/text';
import { Menu, Home, Briefcase, LayoutDashboard, Plus } from 'lucide-react';
import { useActiveAccount } from 'thirdweb/react';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { label: UI_TEXT.NAV_HOME, href: ROUTES.HOME, icon: Home },
  { label: UI_TEXT.NAV_PROJECTS, href: ROUTES.PROJECTS, icon: Briefcase },
  { label: 'Create Project', href: ROUTES.CREATE_PROJECT, icon: Plus },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const account = useActiveAccount();

  const isActive = (href: string) => {
    if (href === ROUTES.HOME) return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            CM
          </div>
          <span className="text-xl font-bold hidden sm:inline">{UI_TEXT.BRAND_NAME}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive(item.href)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}

          {/* Dashboard (when wallet connected) */}
          {account && (
            <Link
              href={ROUTES.DASHBOARD}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive(ROUTES.DASHBOARD)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              {UI_TEXT.NAV_DASHBOARD}
            </Link>
          )}
        </nav>

        {/* Right Side: Wallet + Mobile Menu */}
        <div className="flex items-center gap-2">
          <ConnectButtonWrapper />

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-xs">
                    CM
                  </div>
                  {UI_TEXT.BRAND_NAME}
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                {mainNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive(item.href)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}

                {/* Dashboard (when wallet connected) */}
                {account && (
                  <Link
                    href={ROUTES.DASHBOARD}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive(ROUTES.DASHBOARD)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {UI_TEXT.NAV_DASHBOARD}
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
