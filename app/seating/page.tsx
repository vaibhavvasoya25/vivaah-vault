"use client";

import { useState } from "react";
import { useCollection } from "../../hooks/useCollection";
import type { Table, Guest } from "../../types";
import { Plus, X, Pencil, Trash2, Users, MapPin, UserCheck, UserX } from "lucide-react";
import { Modal } from "../../components/Modal";

const BLANK_TABLE: Omit<Table, "id" | "createdAt"> = { name: "", capacity: 10, notes: "" };

export default function SeatingPage() {
  const { data: tables, loading: tLoad, add: addTable, update: updateTable, remove: removeTable } = useCollection<Table>("tables");
  const { data: guests, update: updateGuest } = useCollection<Guest>("guests");

  const [modal, setModal] = useState<"addTable" | "editTable" | "assign" | null>(null);
  const [editing, setEditing] = useState<Table | null>(null);
  const [form, setForm] = useState(BLANK_TABLE);
  const [assignTable, setAssignTable] = useState<Table | null>(null);
  const [saving, setSaving] = useState(false);

  function openAddTable() { setForm(BLANK_TABLE); setModal("addTable"); }
  function openEditTable(t: Table) { setEditing(t); setForm({ name: t.name, capacity: t.capacity, notes: t.notes }); setModal("editTable"); }
  function openAssign(t: Table) { setAssignTable(t); setModal("assign"); }

  async function handleSaveTable() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (modal === "addTable") await addTable(form);
      else if (editing) await updateTable(editing.id, form);
      setModal(null);
    } finally { setSaving(false); }
  }

  function guestsAtTable(tableId: string) {
    return guests.filter((g) => g.tableId === tableId);
  }

  function unassignedGuests() {
    return guests.filter((g) => !g.tableId);
  }

  async function toggleAssign(guest: Guest, tableId: string) {
    if (guest.tableId === tableId) {
      await updateGuest(guest.id, { tableId: "" });
    } else {
      await updateGuest(guest.id, { tableId });
    }
  }

  const totalSeats = tables.reduce((s, t) => s + t.capacity, 0);
  const totalAssigned = guests.filter((g) => g.tableId).length;

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title">Seating Planner</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {tables.length} tables · {totalAssigned}/{guests.length} guests assigned · {totalSeats} seats total
          </p>
        </div>
        <button onClick={openAddTable} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> Add Table
        </button>
      </div>

      {/* Unassigned banner */}
      {unassignedGuests().length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <UserX size={18} className="text-amber-500 shrink-0" />
          <p className="text-amber-700 text-sm">
            <span className="font-semibold">{unassignedGuests().length} guests</span> are not assigned to any table
          </p>
        </div>
      )}

      {tLoad ? <p className="text-center text-gray-400 text-sm py-12">Loading…</p> : (
        <>
          {tables.length === 0 ? (
            <div className="card text-center py-12">
              <MapPin size={32} className="text-ivory-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No tables defined yet</p>
              <p className="text-gray-400 text-sm mt-1">Add tables to start seating your guests</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tables.map((t) => {
                const seated = guestsAtTable(t.id);
                const pct = t.capacity > 0 ? (seated.length / t.capacity) * 100 : 0;
                const full = seated.length >= t.capacity;
                return (
                  <div key={t.id} className={`card ${full ? "border-amber-200" : ""}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-serif text-lg font-semibold text-gray-800">{t.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {seated.length}/{t.capacity} seats
                          {full && <span className="ml-1 text-amber-600 font-medium">· Full</span>}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditTable(t)} className="p-1.5 rounded-lg hover:bg-ivory-100 text-gray-400 hover:text-maroon-600">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => { if (confirm(`Delete "${t.name}"? Guests will be unassigned.`)) removeTable(t.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Capacity bar */}
                    <div className="h-1.5 bg-ivory-200 rounded-full overflow-hidden mb-3">
                      <div className={`h-full rounded-full transition-all ${full ? "bg-amber-400" : "bg-maroon-600"}`}
                        style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>

                    {/* Guest list */}
                    {seated.length > 0 ? (
                      <div className="space-y-1.5">
                        {seated.map((g) => (
                          <div key={g.id} className="flex items-center justify-between text-xs bg-ivory-50 rounded-lg px-2.5 py-1.5">
                            <span className="text-gray-700">{g.name}{g.plusOnes > 0 ? ` +${g.plusOnes}` : ""}</span>
                            <button onClick={() => updateGuest(g.id, { tableId: "" })} className="text-gray-300 hover:text-red-400 ml-2">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300 italic text-center py-2">No guests assigned</p>
                    )}

                    {!full && (
                      <button onClick={() => openAssign(t)} className="btn-ghost w-full mt-3 text-xs flex items-center justify-center gap-1.5">
                        <UserCheck size={14} /> Assign guests
                      </button>
                    )}

                    {t.notes && <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-ivory-200">{t.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Unassigned guests list */}
          {unassignedGuests().length > 0 && (
            <div className="card">
              <h2 className="font-serif text-lg font-semibold text-maroon-900 mb-3">
                Unassigned Guests <span className="text-base text-gray-400">({unassignedGuests().length})</span>
              </h2>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {unassignedGuests().map((g) => (
                  <div key={g.id} className="flex items-center justify-between bg-ivory-50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-700">{g.name}{g.plusOnes > 0 ? ` +${g.plusOnes}` : ""}</span>
                    {tables.length > 0 && (
                      <select className="text-xs border border-ivory-300 rounded-lg px-2 py-1 bg-white ml-2 text-gray-500"
                        value="" onChange={e => { if (e.target.value) updateGuest(g.id, { tableId: e.target.value }); }}>
                        <option value="">Assign…</option>
                        {tables.filter(t => guestsAtTable(t.id).length < t.capacity).map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.capacity - guestsAtTable(t.id).length} free)</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Table Modal */}
      {(modal === "addTable" || modal === "editTable") && (
        <Modal title={modal === "addTable" ? "Add Table" : "Edit Table"} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">Table Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Table 1 · VIP" autoFocus />
            </div>
            <div>
              <label className="label">Capacity (seats)</label>
              <input type="number" min={1} max={50} className="input" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Near stage, family only" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSaveTable} disabled={saving || !form.name.trim()} className="btn-primary flex-1">
                {saving ? "Saving…" : "Save Table"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Guests Modal */}
      {modal === "assign" && assignTable && (
        <Modal title={`Assign to ${assignTable.name}`} onClose={() => setModal(null)}>
          <div className="space-y-1.5">
            <p className="text-xs text-gray-400 -mt-1 mb-2">
              {guestsAtTable(assignTable.id).length}/{assignTable.capacity} filled
            </p>
            {guests.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No guests added yet</p>
            ) : guests.map((g) => {
              const isHere = g.tableId === assignTable.id;
              const otherTable = tables.find(t => t.id === g.tableId && t.id !== assignTable.id);
              const tableFull = guestsAtTable(assignTable.id).length >= assignTable.capacity;
              return (
                <label key={g.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${isHere ? "bg-maroon-50" : "hover:bg-ivory-50"
                  } ${tableFull && !isHere ? "opacity-40 pointer-events-none" : ""}`}>
                  <input type="checkbox" checked={isHere} onChange={() => toggleAssign(g, assignTable.id)}
                    className="rounded border-ivory-400 text-maroon-600 focus:ring-maroon-300" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{g.name}{g.plusOnes > 0 ? ` +${g.plusOnes}` : ""}</p>
                    {otherTable && <p className="text-xs text-amber-600">Currently at {otherTable.name}</p>}
                  </div>
                  <span className="text-xs text-gray-400">{g.side}</span>
                </label>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}