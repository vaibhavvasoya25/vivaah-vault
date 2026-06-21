"use client";

import { useState } from "react";
import { useCollection } from "../../hooks/useCollection";
import type { Ceremony } from "../../types";
import { Plus, Pencil, Trash2, CalendarDays, Clock, MapPin, X } from "lucide-react";
import { Modal } from "../../components/Modal";

const SEED_CEREMONIES = [
  { name: "Haldi", color: "yellow" },
  { name: "Mehendi", color: "green" },
  { name: "Sangeet / Music Night", color: "purple" },
  { name: "Baraat", color: "red" },
  { name: "Pheras", color: "maroon" },
  { name: "Reception", color: "gold" },
];

const COLOR_CLASSES: Record<string, string> = {
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
  green: "bg-emerald-100 text-emerald-700 border-emerald-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  red: "bg-red-100 text-red-700 border-red-200",
  maroon: "bg-maroon-100 text-maroon-700 border-maroon-200",
  gold: "bg-gold-100 text-gold-700 border-gold-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
};

const BLANK: Omit<Ceremony, "id" | "createdAt"> = {
  name: "", date: "", time: "", venue: "", notes: "", color: "maroon"
};

export default function CeremoniesPage() {
  const { data: ceremonies, loading, add, update, remove } = useCollection<Ceremony>("ceremonies");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Ceremony | null>(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  function openAdd() { setForm(BLANK); setModal("add"); }
  function openEdit(c: Ceremony) { setEditing(c); setForm({ name: c.name, date: c.date, time: c.time, venue: c.venue, notes: c.notes, color: c.color }); setModal("edit"); }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (modal === "add") await add(form);
      else if (editing) await update(editing.id, form);
      setModal(null);
    } finally { setSaving(false); }
  }

  async function seedCeremonies() {
    for (const c of SEED_CEREMONIES) {
      await add({ ...BLANK, name: c.name, color: c.color });
    }
  }

  const sorted = [...ceremonies].sort((a, b) => (a.date || "z") < (b.date || "z") ? -1 : 1);

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Ceremonies</h1>
          <p className="text-gray-400 text-sm mt-0.5">{ceremonies.length} events planned</p>
        </div>
        <div className="flex gap-2">
          {ceremonies.length === 0 && (
            <button onClick={seedCeremonies} className="btn-secondary text-xs">Seed defaults</button>
          )}
          <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm py-12 text-center">Loading…</p>
      ) : sorted.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarDays size={32} className="text-ivory-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No ceremonies yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first ceremony or use "Seed defaults"</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((c) => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <span className={`badge border text-xs ${COLOR_CLASSES[c.color] || COLOR_CLASSES.maroon}`}>
                  {c.name}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-ivory-100 text-gray-400 hover:text-maroon-600">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => { if (confirm(`Delete "${c.name}"?`)) remove(c.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="font-serif text-xl font-semibold text-gray-800 leading-tight">{c.name}</h3>
              <div className="mt-2 space-y-1">
                {c.date && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <CalendarDays size={12} />
                    {new Date(c.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </div>
                )}
                {c.time && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock size={12} /> {c.time}
                  </div>
                )}
                {c.venue && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin size={12} /> {c.venue}
                  </div>
                )}
              </div>
              {c.notes && <p className="mt-2 text-xs text-gray-400 border-t border-ivory-200 pt-2">{c.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal title={modal === "add" ? "Add Ceremony" : "Edit Ceremony"} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">Ceremony Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sangeet" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Time</label>
                <input type="time" className="input" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Venue</label>
              <input className="input" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="e.g. Lotus Banquet Hall" />
            </div>
            <div>
              <label className="label">Colour tag</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(COLOR_CLASSES).map(([key, cls]) => (
                  <button key={key} onClick={() => setForm(f => ({ ...f, color: key }))}
                    className={`w-8 h-8 rounded-full border-2 ${cls} ${form.color === key ? "ring-2 ring-maroon-500 ring-offset-1" : ""}`} />
                ))}
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input resize-none h-20" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional details…" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary flex-1">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
//   return (
//     <div className="fixed inset-0 z-50 overflow-y-auto">
//       <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
//       <div className="relative min-h-full flex items-end sm:items-center justify-center p-4">
//         <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[calc(100dvh_-_2rem)] flex flex-col animate-in">
//           {/* Header — fixed size, never scrolls away */}
//           <div className="flex items-center justify-between px-5 py-4 border-b border-ivory-200 shrink-0">
//             <h2 className="font-serif text-xl font-semibold text-maroon-900">{title}</h2>
//             <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ivory-100"><X size={18} /></button>
//           </div>
//           {/* Body — only this scrolls */}
//           <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
//         </div>
//       </div>
//     </div>
//   );
// }