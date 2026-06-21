"use client";

import { useCollection } from "../../hooks/useCollection";
import type { Ceremony, Guest, Expense } from "../../types";
import Link from "next/link";
import { CalendarDays, Users, IndianRupee, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#7c1d39", "#d97706", "#059669", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function DashboardPage() {
  const { data: ceremonies, loading: cLoad } = useCollection<Ceremony>("ceremonies", "createdAt");
  const { data: guests, loading: gLoad } = useCollection<Guest>("guests", "createdAt");
  const { data: expenses, loading: eLoad } = useCollection<Expense>("expenses", "createdAt");

  const loading = cLoad || gLoad || eLoad;

  // Stats
  const totalGuests = guests.reduce((s, g) => s + 1 + g.plusOnes, 0);
  const confirmedGuests = guests.filter((g) => g.rsvp === "confirmed").reduce((s, g) => s + 1 + g.plusOnes, 0);

  const totalBudget = expenses.reduce((s, e) => s + e.totalAmount, 0);
  const totalPaid = expenses.reduce((s, e) => s + e.paidAmount, 0);
  const totalPending = totalBudget - totalPaid;

  const overdueExpenses = expenses.filter(
    (e) => e.status !== "paid" && e.dueDate && new Date(e.dueDate) < new Date()
  );

  // Category breakdown for pie
  const categoryMap: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.totalAmount;
  });
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  // Upcoming ceremonies
  const upcomingCeremonies = [...ceremonies]
    .filter((c) => c.date && new Date(c.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-gold-400 text-3xl mb-3 animate-pulse">❧</div>
          <p className="text-gray-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-gold-500 text-sm font-serif italic">ॐ शुभ विवाह</div>
          <h1 className="section-title mt-0.5">Wedding Overview</h1>
          <p className="text-gray-400 text-sm mt-0.5">Vasoya Family · Surat</p>
        </div>
      </div>

      {/* Overdue alert */}
      {overdueExpenses.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 text-sm font-medium">
              {overdueExpenses.length} overdue payment{overdueExpenses.length > 1 ? "s" : ""}
            </p>
            <p className="text-red-500 text-xs mt-0.5">
              {overdueExpenses.map((e) => e.vendor).join(", ")}
            </p>
          </div>
          <Link href="/expenses" className="ml-auto text-xs text-red-600 underline shrink-0">View</Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<CalendarDays size={18} />}
          label="Ceremonies"
          value={ceremonies.length}
          sub={`${upcomingCeremonies.length} upcoming`}
          href="/ceremonies"
          color="maroon"
        />
        <StatCard
          icon={<Users size={18} />}
          label="Guests"
          value={totalGuests}
          sub={`${confirmedGuests} confirmed`}
          href="/guests"
          color="gold"
        />
        <StatCard
          icon={<IndianRupee size={18} />}
          label="Total Budget"
          value={formatINR(totalBudget)}
          sub={`${formatINR(totalPaid)} paid`}
          href="/expenses"
          color="maroon"
          small
        />
        <StatCard
          icon={<AlertCircle size={18} />}
          label="Pending"
          value={formatINR(totalPending)}
          sub={`${overdueExpenses.length} overdue`}
          href="/expenses"
          color={overdueExpenses.length > 0 ? "red" : "gold"}
          small
        />
      </div>

      {/* Two-column */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Upcoming ceremonies */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-maroon-900">Upcoming Ceremonies</h2>
            <Link href="/ceremonies" className="text-xs text-maroon-600 hover:underline">All →</Link>
          </div>
          {upcomingCeremonies.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No upcoming ceremonies scheduled.</p>
          ) : (
            <div className="space-y-3">
              {upcomingCeremonies.map((c) => (
                <div key={c.id} className="flex items-start gap-3 py-2 border-b border-ivory-200 last:border-0">
                  <div className="w-10 h-10 rounded-lg bg-maroon-50 flex items-center justify-center shrink-0">
                    <CalendarDays size={16} className="text-maroon-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.date ? new Date(c.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "Date TBD"}
                      {c.time ? ` · ${c.time}` : ""}
                    </p>
                    {c.venue && <p className="text-xs text-gray-400">{c.venue}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expense breakdown */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-maroon-900">Expense Breakdown</h2>
            <Link href="/expenses" className="text-xs text-maroon-600 hover:underline">Details →</Link>
          </div>
          {pieData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No expenses added yet.</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={pieData} cx={55} cy={55} innerRadius={30} outerRadius={55} dataKey="value" stroke="none">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatINR(Number(value ?? 0))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 min-w-0">
                {pieData.slice(0, 5).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-gray-600 truncate">{item.name}</span>
                    <span className="text-xs text-gray-400 ml-auto shrink-0">{formatINR(item.value)}</span>
                  </div>
                ))}
                {pieData.length > 5 && (
                  <p className="text-xs text-gray-400">+{pieData.length - 5} more</p>
                )}
              </div>
            </div>
          )}

          {/* Budget bar */}
          {totalBudget > 0 && (
            <div className="mt-4 pt-3 border-t border-ivory-200">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Paid: {formatINR(totalPaid)}</span>
                <span>Total: {formatINR(totalBudget)}</span>
              </div>
              <div className="h-2 bg-ivory-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-maroon-700 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalPaid / totalBudget) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{Math.round((totalPaid / totalBudget) * 100)}% paid</p>
            </div>
          )}
        </div>
      </div>

      {/* Guest summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-lg font-semibold text-maroon-900">Guest Summary</h2>
          <Link href="/guests" className="text-xs text-maroon-600 hover:underline">Manage →</Link>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Confirmed", count: guests.filter(g => g.rsvp === "confirmed").length, icon: <CheckCircle2 size={16} className="text-emerald-500" /> },
            { label: "Pending", count: guests.filter(g => g.rsvp === "pending").length, icon: <Clock size={16} className="text-amber-500" /> },
            { label: "Declined", count: guests.filter(g => g.rsvp === "declined").length, icon: <AlertCircle size={16} className="text-red-400" /> },
          ].map((item) => (
            <div key={item.label} className="bg-ivory-50 rounded-xl py-3 px-2">
              <div className="flex justify-center mb-1">{item.icon}</div>
              <div className="font-serif text-xl font-semibold text-gray-800">{item.count}</div>
              <div className="text-xs text-gray-400">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-center">
          <div className="bg-ivory-50 rounded-xl py-2.5 px-2">
            <div className="font-serif text-xl font-semibold text-maroon-800">{guests.filter(g => g.side === "bride").length}</div>
            <div className="text-xs text-gray-400">Bride's side</div>
          </div>
          <div className="bg-ivory-50 rounded-xl py-2.5 px-2">
            <div className="font-serif text-xl font-semibold text-maroon-800">{guests.filter(g => g.side === "groom").length}</div>
            <div className="text-xs text-gray-400">Groom's side</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, href, color, small
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  href: string;
  color: string;
  small?: boolean;
}) {
  const colors: Record<string, string> = {
    maroon: "bg-maroon-50 text-maroon-600",
    gold: "bg-gold-50 text-gold-600",
    red: "bg-red-50 text-red-500",
  };

  return (
    <Link href={href} className="card hover:shadow-md transition-shadow duration-150 block">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colors[color] || colors.maroon}`}>
        {icon}
      </div>
      <div className={`font-serif font-semibold text-gray-800 ${small ? "text-lg" : "text-2xl"} leading-tight`}>
        {value}
      </div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </Link>
  );
}