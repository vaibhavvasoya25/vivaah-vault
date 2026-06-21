import { Modal } from "../Modal"; // match the same relative depth as your useCollection import above

export const GuestModal = ({ form, setForm, ceremonies, tables, saving, onSave, onClose, title }: any) => {
  function toggleCeremony(cid: string) {
    setForm((f: any) => ({
      ...f,
      ceremonies: f.ceremonies.includes(cid) ? f.ceremonies.filter((c: string) => c !== cid) : [...f.ceremonies, cid]
    }));
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">Full Name *</label>
          <input className="input" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="Priya Vasoya" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Side</label>
            <select className="input" value={form.side} onChange={e => setForm((f: any) => ({ ...f, side: e.target.value }))}>
              <option value="bride">Bride's side</option>
              <option value="groom">Groom's side</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className="label">RSVP</label>
            <select className="input" value={form.rsvp} onChange={e => setForm((f: any) => ({ ...f, rsvp: e.target.value }))}>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.contact} onChange={e => setForm((f: any) => ({ ...f, contact: e.target.value }))} placeholder="98765 43210" />
          </div>
          <div>
            <label className="label">Plus-ones</label>
            <input type="number" min={0} max={10} className="input" value={form.plusOnes} onChange={e => setForm((f: any) => ({ ...f, plusOnes: Number(e.target.value) }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Dietary</label>
            <select className="input" value={form.dietary} onChange={e => setForm((f: any) => ({ ...f, dietary: e.target.value }))}>
              <option value="veg">Veg</option>
              <option value="jain">Jain</option>
              <option value="non-veg">Non-veg</option>
              <option value="vegan">Vegan</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Table</label>
            <select className="input" value={form.tableId} onChange={e => setForm((f: any) => ({ ...f, tableId: e.target.value }))}>
              <option value="">Unassigned</option>
              {tables.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        {ceremonies.length > 0 && (
          <div>
            <label className="label">Invited to Ceremonies</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ceremonies.map((c: any) => (
                <button key={c.id} onClick={() => toggleCeremony(c.id)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    form.ceremonies.includes(c.id)
                      ? "bg-maroon-800 text-white border-maroon-800"
                      : "bg-white text-gray-600 border-ivory-300 hover:border-maroon-300"
                  }`}>{c.name}</button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="label">Notes</label>
          <textarea className="input resize-none h-16" value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Any special notes…" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onSave} disabled={saving || !form.name.trim()} className="btn-primary flex-1">
            {saving ? "Saving…" : "Save Guest"}
          </button>
        </div>
      </div>
    </Modal>
  );
}