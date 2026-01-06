import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import AxiosInstance from "../../../components/AxiosInstance";

/* ---------------- Section Multi Select ---------------- */
function SectionMultiSelect({ sections, value, onChange, label = "Sections" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggle = (id) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  const preview =
    value.length === 0
      ? "None"
      : sections
          .filter((s) => value.includes(s.id))
          .map((s) => s.name)
          .join(", ");

  return (
    <div ref={rootRef} className="relative">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-left bg-white"
      >
        {preview}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow">
          {sections.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(s.id)}
                onChange={() => toggle(s.id)}
              />
              {s.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ======================= PAGE ======================= */
export default function AddClass() {
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);

  const [selectedYear, setSelectedYear] = useState("");
  const [className, setClassName] = useState("");
  const [picked, setPicked] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* EDIT STATE */
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editSections, setEditSections] = useState([]);
  const [updating, setUpdating] = useState(false);

  /* LOADERS */
  const loadYears = async () => {
    const res = await AxiosInstance.get("academic-years/");
    setYears(res.data);
    const active = res.data.find((y) => y.is_active);
    setSelectedYear(active?.id || res.data[0]?.id || "");
  };

  const loadSections = async () => {
    const res = await AxiosInstance.get("sections/");
    setSections(res.data);
  };

  const loadClasses = async (yearId) => {
    if (!yearId) return;
    setLoading(true);
    const res = await AxiosInstance.get("classes/", { params: { year: yearId } });
    setClasses(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadYears();
    loadSections();
  }, []);

  useEffect(() => {
    loadClasses(selectedYear);
  }, [selectedYear]);

  /* CREATE */
  const save = async (e) => {
    e.preventDefault();
    if (!className || !picked.length || !selectedYear) {
      toast.error("All fields are required");
      return;
    }

    try {
      setSaving(true);
      await AxiosInstance.post("classes/", {
        name: className.trim(),
        year: selectedYear,
        sections: picked,
      });
      toast.success("Class created");
      setClassName("");
      setPicked([]);
      loadClasses(selectedYear);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  /* EDIT */
  const openEdit = (row) => {
    setEditId(row.id);
    setEditName(row.name);
    setEditYear(row.year);
    setEditSections(row.sections_detail.map((s) => s.id));
    setShowEdit(true);
  };

  const update = async () => {
    if (!editName || !editYear || !editSections.length) {
      toast.error("All fields required");
      return;
    }

    try {
      setUpdating(true);
      await AxiosInstance.patch(`classes/${editId}/`, {
        name: editName.trim(),
        year: editYear,
        sections: editSections,
      });
      toast.success("Updated");
      setShowEdit(false);
      loadClasses(selectedYear);
    } catch {
      toast.error("Update failed");
    } finally {
      setUpdating(false);
    }
  };

  /* DELETE */
  const destroy = async (id) => {
    if (!window.confirm("Delete this class?")) return;
    try {
      await AxiosInstance.delete(`classes/${id}/`);
      toast.success("Deleted");
      loadClasses(selectedYear);
    } catch {
      toast.error("Delete failed");
    }
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.year_label?.includes(search)
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Toaster position="top-center" />

      <div className="bg-white border rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Class Management</h2>
          <p className="text-sm text-slate-500">
            Create a class (with academic year) and choose its sections.
          </p>
        </div>

        {/* CREATE */}
        <form onSubmit={save} className="px-6 py-5 grid grid-cols-4 gap-4">
          <input
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="Class Name"
            className="rounded-md border px-3 py-2"
          />

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-md border px-3 py-2"
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.year}
              </option>
            ))}
          </select>

          <SectionMultiSelect
            sections={sections}
            value={picked}
            onChange={setPicked}
          />

          <button
            disabled={saving}
            className="bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </form>

        {/* SEARCH */}
        <div className="px-6 pb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-80 rounded-md border px-3 py-2"
          />
        </div>

        {/* TABLE */}
        <div className="px-6 pb-6">
          <table className="w-full border rounded">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2 text-left">Class</th>
                <th className="p-2 text-center">Year</th>
                <th className="p-2">Sections</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-4 text-center">Loading…</td></tr>
              ) : filteredClasses.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center">No data</td></tr>
              ) : (
                filteredClasses.map((c, i) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2 font-medium">{c.name}</td>
                    <td className="p-2 text-center">{c.year_label}</td>
                    <td className="p-2">
                      {c.sections_detail.map((s) => s.name).join(", ")}
                    </td>
                    <td className="p-2 text-right space-x-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => destroy(c.id)}
                        className="px-3 py-1 rounded bg-rose-600 text-white hover:bg-rose-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="bg-white rounded-xl w-full max-w-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Class</h3>

            <div className="grid gap-4">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="border rounded px-3 py-2"
              />

              <select
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
                className="border rounded px-3 py-2"
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year}
                  </option>
                ))}
              </select>

              <SectionMultiSelect
                sections={sections}
                value={editSections}
                onChange={setEditSections}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEdit(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={update}
                disabled={updating}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                {updating ? "Updating…" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
