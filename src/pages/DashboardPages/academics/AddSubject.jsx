// src/pages/DashboardPages/Master/AddSubject.jsx
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { Toaster, toast } from "react-hot-toast";
import axiosInstance from "../../../components/AxiosInstance";

const Chip = ({ children }) => (
  <span className="inline-flex items-center justify-center h-6 px-2 text-xs rounded-full border border-emerald-300 text-emerald-700 bg-emerald-50 mr-1">
    {children}
  </span>
);

export default function AddSubject() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);

  const [selectedYearId, setSelectedYearId] = useState("");
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    class_ids: [],
    class_name: "",
    is_theory: true,
    is_practical: false,
  });

  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState(null);

  /* ---------- LOAD ACADEMIC YEARS ---------- */
  const loadYears = async () => {
    try {
      const res = await axiosInstance.get("academic-years/");
      setYears(res.data);
      const active = res.data.find((y) => y.is_active);
      setSelectedYearId(active?.id || res.data[0]?.id || "");
    } catch {
      toast.error("Failed to load academic years");
    }
  };

  /* ---------- LOAD CLASSES + SUBJECTS BY YEAR ---------- */
  const loadYearData = async (yearId) => {
    if (!yearId) return;
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        axiosInstance.get("classes/", { params: { year: yearId } }),
        axiosInstance.get("subjects/", { params: { year: yearId } }),
      ]);

      const cls = Array.isArray(cRes.data) ? cRes.data : cRes.data?.results || [];
      const subs = Array.isArray(sRes.data) ? sRes.data : sRes.data?.results || [];

      setClasses(cls);
      setSubjects(subs);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadYears();
  }, []);

  useEffect(() => {
    loadYearData(selectedYearId);
    setClassFilter(null);
  }, [selectedYearId]);

  /* ---------- OPTIONS ---------- */
  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c.id, label: c.name })),
    [classes]
  );

  const classNameById = useMemo(() => {
    const map = new Map();
    classes.forEach((c) => map.set(String(c.id), c.name));
    return map;
  }, [classes]);

  /* ---------- FILTER ---------- */
  const filtered = useMemo(() => {
    let data = [...subjects];
    if (q.trim()) {
      data = data.filter((s) =>
        (s.name || "").toLowerCase().includes(q.trim().toLowerCase())
      );
    }
    if (classFilter?.value) {
      data = data.filter(
        (s) => String(s.class_name) === String(classFilter.value)
      );
    }
    return data;
  }, [subjects, q, classFilter]);

  /* ---------- CREATE / EDIT ---------- */
  const openCreate = () => {
    setForm({
      name: "",
      class_ids: [],
      class_name: "",
      is_theory: true,
      is_practical: false,
    });
    setIsEditing(false);
    setCurrentId(null);
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      name: row.name,
      class_ids: [],
      class_name: row.class_name,
      is_theory: row.is_theory,
      is_practical: row.is_practical,
    });
    setIsEditing(true);
    setCurrentId(row.id);
    setIsModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Subject name required");

    try {
      isEditing ? setUpdating(true) : setSaving(true);

      if (isEditing) {
        await axiosInstance.put(`subjects/${currentId}/`, {
          name: form.name.trim(),
          class_name: form.class_name,
          is_theory: form.is_theory,
          is_practical: form.is_practical,
        });
        toast.success("Subject updated");
      } else {
        if (!form.class_ids.length)
          return toast.error("Select at least one class");

        await Promise.all(
          form.class_ids.map((c) =>
            axiosInstance.post("subjects/", {
              name: form.name.trim(),
              class_name: c.value,
              is_theory: form.is_theory,
              is_practical: form.is_practical,
            })
          )
        );
        toast.success("Subject(s) created");
      }

      setIsModalOpen(false);
      loadYearData(selectedYearId);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
      setUpdating(false);
    }
  };

  const destroy = async (id) => {
    if (!confirm("Delete this subject?")) return;
    setDeletingId(id);
    try {
      await axiosInstance.delete(`subjects/${id}/`);
      toast.success("Deleted");
      loadYearData(selectedYearId);
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4">
      <Toaster />

      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">Subject Management</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white"
        >
          Add Subject
        </button>
      </div>

      {/* YEAR FILTER */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm">View Year:</label>
        <select
          value={selectedYearId}
          onChange={(e) => setSelectedYearId(e.target.value)}
          className="border rounded px-3 py-2"
        >
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.year} {y.is_active && "(Active)"}
            </option>
          ))}
        </select>
      </div>

      {/* SEARCH + FILTER */}
      <div className="grid md:grid-cols-2 gap-4 max-w-2xl mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search subject..."
          className="border rounded px-3 py-2"
        />
        <Select
          isClearable
          options={classOptions}
          value={classFilter}
          onChange={setClassFilter}
          placeholder="All classes"
        />
      </div>

      {/* TABLE */}
      <div className="border rounded bg-white">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2 text-left">Subject</th>
              <th className="p-2 text-left">Class</th>
              <th className="p-2">Type</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="p-4 text-center">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="5" className="p-4 text-center">No subjects</td></tr>
            ) : (
              filtered.map((s, i) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2">{s.name}</td>
                  <td className="p-2">
                    {classNameById.get(String(s.class_name))}
                  </td>
                  <td className="p-2">
                    {[s.is_theory && "Theory", s.is_practical && "Practical"]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="p-2 text-right space-x-2">
                    <button
                      onClick={() => openEdit(s)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => destroy(s.id)}
                      disabled={deletingId === s.id}
                      className="px-3 py-1 bg-rose-600 text-white rounded"
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

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {isEditing ? "Edit Subject" : "Add Subject"}
            </h3>

            <form onSubmit={save} className="grid gap-4">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Subject name"
                className="border rounded px-3 py-2"
              />

              {isEditing ? (
                <Select
                  options={classOptions}
                  value={classOptions.find(
                    (o) => String(o.value) === String(form.class_name)
                  )}
                  onChange={(o) => setForm({ ...form, class_name: o.value })}
                />
              ) : (
                <Select
                  isMulti
                  options={classOptions}
                  value={form.class_ids}
                  onChange={(opts) => setForm({ ...form, class_ids: opts || [] })}
                />
              )}

              <div className="flex gap-4">
                <label>
                  <input
                    type="checkbox"
                    checked={form.is_theory}
                    onChange={(e) =>
                      setForm({ ...form, is_theory: e.target.checked })
                    }
                  />{" "}
                  Theory
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={form.is_practical}
                    onChange={(e) =>
                      setForm({ ...form, is_practical: e.target.checked })
                    }
                  />{" "}
                  Practical
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="border rounded px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white rounded px-4 py-2"
                >
                  {isEditing ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
