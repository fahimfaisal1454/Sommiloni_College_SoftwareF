// client/src/pages/DashboardPages/Master/AddSection.jsx
import { useEffect, useState, useMemo } from "react";
import AxiosInstance from "../../../components/axiosInstance";

export default function AddSection() {
  const [name, setName] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editing, setEditing] = useState(null); // id being edited
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await AxiosInstance.get("sections/");
      const list = Array.isArray(res.data) ? res.data : [];
      // sort by name for stable UI
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setRows(list);
    } catch (e) {
      console.error(e);
      alert("Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const cleaned = name.trim().toUpperCase();
    if (!cleaned) return;

    setSaving(true);
    try {
      if (editing) {
        await AxiosInstance.patch(`sections/${editing}/`, { name: cleaned });
      } else {
        // ⬇️ no is_active in payload
        await AxiosInstance.post("sections/", { name: cleaned });
      }
      setName("");
      setEditing(null);
      await load();
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.name ||
        "Save failed";
      alert(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row) => {
    setEditing(row.id);
    setName((row.name || "").toUpperCase());
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this section?")) return;
    setDeletingId(id);
    try {
      await AxiosInstance.delete(`sections/${id}/`);
      await load();
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.name ||
        "Delete failed";
      alert(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((r) => (r.name || "").toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="p-4 grid gap-4 md:grid-cols-2">
      <div className="bg-white rounded shadow p-4">
        <h2 className="text-xl font-semibold mb-4">
          {editing ? "Edit Section" : "Add Section"}
        </h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Section Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              className="border rounded p-2 w-full"
              placeholder="e.g., A"
              maxLength={20}
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded"
              disabled={saving}
            >
              {saving ? (editing ? "Updating…" : "Saving…") : editing ? "Update" : "Save"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setName("");
                }}
                className="px-4 py-2 rounded border"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded shadow p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Section List</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="border rounded p-2"
          />
        </div>
        {loading ? (
          <div className="p-2">Loading…</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left">Section</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button
                      onClick={() => startEdit(r)}
                      className="px-3 py-1 rounded bg-indigo-600 text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={deletingId === r.id}
                    >
                      {deletingId === r.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td className="px-3 py-6 text-slate-500" colSpan={2}>
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
