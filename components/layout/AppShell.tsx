"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, CalendarDays, Users, IndianRupee,
  Image, MapPin, UtensilsCrossed, LogOut, Menu, X
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ceremonies", label: "Ceremonies", icon: CalendarDays },
  { href: "/guests", label: "Guests", icon: Users },
  { href: "/expenses", label: "Expenses", icon: IndianRupee },
  { href: "/seating", label: "Seating", icon: MapPin },
  { href: "/logistics", label: "Logistics", icon: UtensilsCrossed },
  { href: "/gallery", label: "Gallery", icon: Image },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex bg-ivory-50">
      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-ivory-300 fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-ivory-200">
          <div className="flex items-center gap-2">
            <span className="text-gold-500 text-xl font-serif">❧</span>
            <div>
              <div className="font-serif text-lg font-semibold text-maroon-900 leading-tight">VivahVault</div>
              <div className="text-xs text-gray-400 font-sans">Vasoya · Surat</div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx("nav-link", isActive(href) && "active")}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-ivory-200">
          <button onClick={handleLogout} className="nav-link w-full text-left text-gray-400 hover:text-red-600 hover:bg-red-50">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile Drawer ───────────────────────────────── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl flex flex-col animate-in">
            <div className="flex items-center justify-between px-5 py-5 border-b border-ivory-200">
              <div className="flex items-center gap-2">
                <span className="text-gold-500 text-xl font-serif">❧</span>
                <div className="font-serif text-lg font-semibold text-maroon-900">VivahVault</div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-ivory-100">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx("nav-link", isActive(href) && "active")}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-ivory-200">
              <button onClick={handleLogout} className="nav-link w-full text-left text-gray-400 hover:text-red-600">
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-ivory-300 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-ivory-100">
            <Menu size={20} className="text-maroon-800" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-gold-500 font-serif">❧</span>
            <span className="font-serif text-lg font-semibold text-maroon-900">VivahVault</span>
          </div>
          <div className="w-8" /> {/* spacer */}
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}