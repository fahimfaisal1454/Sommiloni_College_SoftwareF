// src/pages/DashboardPages/academics/ExamsAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import AxiosInstance from "../../../components/AxiosInstance";
import { toast } from "react-hot-toast";

export default function ExamsAdmin() {
  /* --------------------- State --------------------- */
  const [years, setYears] = useState([]); // [{value,label}]
  const [classes, setClasses] = useState([]); // raw class objects

  const [form, setForm] = useState({
    year: null, // {value,label}
    class_name: [], // multi-select [{value,label}]
    section: [], // multi-select [{value,label,classId}]
    name: "",
  });

  const [exams, setExams] = useState([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit exam name
  const [editing, setEditing] = useState(null); // {id} | null
  const [editingName, setEditingName] = useState("");

  // Configure subject marks (CQ / MCQ / Practical)
  const [configExam, setConfigExam] = useState(null); // exam object
  const [configRows, setConfigRows] = useState([]); // [{subjectId, subjectName, isPractical, isTheory, use_cq, use_mcq, use_practical, full_cq, full_mcq, full_practical, configId?}]
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  /* --------------------- Fetch years --------------------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await AxiosInstance.get("classes/years/");
        const serverYears = Array.isArray(res.data)
          ? res.data.map((y) => ({ value: y, label: String(y) }))
          : [];
        setYears(serverYears);

        // preselect latest year
        if (serverYears.length) {
          const latest = serverYears
            .slice()
            .sort((a, b) => Number(b.value) - Number(a.value))[0];
          setForm((p) => ({ ...p, year: latest }));
        }
      } catch {
        toast.error("Failed to load years");
      }
    })();
  }, []);

  /* --------------------- Fetch classes for year --------------------- */
  useEffect(() => {
    if (!form.year?.value) {
      setClasses([]);
      setForm((p) => ({ ...p, class_name: [], section: [] }));
      return;
    }
    (async () => {
      try {
        const { data } = await AxiosInstance.get("classes/", {
          params: { year: form.year.value },
        });
        const list = Array.isArray(data) ? data : data?.results || [];
        setClasses(list);
      } catch {
        toast.error("Failed to load classes");
        setClasses([]);
      }
    })();
  }, [form.year]);

  /* --------------------- Options & lookup maps --------------------- */
  const classOptions = useMemo(
    () => classes.map((cls) => ({ value: cls.id, label: cls.name })),
    [classes]
  );

  const classIdToName = useMemo(() => {
    const m = new Map();
    classes.forEach((c) => m.set(Number(c.id), c.name));
    return m;
  }, [classes]);

  const selectedClassIds = useMemo(
    () => form.class_name.map((c) => Number(c.value)),
    [form.class_name]
  );

  const allSectionOptions = useMemo(() => {
    let out = [];
    for (const cls of classes) {
      if (selectedClassIds.includes(Number(cls.id))) {
        const secs = (cls.sections_detail || cls.sections || []).map((s) => ({
          value: s.id,
          label: s.name,
          classId: Number(cls.id),
        }));
        out = out.concat(secs);
      }
    }
    return out;
  }, [classes, selectedClassIds]);

  const sectionIdToNameByClass = useMemo(() => {
    // Map<classId, Map<sectionId, sectionName>>
    const root = new Map();
    for (const cls of classes) {
      const m = new Map();
      const secs = cls.sections_detail || cls.sections || [];
      secs.forEach((s) => m.set(Number(s.id), s.name));
      root.set(Number(cls.id), m);
    }
    return root;
  }, [classes]);

  /* --------------------- Load exams (for chosen pairs) --------------------- */
  const loadExams = async () => {
    if (!form.year?.value || !form.class_name.length || !form.section.length) {
      setExams([]);
      return;
    }
    setLoading(true);
    try {
      const collected = new Map();
      for (const cls of form.class_name) {
        const clsId = Number(cls.value);
        const secForClass = form.section.filter(
          (s) => Number(s.classId) === clsId
        );
        for (const sec of secForClass) {
          const { data } = await AxiosInstance.get("exams/", {
            params: {
              class_name: clsId,
              section: Number(sec.value),
              year: form.year.value,
            },
          });
          const list = Array.isArray(data) ? data : data?.results || [];
          list.forEach((ex) => collected.set(ex.id, ex));
        }
      }
      setExams(Array.from(collected.values()));
    } catch {
      toast.error("Failed to load exams");
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
    // we intentionally ignore loadExams in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.year, form.class_name, form.section]);

  /* --------------------- Create exams --------------------- */
  const createExam = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!form.year?.value || !form.class_name.length || !form.section.length || !name) {
      return toast.error("Fill Year, Classes, Sections, Exam name");
    }

    const pairs = [];
    for (const cls of form.class_name) {
      const clsId = Number(cls.value);
      for (const sec of form.section.filter(
        (s) => Number(s.classId) === clsId
      )) {
        pairs.push({ class_name: clsId, section: Number(sec.value) });
      }
    }
    if (!pairs.length) return toast.error("No valid class–section pairs");

    setCreating(true);
    try {
      let ok = 0;
      let fail = 0;
      for (const p of pairs) {
        try {
          await AxiosInstance.post("exams/", {
            class_name: p.class_name,
            section: p.section,
            year: form.year.value,
            name,
          });
          ok++;
        } catch {
          fail++;
        }
      }

      if (fail === 0) {
        toast.success(`Created ${ok} exam${ok > 1 ? "s" : ""}`);
      } else {
        toast(
          `Created ${ok}, failed ${fail}. Check duplicates/permissions.`
        );
      }

      setForm((prev) => ({ ...prev, name: "" }));
      await loadExams();
    } finally {
      setCreating(false);
    }
  };

  /* --------------------- Exam actions --------------------- */
  const togglePublish = async (ex) => {
    try {
      await AxiosInstance.patch(`exams/${ex.id}/`, {
        is_published: !ex.is_published,
      });
      toast.success(!ex.is_published ? "Published" : "Unpublished");
      await loadExams();
    } catch {
      toast.error("Update failed");
    }
  };

  const openEdit = (ex) => {
    setEditing({ id: ex.id });
    setEditingName(ex.name || "");
  };

  const saveEdit = async () => {
    if (!editing?.id) return;
    const name = editingName.trim();
    if (!name) return toast.error("Name required");
    try {
      await AxiosInstance.patch(`exams/${editing.id}/`, { name });
      toast.success("Updated");
      setEditing(null);
      await loadExams();
    } catch {
      toast.error("Update failed");
    }
  };

  const removeExam = async (ex) => {
    if (!window.confirm(`Delete "${ex.name}"?`)) return;
    try {
      await AxiosInstance.delete(`exams/${ex.id}/`);
      toast.success("Deleted");
      await loadExams();
    } catch {
      toast.error("Delete failed");
    }
  };

  /* --------------------- Subject marks config helpers --------------------- */

  const computeDefaultConfig = (exam, subject, existing) => {
    // If we already have config from backend, just map it.
    if (existing) {
      return {
        use_cq: existing.full_cq > 0,
        use_mcq: existing.full_mcq > 0,
        use_practical: existing.full_practical > 0,
        full_cq: existing.full_cq ? String(existing.full_cq) : "",
        full_mcq: existing.full_mcq ? String(existing.full_mcq) : "",
        full_practical: existing.full_practical
          ? String(existing.full_practical)
          : "",
      };
    }

    // Simple heuristic defaults based on exam name + practical flag
    const exName = String(exam?.name || "").toLowerCase();
    const isHalf = exName.includes("half");
    const isFinal = exName.includes("final") || exName.includes("annual");
    const hasPractical = !!subject.is_practical;

    let use_cq = true;
    let use_mcq = false;
    let use_practical = false;
    let full_cq = "";
    let full_mcq = "";
    let full_practical = "";

    if (isHalf) {
      // Half-yearly patterns (total 50)
      if (hasPractical) {
        // e.g. ICT / Economics / Geography — 30 CQ + 20 MCQ
        use_cq = true;
        use_mcq = true;
        use_practical = false;
        full_cq = "30";
        full_mcq = "20";
      } else {
        // theory only
        use_cq = true;
        full_cq = "50";
      }
    } else if (isFinal) {
      // Year final patterns (total 100)
      if (hasPractical) {
        // e.g. ICT with practical: 50 CQ + 25 MCQ + 25 Practical
        use_cq = true;
        use_mcq = true;
        use_practical = true;
        full_cq = "50";
        full_mcq = "25";
        full_practical = "25";
      } else {
        // Bangla / English: 70 CQ + 30 MCQ
        use_cq = true;
        use_mcq = true;
        full_cq = "70";
        full_mcq = "30";
      }
    } else {
      // Fallback: 100 total; if practical subject then 75+25
      if (hasPractical) {
        use_cq = true;
        use_practical = true;
        full_cq = "75";
        full_practical = "25";
      } else {
        use_cq = true;
        full_cq = "100";
      }
    }

    return { use_cq, use_mcq, use_practical, full_cq, full_mcq, full_practical };
  };

  const totalForRow = (r) => {
    const cq = r.use_cq ? Number(r.full_cq || 0) : 0;
    const mcq = r.use_mcq ? Number(r.full_mcq || 0) : 0;
    const prac = r.use_practical ? Number(r.full_practical || 0) : 0;
    return cq + mcq + prac;
  };

  const updateConfigRow = (subjectId, patch) => {
    setConfigRows((rows) =>
      rows.map((r) =>
        r.subjectId === subjectId
          ? {
              ...r,
              ...patch,
            }
          : r
      )
    );
  };

  /* --------------------- Open / close config modal --------------------- */

  const openConfig = async (ex) => {
    setConfigExam(ex);
    setConfigRows([]);
    setConfigLoading(true);

    try {
      const classId = Number(ex.class_name?.id ?? ex.class_name);
      if (!classId) {
        throw new Error("Exam has no class_name id");
      }

      // 1) Load subjects for this class
      const subRes = await AxiosInstance.get("subjects/", {
        params: { class_id: classId },
      });
      const subjects = Array.isArray(subRes.data)
        ? subRes.data
        : subRes.data?.results || [];

      // 2) Load existing configs for this exam
      let existing = [];
      try {
        const cfgRes = await AxiosInstance.get("exam-subject-configs/", {
          params: { exam: ex.id },
        });
        existing = Array.isArray(cfgRes.data)
          ? cfgRes.data
          : cfgRes.data?.results || [];
      } catch (err) {
        console.warn("Failed to load exam-subject-configs:", err);
        existing = [];
      }

      const bySubject = new Map();
      existing.forEach((c) => {
        const sid = Number(c.subject?.id ?? c.subject);
        if (sid) bySubject.set(sid, c);
      });

      const rows = subjects.map((s) => {
        const sid = Number(s.id);
        const existingCfg = bySubject.get(sid);
        const base = computeDefaultConfig(ex, s, existingCfg);
        return {
          subjectId: sid,
          subjectName: s.name,
          isPractical: !!s.is_practical,
          isTheory: !!s.is_theory,
          configId: existingCfg?.id ?? null,
          ...base,
        };
      });

      rows.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
      setConfigRows(rows);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load subjects / marks setup.");
      setConfigExam(null);
      setConfigRows([]);
    } finally {
      setConfigLoading(false);
    }
  };

  const closeConfig = () => {
    setConfigExam(null);
    setConfigRows([]);
  };

  const saveConfig = async () => {
    if (!configExam) return;
    setConfigSaving(true);

    try {
      const promises = [];

      for (const r of configRows) {
        const isAnyEnabled = r.use_cq || r.use_mcq || r.use_practical;

        // If nothing enabled but we had an existing config -> delete it
        if (!isAnyEnabled && r.configId) {
          promises.push(
            AxiosInstance.delete(`exam-subject-configs/${r.configId}/`).catch(
              (e) => {
                console.error(e);
              }
            )
          );
          continue;
        }

        if (!isAnyEnabled) continue;

        const payload = {
          exam: configExam.id,
          subject: r.subjectId,
          full_cq: r.use_cq ? Number(r.full_cq || 0) : 0,
          full_mcq: r.use_mcq ? Number(r.full_mcq || 0) : 0,
          full_practical: r.use_practical ? Number(r.full_practical || 0) : 0,
        };

        if (r.configId) {
          // update existing
          promises.push(
            AxiosInstance.patch(
              `exam-subject-configs/${r.configId}/`,
              payload
            )
          );
        } else {
          // create new
          promises.push(
            AxiosInstance.post("exam-subject-configs/", payload)
          );
        }
      }

      await Promise.all(promises);
      toast.success("Subject marks setup saved");
      closeConfig();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.detail || "Saving marks setup failed";
      toast.error(typeof msg === "string" ? msg : "Saving marks setup failed");
    } finally {
      setConfigSaving(false);
    }
  };

  /* --------------------- Grouping & labels --------------------- */
  // year -> classKey -> sectionKey -> [exams]
  const grouped = useMemo(() => {
    const byYear = new Map();
    for (const ex of exams) {
      const yr = ex.year ?? "—";
      const clsId = Number(ex.class_name?.id ?? ex.class_name);
      const secId = Number(ex.section?.id ?? ex.section);

      if (!byYear.has(yr)) byYear.set(yr, new Map());
      const byClass = byYear.get(yr);
      if (!byClass.has(clsId)) byClass.set(clsId, new Map());
      const bySec = byClass.get(clsId);
      if (!bySec.has(secId)) bySec.set(secId, []);
      bySec.get(secId).push(ex);
    }
    return byYear;
  }, [exams]);

  const yearsSorted = useMemo(
    () => Array.from(grouped.keys()).sort((a, b) => String(b).localeCompare(String(a))),
    [grouped]
  );

  const labelClass = (clsIdOrObj) => {
    if (clsIdOrObj?.name) return clsIdOrObj.name;
    const id = Number(clsIdOrObj);
    return classIdToName.get(id) || `Class ID: ${id}`;
  };

  const labelSection = (clsId, secIdOrObj) => {
    if (secIdOrObj?.name) return secIdOrObj.name;
    const sid = Number(secIdOrObj);
    const m = sectionIdToNameByClass.get(Number(clsId));
    return m?.get(sid) || `Section ID: ${sid}`;
  };

  /* --------------------- UI --------------------- */
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Exams (Admin)</h1>

      {/* Create form */}
      <form
        onSubmit={createExam}
        className="bg-white border p-4 rounded-md space-y-3"
      >
        <div className="grid md:grid-cols-5 gap-3">
          <div>
            <label className="text-sm font-semibold">Year</label>
            <Select
              options={years}
              value={form.year}
              onChange={(val) =>
                setForm((p) => ({
                  ...p,
                  year: val,
                  class_name: [],
                  section: [],
                }))
              }
              placeholder="Select year"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Classes</label>
            <Select
              isMulti
              options={classOptions}
              value={form.class_name}
              onChange={(val) =>
                setForm((p) => ({ ...p, class_name: val, section: [] }))
              }
              isDisabled={!form.year}
              placeholder="Select classes"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold">Sections</label>
            <Select
              isMulti
              options={allSectionOptions}
              value={form.section}
              onChange={(val) => setForm((p) => ({ ...p, section: val }))}
              isDisabled={!form.class_name.length}
              placeholder="Select sections"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Exam name</label>
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="e.g., Half Yearly / Year Final"
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
            />
          </div>
        </div>

        <button
          className="bg-[#2c8e3f] text-white rounded px-3 py-1"
          disabled={creating}
        >
          {creating ? "Creating..." : "Create Exam(s)"}
        </button>
      </form>

      {/* Organized list */}
      <div className="bg-white border p-4 rounded-md">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Exams</h2>
          {loading && <span className="text-xs text-gray-500">Loading…</span>}
        </div>

        {!exams.length ? (
          <p className="text-sm text-gray-600 mt-2">No exams.</p>
        ) : (
          <div className="mt-3 space-y-6">
            {yearsSorted.map((yr) => {
              const classMap = grouped.get(yr);
              const classIds = Array.from(classMap.keys());
              const total = Array.from(classMap.values()).reduce(
                (acc, m) =>
                  acc +
                  Array.from(m.values()).reduce(
                    (a, arr) => a + arr.length,
                    0
                  ),
                0
              );

              return (
                <section key={yr} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Year {yr}
                    </h3>
                    <span className="text-[10px] text-gray-500">
                      {total} exam{total > 1 ? "s" : ""}
                    </span>
                  </div>

                  {classIds.map((cid) => {
                    const bySection = classMap.get(cid);
                    const allForClass = Array.from(bySection.values()).flat();
                    const sample = allForClass[0];
                    const classText = labelClass(sample?.class_name ?? cid);

                    return (
                      <div
                        key={`${yr}-${cid}`}
                        className="rounded-lg border bg-gray-50"
                      >
                        <div className="px-3 py-2 border-b flex items-center justify-between">
                          <div className="text-sm font-medium">
                            {classText}
                          </div>
                          <span className="text-xs text-gray-500">
                            {allForClass.length} item
                            {allForClass.length > 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="p-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                          {Array.from(bySection.keys()).map((sid) => {
                            const list = bySection.get(sid);
                            const sampleSec = list[0];
                            const secText = labelSection(
                              cid,
                              sampleSec?.section ?? sid
                            );

                            return (
                              <div
                                key={`${yr}-${cid}-${sid}`}
                                className="rounded-md border bg-white"
                              >
                                <div className="px-3 py-2 border-b flex items-center justify-between">
                                  <div className="text-xs font-semibold text-gray-700">
                                    {secText}
                                  </div>
                                  <span className="text-[10px] text-gray-500">
                                    {list.length} exam
                                    {list.length > 1 ? "s" : ""}
                                  </span>
                                </div>

                                <ul className="divide-y">
                                  {list
                                    .slice()
                                    .sort((a, b) =>
                                      String(a.name).localeCompare(
                                        String(b.name)
                                      )
                                    )
                                    .map((ex) => (
                                      <li
                                        key={ex.id}
                                        className="px-3 py-2 flex items-center justify-between"
                                      >
                                        <div className="min-w-0">
                                          <div className="truncate text-sm font-medium">
                                            {ex.name}
                                          </div>
                                          <div className="text-[11px] text-gray-500">
                                            ID: {ex.id}
                                          </div>
                                          <span
                                            className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded border ${
                                              ex.is_published
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : "bg-gray-50 text-gray-600 border-gray-200"
                                            }`}
                                          >
                                            {ex.is_published
                                              ? "Published"
                                              : "Draft"}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          <button
                                            onClick={() => openConfig(ex)}
                                            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                                            title="Configure subject marks (CQ / MCQ / Practical)"
                                          >
                                            Configure marks
                                          </button>
                                          <button
                                            onClick={() =>
                                              togglePublish(ex)
                                            }
                                            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                                          >
                                            {ex.is_published
                                              ? "Unpublish"
                                              : "Publish"}
                                          </button>
                                          <button
                                            onClick={() => openEdit(ex)}
                                            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => removeExam(ex)}
                                            className="text-xs px-2 py-1 rounded border hover:bg-rose-50 text-rose-600"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit exam name modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="bg-white rounded-2xl w-[94%] max-w-md shadow-xl border">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h3 className="text-base font-semibold">Edit Exam</h3>
              <button
                onClick={() => setEditing(null)}
                className="text-slate-500 hover:text-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="e.g., Half Yearly 2025"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditing(null)}
                  className="px-3 py-1.5 rounded border"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subject marks config modal */}
      {configExam && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl border w-[96%] max-w-4xl max-h-[90vh] flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-base font-semibold">
                  Configure subject marks
                </span>
                <span className="text-xs text-slate-500">
                  Exam: <b>{configExam.name}</b>
                </span>
              </div>
              <button
                onClick={closeConfig}
                className="px-2 py-1 text-sm border rounded hover:bg-slate-50"
              >
                ✕ Close
              </button>
            </div>

            {configLoading ? (
              <div className="p-4 text-sm">Loading subjects…</div>
            ) : configRows.length === 0 ? (
              <div className="p-4 text-sm text-slate-600">
                No subjects found for this class.
              </div>
            ) : (
              <>
                <div className="px-4 py-2 text-xs text-slate-500">
                  Tick which parts apply (CQ / MCQ / Practical) and set full
                  marks for each subject. Total will be calculated automatically.
                  Defaults are guessed from the exam name and whether the subject
                  has practical.
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border px-2 py-1 text-left">Subject</th>
                        <th className="border px-2 py-1 text-center">CQ?</th>
                        <th className="border px-2 py-1 text-center">
                          CQ Marks
                        </th>
                        <th className="border px-2 py-1 text-center">MCQ?</th>
                        <th className="border px-2 py-1 text-center">
                          MCQ Marks
                        </th>
                        <th className="border px-2 py-1 text-center">
                          Practical?
                        </th>
                        <th className="border px-2 py-1 text-center">
                          Practical Marks
                        </th>
                        <th className="border px-2 py-1 text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configRows.map((r) => (
                        <tr key={r.subjectId} className="border-t">
                          <td className="border px-2 py-1">
                            <div className="font-medium text-[11px]">
                              {r.subjectName}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {r.isPractical
                                ? "Has practical"
                                : r.isTheory
                                ? "Theory"
                                : ""}
                            </div>
                          </td>
                          <td className="border px-2 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={r.use_cq}
                              onChange={(e) =>
                                updateConfigRow(r.subjectId, {
                                  use_cq: e.target.checked,
                                })
                              }
                            />
                          </td>
                          <td className="border px-2 py-1 text-center">
                            <input
                              type="number"
                              min={0}
                              className="w-20 border rounded px-1 py-0.5 text-xs"
                              value={r.full_cq}
                              onChange={(e) =>
                                updateConfigRow(r.subjectId, {
                                  full_cq: e.target.value,
                                })
                              }
                              disabled={!r.use_cq}
                            />
                          </td>
                          <td className="border px-2 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={r.use_mcq}
                              onChange={(e) =>
                                updateConfigRow(r.subjectId, {
                                  use_mcq: e.target.checked,
                                })
                              }
                            />
                          </td>
                          <td className="border px-2 py-1 text-center">
                            <input
                              type="number"
                              min={0}
                              className="w-20 border rounded px-1 py-0.5 text-xs"
                              value={r.full_mcq}
                              onChange={(e) =>
                                updateConfigRow(r.subjectId, {
                                  full_mcq: e.target.value,
                                })
                              }
                              disabled={!r.use_mcq}
                            />
                          </td>
                          <td className="border px-2 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={r.use_practical}
                              onChange={(e) =>
                                updateConfigRow(r.subjectId, {
                                  use_practical: e.target.checked,
                                })
                              }
                            />
                          </td>
                          <td className="border px-2 py-1 text-center">
                            <input
                              type="number"
                              min={0}
                              className="w-20 border rounded px-1 py-0.5 text-xs"
                              value={r.full_practical}
                              onChange={(e) =>
                                updateConfigRow(r.subjectId, {
                                  full_practical: e.target.value,
                                })
                              }
                              disabled={!r.use_practical}
                            />
                          </td>
                          <td className="border px-2 py-1 text-center text-[11px] font-semibold">
                            {totalForRow(r)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-3 border-t flex justify-end gap-2">
                  <button
                    onClick={closeConfig}
                    className="px-3 py-1.5 rounded border text-xs"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveConfig}
                    className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
                    disabled={configSaving}
                    type="button"
                  >
                    {configSaving ? "Saving…" : "Save setup"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
