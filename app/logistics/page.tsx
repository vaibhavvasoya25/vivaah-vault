"use client";

import { useState } from "react";
import { useCollection } from "../../hooks/useCollection";
import type { RefreshmentStatus, MenuItem, Ceremony, Guest } from "../../types";
import { Plus, X, Pencil, Trash2, UtensilsCrossed, Droplets, IndianRupee } from "lucide-react";

const REFRESHMENT_ITEMS = ["Juice", "Water", "Chai / Tea", "Coffee", "Buttermilk", "Thandai"];
const MENU_CATEGORIES = ["Starter", "Main Course", "Dal / Sabzi", "Bread", "Rice", "Dessert", "Drinks", "Farsan"];

const STATUS_STYLES = {
  ready: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  "not-needed": "bg-gray-100 text-gray-400 border-gray-200",
};

const BLANK_ITEM: Omit<MenuItem, "id"> = {
  ceremonyId: "", name: "", category: "Starter", headcount: 0, perHeadCost: 0, notes: ""
};

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function LogisticsPage() {
  const { data: ceremonies } = useCollection<Ceremony>("ceremonies");
  const { data: guests } = useCollection<Guest>("guests");
  const { data: refreshments, add: addRefresh, update: updateRefresh, remove: removeRefresh } = useCollection<RefreshmentStatus>("refreshments");
  const { data: menuItems, add: addItem, update: updateItem, remove: removeItem } = useCollection<MenuItem>("menuItems", "ceremonyId");

  const [activeTab, setActiveTab] = useState<"refreshments" | "menu">("refreshments");
  const [selectedCeremony, setSelectedCeremony] = useState<string>("all");
  const [modal, setModal] = useState<"addItem" | "editItem" | null>(null);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(BLANK_ITEM);
  const [saving, setSaving] = useState(false);

  const totalGuests = guests.filter(g => g.rsvp === "confirmed").reduce((s, g) => s + 1 + g.plusOnes, 0) || guests.reduce((s, g) => s + 1 + g.plusOnes, 0);

  // Auto-seed refreshment rows when ceremony is selected
  async function seedRefreshments(ceremonyId: string) {
    const existing = refreshments.filter(r => r.ceremonyId === ceremonyId);
    const existingItems = existing.map(r => r.item);
    for (const item of REFRESHMENT_ITEMS) {
      if (!existingItems.includes(item)) {
        await addRefresh({ ceremonyId, item, status: "pending", notes: "" } as any);
      }
    }
  }

  function filteredRefreshments() {
    if (selectedCeremony === "all") return refreshments;
    return refreshments.filter(r => r.ceremonyId === selectedCeremony);
  }

  function filteredMenuItems() {
    if (selectedCeremony === "all") return menuItems;
    return menuItems.filter(m => m.ceremonyId === selectedCeremony);
  }

  function openAddItem() {
    setForm({ ...BLANK_ITEM, ceremonyId: selectedCeremony === "all" ? (ceremonies[0]?.id || "") : selectedCeremony });
    setModal("addItem");
  }
  function openEditItem(item: MenuItem) {
    setEditing(item);
    setForm({ ceremonyId: item.ceremonyId, name: item.name, category: item.category, headcount: item.headcount, perHeadCost: item.perHeadCost, notes: item.notes });
    setModal("editItem");
  }

  async function handleSaveItem() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (modal === "addItem") await addItem(form as any);
      else if (editing) await updateItem(editing.id, form as any);
      setModal(null);
    } finally { setSaving(false); }
  }

  // Menu totals
  const menuTotal = filteredMenuItems().reduce((s, m) => s + m.perHeadCost * m.headcount, 0);

  const groupedMenu = filteredMenuItems().reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title">Logistics</h1>
          <p className="text-gray-400 text-sm mt-0.5">Refreshments & dinner planning</p>
        </div>
      </div>

      {/* Ceremony filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => setSelectedCeremony("all")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            selectedCeremony === "all" ? "bg-maroon-800 text-white border-maroon-800" : "bg-white text-gray-600 border-ivory-300"
          }`}>All Ceremonies</button>
        {ceremonies.map((c) => (
          <button key={c.id} onClick={() => setSelectedCeremony(c.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              selectedCeremony === c.id ? "bg-maroon-800 text-white border-maroon-800" : "bg-white text-gray-600 border-ivory-300"
            }`}>{c.name}</button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ivory-100 rounded-xl p-1 w-fit">
        <button onClick={() => setActiveTab("refreshments")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "refreshments" ? "bg-white shadow-sm text-maroon-800" : "text-gray-500"
          }`}>
          <Droplets size={15} /> Refreshments
        </button>
        <button onClick={() => setActiveTab("menu")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "menu" ? "bg-white shadow-sm text-maroon-800" : "text-gray-500"
          }`}>
          <UtensilsCrossed size={15} /> Dinner Menu
        </button>
      </div>

      {/* ── Refreshments Tab ── */}
      {activeTab === "refreshments" && (
        <div className="space-y-4">
          {selectedCeremony !== "all" && (
            <button onClick={() => seedRefreshments(selectedCeremony)} className="btn-secondary text-xs">
              + Seed default refreshment items
            </button>
          )}

          {filteredRefreshments().length === 0 ? (
            <div className="card text-center py-12">
              <Droplets size={32} className="text-ivory-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No refreshment entries</p>
              <p className="text-gray-400 text-sm mt-1">
                {selectedCeremony === "all" ? "Select a ceremony and seed items" : `Click "Seed default refreshment items" above`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRefreshments().map((r) => {
                const ceremony = ceremonies.find(c => c.id === r.ceremonyId);
                return (
                  <div key={r.id} className="card py-3 px-4 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{r.item}</p>
                      {ceremony && selectedCeremony === "all" && (
                        <p className="text-xs text-gray-400 mt-0.5">{ceremony.name}</p>
                      )}
                      {r.notes && <p className="text-xs text-gray-400 mt-0.5">{r.notes}</p>}
                    </div>
                    <div className="flex gap-1.5">
                      {(["ready", "pending", "not-needed"] as const).map((s) => (
                        <button key={s} onClick={() => updateRefresh(r.id, { status: s })}
                          className={`px-2.5 py-1 rounded-full text-xs border transition-colors capitalize ${
                            r.status === s ? STATUS_STYLES[s] : "border-ivory-300 text-gray-400 hover:border-gray-300"
                          }`}>
                          {s === "not-needed" ? "N/A" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => removeRefresh(r.id)} className="text-gray-300 hover:text-red-400 p-1">
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick add custom refreshment */}
          {selectedCeremony !== "all" && (
            <QuickAdd
              placeholder="Add custom item (e.g. Shikanji)…"
              onAdd={async (name) => {
                await addRefresh({ ceremonyId: selectedCeremony, item: name, status: "pending", notes: "" } as any);
              }}
            />
          )}
        </div>
      )}

      {/* ── Dinner Menu Tab ── */}
      {activeTab === "menu" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              {menuTotal > 0 && (
                <p className="text-sm text-gray-500">
                  Estimated catering cost: <span className="font-semibold text-maroon-700">{formatINR(menuTotal)}</span>
                  {totalGuests > 0 && (
                    <span className="text-gray-400"> · {formatINR(menuTotal / totalGuests)}/head for {totalGuests} guests</span>
                  )}
                </p>
              )}
            </div>
            <button onClick={openAddItem} className="btn-primary flex items-center gap-1.5 text-sm">
              <Plus size={15} /> Add Dish
            </button>
          </div>

          {filteredMenuItems().length === 0 ? (
            <div className="card text-center py-12">
              <UtensilsCrossed size={32} className="text-ivory-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No menu items yet</p>
              <p className="text-gray-400 text-sm mt-1">Add dishes to plan your catering</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedMenu).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{category}</h3>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const ceremony = ceremonies.find(c => c.id === item.ceremonyId);
                      const total = item.perHeadCost * item.headcount;
                      return (
                        <div key={item.id} className="card py-3 px-4 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{item.name}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {ceremony && selectedCeremony === "all" && (
                                <p className="text-xs text-gray-400">{ceremony.name}</p>
                              )}
                              <p className="text-xs text-gray-400">
                                {item.headcount > 0 ? `${item.headcount} portions` : ""}
                                {item.perHeadCost > 0 ? ` · ₹${item.perHeadCost}/head` : ""}
                                {total > 0 ? ` · ${formatINR(total)} total` : ""}
                              </p>
                            </div>
                            {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => openEditItem(item)} className="p-1.5 rounded-lg hover:bg-ivory-100 text-gray-400 hover:text-maroon-600">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => removeItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Menu Item Modal */}
      {(modal === "addItem" || modal === "editItem") && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ivory-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-serif text-xl font-semibold text-maroon-900">
                {modal === "addItem" ? "Add Dish" : "Edit Dish"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-ivory-100"><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="label">Dish Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Paneer Butter Masala" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Ceremony</label>
                  <select className="input" value={form.ceremonyId} onChange={e => setForm(f => ({ ...f, ceremonyId: e.target.value }))}>
                    <option value="">None</option>
                    {ceremonies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Portions / Headcount</label>
                  <input type="number" min={0} className="input" value={form.headcount || ""}
                    onChange={e => setForm(f => ({ ...f, headcount: Number(e.target.value) }))} placeholder="0" />
                </div>
                <div>
                  <label className="label">Cost per head (₹)</label>
                  <input type="number" min={0} className="input" value={form.perHeadCost || ""}
                    onChange={e => setForm(f => ({ ...f, perHeadCost: Number(e.target.value) }))} placeholder="0" />
                </div>
              </div>
              {form.headcount > 0 && form.perHeadCost > 0 && (
                <div className="bg-ivory-50 rounded-lg px-3 py-2 text-sm">
                  Estimated cost: <span className="font-semibold text-maroon-700">{formatINR(form.headcount * form.perHeadCost)}</span>
                </div>
              )}
              <div>
                <label className="label">Notes</label>
                <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Spice level, special requirements…" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSaveItem} disabled={saving || !form.name.trim()} className="btn-primary flex-1">
                  {saving ? "Saving…" : "Save Dish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (val: string) => Promise<void> }) {
  const [val, setVal] = useState("");
  const [adding, setAdding] = useState(false);
  async function handle() {
    if (!val.trim()) return;
    setAdding(true);
    await onAdd(val.trim());
    setVal("");
    setAdding(false);
  }
  return (
    <div className="flex gap-2">
      <input className="input flex-1" value={val} onChange={e => setVal(e.target.value)}
        placeholder={placeholder} onKeyDown={e => e.key === "Enter" && handle()} />
      <button onClick={handle} disabled={adding || !val.trim()} className="btn-primary px-3">
        <Plus size={16} />
      </button>
    </div>
  );
}