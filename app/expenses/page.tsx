"use client";

import { useState, useMemo } from "react";
import { useCollection } from "../../hooks/useCollection";
import type { Expense, ExpenseCategory, Ceremony, PaymentStatus, PaymentMode } from "../../types";
import {
  Plus, X, Pencil, Trash2, IndianRupee, AlertCircle,
  BarChart3, List, ChevronDown, ChevronUp
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SEED_CATEGORIES = [
  "Farm / Venue Rent", "Decoration", "Photography Package",
  "Event Organizer Fee", "DJ & Sound", "Baraat Costs",
  "Catering", "Pandit / Priest Fees", "Clothing Rental", "Invitation Cards"
];

const BLANK_EXPENSE: Omit<Expense, "id" | "createdAt"> = {
  category: "", vendor: "", totalAmount: 0, paidAmount: 0,
  dueDate: "", status: "pending", paymentMode: "cash", notes: "", ceremonyId: ""
};

const STATUS_CLASS: Record<PaymentStatus, string> = {
  paid: "status-paid", partial: "status-partial", pending: "status-pending"
};
const STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid", partial: "Partial", pending: "Pending"
};
const CHART_COLORS = ["#7c1d39", "#ac2040", "#d97706", "#b45309", "#059669", "#3b82f6", "#8b5cf6", "#ec4899"];

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function ExpensesPage() {
  const { data: expenses, loading, add, update, remove } = useCollection<Expense>("expenses");
  const { data: categories, add: addCat, remove: removeCat } = useCollection<ExpenseCategory>("expenseCategories");
  const { data: ceremonies } = useCollection<Ceremony>("ceremonies");

  const [modal, setModal] = useState<"add" | "edit" | "addCat" | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(BLANK_EXPENSE);
  const [newCat, setNewCat] = useState("");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"list" | "chart">("list");
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Seed default categories
  async function seedCategories() {
    for (const name of SEED_CATEGORIES) {
      await addCat({ name, icon: "₹" } as any);
    }
  }

  const allCategoryNames = useMemo(() => {
    const fromDb = categories.map((c: any) => c.name);
    const seeded = SEED_CATEGORIES.filter((s) => !fromDb.includes(s));
    return [...fromDb, ...seeded];
  }, [categories]);

  function openAdd() { setForm({ ...BLANK_EXPENSE, category: allCategoryNames[0] || "" }); setModal("add"); }
  function openEdit(e: Expense) {
    setEditing(e);
    setForm({ category: e.category, vendor: e.vendor, totalAmount: e.totalAmount, paidAmount: e.paidAmount,
      dueDate: e.dueDate, status: e.status, paymentMode: e.paymentMode, notes: e.notes, ceremonyId: e.ceremonyId });
    setModal("edit");
  }

  function recalcStatus(paid: number, total: number): PaymentStatus {
    if (paid <= 0) return "pending";
    if (paid >= total) return "paid";
    return "partial";
  }

  function handleAmountChange(field: "totalAmount" | "paidAmount", val: string) {
    const n = parseFloat(val) || 0;
    setForm((f) => {
      const updated = { ...f, [field]: n };
      updated.status = recalcStatus(updated.paidAmount, updated.totalAmount);
      return updated;
    });
  }

  async function handleSave() {
    if (!form.vendor.trim() || !form.category) return;
    setSaving(true);
    try {
      if (modal === "add") await add(form);
      else if (editing) await update(editing.id, form);
      setModal(null);
    } finally { setSaving(false); }
  }

  async function handleAddCat() {
    if (!newCat.trim()) return;
    await addCat({ name: newCat.trim(), icon: "₹" } as any);
    setNewCat("");
    setModal(null);
  }

  // Stats
  const totalBudget = expenses.reduce((s: number, e: any) => s + e.totalAmount, 0);
  const totalPaid = expenses.reduce((s: number, e: any) => s + e.paidAmount, 0);
  const totalPending = totalBudget - totalPaid;
  const overdueCount = expenses.filter((e: any) => e.status !== "paid" && e.dueDate && new Date(e.dueDate) < new Date()).length;

  // Chart data
  const chartData = useMemo(() => {
    const map: Record<string, { total: number; paid: number }> = {};
    expenses.forEach((e: any) => {
      if (!map[e.category]) map[e.category] = { total: 0, paid: 0 };
      map[e.category].total += e.totalAmount;
      map[e.category].paid += e.paidAmount;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v, pending: v.total - v.paid })).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const filtered = filterStatus === "all" ? expenses : expenses.filter((e: any) => e.status === filterStatus);
  // Sort: overdue first, then pending, then partial, then paid
  const sorted = [...filtered].sort((a: any, b: any) => {
    const overA = a.status !== "paid" && a.dueDate && new Date(a.dueDate) < new Date() ? 0 : 1;
    const overB = b.status !== "paid" && b.dueDate && new Date(b.dueDate) < new Date() ? 0 : 1;
    if (overA !== overB) return overA - overB;
    const order: Record<PaymentStatus, number> = { pending: 0, partial: 1, paid: 2 };
    return order[a.status as PaymentStatus] - order[b.status as PaymentStatus];
  });

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title">Expenses</h1>
          <p className="text-gray-400 text-sm mt-0.5">{expenses.length} entries · {formatINR(totalBudget)} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal("addCat")} className="btn-secondary text-xs px-3">+ Category</button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Budget", value: formatINR(totalBudget), color: "text-gray-800" },
          { label: "Paid", value: formatINR(totalPaid), color: "text-emerald-600" },
          { label: "Pending", value: formatINR(totalPending), color: "text-amber-600" },
          { label: "Overdue", value: `${overdueCount} payments`, color: overdueCount > 0 ? "text-red-600" : "text-gray-400" },
        ].map((s) => (
          <div key={s.label} className="card">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`font-serif text-lg font-semibold ${s.color} leading-tight`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Budget bar */}
      {totalBudget > 0 && (
        <div className="card py-3">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Paid: {formatINR(totalPaid)}</span>
            <span>{Math.round((totalPaid / totalBudget) * 100)}%</span>
            <span>Total: {formatINR(totalBudget)}</span>
          </div>
          <div className="h-3 bg-ivory-200 rounded-full overflow-hidden">
            <div className="h-full bg-maroon-700 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (totalPaid / totalBudget) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* View toggle + filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-ivory-100 rounded-xl p-1">
          <button onClick={() => setView("list")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === "list" ? "bg-white shadow-sm text-maroon-800" : "text-gray-500"}`}>
            <List size={14} /> List
          </button>
          <button onClick={() => setView("chart")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === "chart" ? "bg-white shadow-sm text-maroon-800" : "text-gray-500"}`}>
            <BarChart3 size={14} /> Chart
          </button>
        </div>
        <div className="flex gap-1.5">
          {(["all", "pending", "partial", "paid"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                filterStatus === s ? "bg-maroon-800 text-white border-maroon-800" : "bg-white text-gray-600 border-ivory-300 hover:border-maroon-300"
              }`}>{s === "all" ? `All (${expenses.length})` : `${STATUS_LABEL[s]} (${expenses.filter(e => e.status === s).length})`}</button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-center text-gray-400 text-sm py-12">Loading…</p> : (
        <>
          {view === "chart" ? (
            <div className="card">
              <h2 className="font-serif text-lg font-semibold text-maroon-900 mb-4">Category Breakdown</h2>
              {chartData.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No expenses to chart</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 40 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(value) => (typeof value === "number" ? formatINR(value) : "")} />
                    <Bar dataKey="paid" name="Paid" fill="#059669" radius={[0, 2, 2, 0]} />
                    <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.length === 0 ? (
                <div className="card text-center py-12">
                  <IndianRupee size={32} className="text-ivory-400 mx-auto mb-3" />
                  <p className="text-gray-500">No expenses added yet</p>
                  {categories.length === 0 && (
                    <button onClick={seedCategories} className="btn-secondary text-xs mt-3">Seed default categories</button>
                  )}
                </div>
              ) : sorted.map((e) => {
                const isOverdue = e.status !== "paid" && e.dueDate && new Date(e.dueDate) < new Date();
                const isOpen = expanded === e.id;
                const ceremony = ceremonies.find(c => c.id === e.ceremonyId);
                return (
                  <div key={e.id} className={`card py-3 px-4 ${isOverdue ? "border-red-200 bg-red-50/30" : ""}`}>
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : e.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-800 text-sm">{e.vendor}</p>
                          <span className={STATUS_CLASS[e.status]}>{STATUS_LABEL[e.status]}</span>
                          {isOverdue && <span className="badge bg-red-100 text-red-600 flex items-center gap-1"><AlertCircle size={10} />Overdue</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{e.category}{ceremony ? ` · ${ceremony.name}` : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-800">{formatINR(e.totalAmount)}</p>
                        <p className="text-xs text-gray-400">{formatINR(e.paidAmount)} paid</p>
                      </div>
                      <button className="text-gray-400 p-1 shrink-0">
                        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>

                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-ivory-200">
                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="h-1.5 bg-ivory-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, e.totalAmount ? (e.paidAmount / e.totalAmount) * 100 : 0)}%` }} />
                          </div>
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>Paid: {formatINR(e.paidAmount)}</span>
                            <span>Due: {formatINR(e.totalAmount - e.paidAmount)}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                          {e.dueDate && <div><span className="text-gray-400">Due date:</span> {new Date(e.dueDate).toLocaleDateString("en-IN")}</div>}
                          <div><span className="text-gray-400">Mode:</span> {e.paymentMode.replace("_", " ")}</div>
                          {e.notes && <div className="col-span-2"><span className="text-gray-400">Notes:</span> {e.notes}</div>}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => openEdit(e)} className="btn-ghost py-1.5 text-xs flex items-center gap-1">
                            <Pencil size={12} /> Edit
                          </button>
                          <button onClick={() => { if (confirm(`Delete expense for "${e.vendor}"?`)) remove(e.id); }}
                            className="text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 text-xs flex items-center gap-1">
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Expense Modal */}
      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto animate-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ivory-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-serif text-xl font-semibold text-maroon-900">
                {modal === "add" ? "Add Expense" : "Edit Expense"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-ivory-100"><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="label">Category *</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Select category</option>
                  {allCategoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Vendor / Description *</label>
                <input className="input" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="e.g. Royal Tent House" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Total Quoted (₹)</label>
                  <input type="number" min={0} className="input" value={form.totalAmount || ""} onChange={e => handleAmountChange("totalAmount", e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="label">Amount Paid (₹)</label>
                  <input type="number" min={0} className="input" value={form.paidAmount || ""} onChange={e => handleAmountChange("paidAmount", e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="bg-ivory-50 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-500">Pending: </span>
                <span className="font-semibold text-maroon-700">{formatINR(Math.max(0, form.totalAmount - form.paidAmount))}</span>
                <span className="ml-3 text-gray-500">Status: </span>
                <span className={`font-medium ${form.status === "paid" ? "text-emerald-600" : form.status === "partial" ? "text-amber-600" : "text-red-600"}`}>
                  {STATUS_LABEL[form.status]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Due Date</label>
                  <input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Payment Mode</label>
                  <select className="input" value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value as PaymentMode }))}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              {ceremonies.length > 0 && (
                <div>
                  <label className="label">Link to Ceremony (optional)</label>
                  <select className="input" value={form.ceremonyId} onChange={e => setForm(f => ({ ...f, ceremonyId: e.target.value }))}>
                    <option value="">None</option>
                    {ceremonies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none h-16" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment terms, contact info…" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.vendor.trim() || !form.category} className="btn-primary flex-1">
                  {saving ? "Saving…" : "Save Expense"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {modal === "addCat" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ivory-200">
              <h2 className="font-serif text-xl font-semibold text-maroon-900">Add Category</h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-ivory-100"><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="label">Category Name</label>
                <input className="input" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="e.g. Fireworks" autoFocus />
              </div>
              {/* Existing categories */}
              {categories.length > 0 && (
                <div>
                  <label className="label">Existing categories</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {categories.map((c) => (
                      <span key={c.id} className="flex items-center gap-1 px-2 py-1 bg-ivory-100 rounded-full text-xs text-gray-600">
                        {c.name}
                        <button onClick={() => removeCat(c.id)} className="text-gray-400 hover:text-red-500"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAddCat} disabled={!newCat.trim()} className="btn-primary flex-1">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}