"use client";

import { useState, useMemo } from "react";
import { useCollection } from "../../hooks/useCollection";
import type { Guest, Ceremony, Table, RSVPStatus, GuestSide, DietaryPref } from "../../types";
import { Plus, Search, X, Pencil, Trash2, Users, ChevronDown, ChevronUp } from "lucide-react";
import { GuestModal } from "../../components/guests/Modal";

const BLANK: Omit<Guest, "id" | "createdAt"> = {
  name: "", side: "bride", contact: "", rsvp: "pending", plusOnes: 0,
  dietary: "veg", tableId: "", ceremonies: [], notes: ""
};

const RSVP_LABELS: Record<RSVPStatus, string> = { confirmed: "Confirmed", pending: "Pending", declined: "Declined" };
const SIDE_LABELS: Record<GuestSide, string> = { bride: "Bride's side", groom: "Groom's side", both: "Both sides" };
const DIETARY_LABELS: Record<DietaryPref, string> = { veg: "Veg", jain: "Jain", "non-veg": "Non-veg", vegan: "Vegan", other: "Other" };

export default function GuestsPage() {
  const { data: guests, loading, add, update, remove } = useCollection<Guest>("guests");
  const { data: ceremonies } = useCollection<Ceremony>("ceremonies");
  const { data: tables } = useCollection<Table>("tables");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [form, setForm] = useState<Omit<Guest, "id" | "createdAt">>(BLANK);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRsvp, setFilterRsvp] = useState<RSVPStatus | "all">("all");
  const [filterSide, setFilterSide] = useState<GuestSide | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  function openAdd() { setForm(BLANK); setModal("add"); }
  function openEdit(g: Guest) {
    setEditing(g);
    setForm({ name: g.name, side: g.side, contact: g.contact, rsvp: g.rsvp, plusOnes: g.plusOnes,
      dietary: g.dietary, tableId: g.tableId, ceremonies: g.ceremonies, notes: g.notes });
    setModal("edit");
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (modal === "add") await add(form);
      else if (editing) await update(editing.id, form);
      setModal(null);
    } finally { setSaving(false); }
  }

  const filtered = useMemo(() => {
    return guests.filter((g) => {
      if (search && !g.name.toLowerCase().includes(search.toLowerCase()) &&
          !g.contact.includes(search)) return false;
      if (filterRsvp !== "all" && g.rsvp !== filterRsvp) return false;
      if (filterSide !== "all" && g.side !== filterSide) return false;
      return true;
    });
  }, [guests, search, filterRsvp, filterSide]);

  const totalHeadcount = filtered.reduce((s, g) => s + 1 + g.plusOnes, 0);

  const rsvpClass: Record<RSVPStatus, string> = {
    confirmed: "status-confirmed", pending: "status-maybe", declined: "status-pending"
  };

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Guests</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {guests.length} guests · {guests.reduce((s, g) => s + 1 + g.plusOnes, 0)} total including plus-ones
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> Add Guest
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "confirmed", "pending", "declined"] as const).map((s) => (
          <button key={s} onClick={() => setFilterRsvp(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterRsvp === s ? "bg-maroon-800 text-white border-maroon-800" : "bg-white text-gray-600 border-ivory-300 hover:border-maroon-300"
            }`}>
            {s === "all" ? `All (${guests.length})` :
              `${RSVP_LABELS[s]} (${guests.filter(g => g.rsvp === s).length})`}
          </button>
        ))}
        <div className="ml-auto">
          <select value={filterSide} onChange={e => setFilterSide(e.target.value as any)}
            className="input py-1.5 text-xs w-auto">
            <option value="all">All sides</option>
            <option value="bride">Bride's side</option>
            <option value="groom">Groom's side</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={14} /></button>}
      </div>

      {/* Count */}
      {filtered.length !== guests.length && (
        <p className="text-xs text-gray-400">{filtered.length} results · {totalHeadcount} people</p>
      )}

      {loading ? (
        <p className="text-center text-gray-400 text-sm py-12">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Users size={32} className="text-ivory-400 mx-auto mb-3" />
          <p className="text-gray-500">{guests.length === 0 ? "No guests added yet" : "No guests match filters"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((g) => {
            const table = tables.find(t => t.id === g.tableId);
            const isOpen = expanded === g.id;
            return (
              <div key={g.id} className="card py-3 px-4">
                <div className="flex items-center gap-3" onClick={() => setExpanded(isOpen ? null : g.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800 text-sm truncate">{g.name}</p>
                      <span className={rsvpClass[g.rsvp]}>{RSVP_LABELS[g.rsvp]}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {SIDE_LABELS[g.side]} · {g.plusOnes > 0 ? `+${g.plusOnes}` : "no plus-ones"}
                      {table ? ` · ${table.name}` : ""}
                    </p>
                  </div>
                  <button className="text-gray-400 p-1">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-ivory-200 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div><span className="text-gray-400">Phone:</span> {g.contact || "—"}</div>
                    <div><span className="text-gray-400">Diet:</span> {DIETARY_LABELS[g.dietary]}</div>
                    <div><span className="text-gray-400">Table:</span> {table?.name || "Unassigned"}</div>
                    <div><span className="text-gray-400">Plus-ones:</span> {g.plusOnes}</div>
                    {g.ceremonies.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Ceremonies:</span>{" "}
                        {g.ceremonies.map(cid => ceremonies.find(c => c.id === cid)?.name).filter(Boolean).join(", ")}
                      </div>
                    )}
                    {g.notes && <div className="col-span-2"><span className="text-gray-400">Notes:</span> {g.notes}</div>}
                    <div className="col-span-2 flex gap-2 mt-1">
                      <button onClick={() => openEdit(g)} className="btn-ghost py-1.5 text-xs flex items-center gap-1">
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => { if (confirm(`Remove ${g.name}?`)) remove(g.id); }}
                        className="text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 text-xs flex items-center gap-1">
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <GuestModal
          form={form}
          setForm={setForm}
          ceremonies={ceremonies}
          tables={tables}
          saving={saving}
          onSave={handleSave}
          onClose={() => setModal(null)}
          title={modal === "add" ? "Add Guest" : "Edit Guest"}
        />
      )}
    </div>
  );
}

// function GuestModal({ form, setForm, ceremonies, tables, saving, onSave, onClose, title }: any) {
//   function toggleCeremony(cid: string) {
//     setForm((f: any) => ({
//       ...f,
//       ceremonies: f.ceremonies.includes(cid) ? f.ceremonies.filter((c: string) => c !== cid) : [...f.ceremonies, cid]
//     }));
//   }

//   return (
//     <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
//       <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
//       <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto animate-in">
//         <div className="flex items-center justify-between px-5 py-4 border-b border-ivory-200 sticky top-0 bg-white rounded-t-2xl">
//           <h2 className="font-serif text-xl font-semibold text-maroon-900">{title}</h2>
//           <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ivory-100"><X size={18} /></button>
//         </div>
//         <div className="px-5 py-4 space-y-3">
//           <div>
//             <label className="label">Full Name *</label>
//             <input className="input" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="Priya Vasoya" />
//           </div>
//           <div className="grid grid-cols-2 gap-3">
//             <div>
//               <label className="label">Side</label>
//               <select className="input" value={form.side} onChange={e => setForm((f: any) => ({ ...f, side: e.target.value }))}>
//                 <option value="bride">Bride's side</option>
//                 <option value="groom">Groom's side</option>
//                 <option value="both">Both</option>
//               </select>
//             </div>
//             <div>
//               <label className="label">RSVP</label>
//               <select className="input" value={form.rsvp} onChange={e => setForm((f: any) => ({ ...f, rsvp: e.target.value }))}>
//                 <option value="pending">Pending</option>
//                 <option value="confirmed">Confirmed</option>
//                 <option value="declined">Declined</option>
//               </select>
//             </div>
//           </div>
//           <div className="grid grid-cols-2 gap-3">
//             <div>
//               <label className="label">Phone</label>
//               <input className="input" value={form.contact} onChange={e => setForm((f: any) => ({ ...f, contact: e.target.value }))} placeholder="98765 43210" />
//             </div>
//             <div>
//               <label className="label">Plus-ones</label>
//               <input type="number" min={0} max={10} className="input" value={form.plusOnes} onChange={e => setForm((f: any) => ({ ...f, plusOnes: Number(e.target.value) }))} />
//             </div>
//           </div>
//           <div className="grid grid-cols-2 gap-3">
//             <div>
//               <label className="label">Dietary</label>
//               <select className="input" value={form.dietary} onChange={e => setForm((f: any) => ({ ...f, dietary: e.target.value }))}>
//                 <option value="veg">Veg</option>
//                 <option value="jain">Jain</option>
//                 <option value="non-veg">Non-veg</option>
//                 <option value="vegan">Vegan</option>
//                 <option value="other">Other</option>
//               </select>
//             </div>
//             <div>
//               <label className="label">Table</label>
//               <select className="input" value={form.tableId} onChange={e => setForm((f: any) => ({ ...f, tableId: e.target.value }))}>
//                 <option value="">Unassigned</option>
//                 {tables.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
//               </select>
//             </div>
//           </div>
//           {ceremonies.length > 0 && (
//             <div>
//               <label className="label">Invited to Ceremonies</label>
//               <div className="flex flex-wrap gap-2 mt-1">
//                 {ceremonies.map((c: any) => (
//                   <button key={c.id} onClick={() => toggleCeremony(c.id)}
//                     className={`px-3 py-1 rounded-full text-xs border transition-colors ${
//                       form.ceremonies.includes(c.id)
//                         ? "bg-maroon-800 text-white border-maroon-800"
//                         : "bg-white text-gray-600 border-ivory-300 hover:border-maroon-300"
//                     }`}>{c.name}</button>
//                 ))}
//               </div>
//             </div>
//           )}
//           <div>
//             <label className="label">Notes</label>
//             <textarea className="input resize-none h-16" value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Any special notes…" />
//           </div>
//           <div className="flex gap-2 pt-2">
//             <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
//             <button onClick={onSave} disabled={saving || !form.name.trim()} className="btn-primary flex-1">
//               {saving ? "Saving…" : "Save Guest"}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }