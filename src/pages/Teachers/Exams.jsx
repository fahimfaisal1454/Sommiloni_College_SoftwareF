// src/pages/teachers/EnterMarks.jsx
import { useEffect, useMemo, useState } from "react";
import AxiosInstance from "../../components/AxiosInstance";
import { toast, Toaster } from "react-hot-toast";

export default function EnterMarks() {
  // dropdown data (scoped to this teacher)
  const [classes, setClasses] = useState([]);     // [{id,name}]
  const [sections, setSections] = useState([]);   // [{id,name}]
  const [subjects, setSubjects] = useState([]);   // [{id,name}]
  const [exams, setExams] = useState([]);         // [{id,name,...}]

  // selections
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examId, setExamId] = useState("");

  // teacher timetable rows (normalized)
  const [teachRows, setTeachRows] = useState([]);

  // students
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // marks being typed: { [studentId]: { cq: "", mcq: "", practical: "" } }
  const [marks, setMarks] = useState({});

  // existing (saved) marks from server (locks row)
  // { [studentId]: { cq: number|null, mcq: number|null, practical: number|null } }
  const [existingMarks, setExistingMarks] = useState({});

  // last saved info (for small modal)
  const [lastSavedRows, setLastSavedRows] = useState([]);
  const [showSavedModal, setShowSavedModal] = useState(false);

  // re-fetch trigger for marks
  const [refreshKey, setRefreshKey] = useState(0);

  // exam+subject full-mark configuration from admin
  // { full_cq, full_mcq, full_practical, total }
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // ───────────────────────────────────────────────────────────
  // 1) Load teacher timetable (classes/sections/subjects)
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const normalize = (rows) =>
      rows
        .map((r) => {
          const classId   = r.class_name_id ?? r.class_id ?? r.class_name ?? r.class;
          const className = r.class_name_label || r.class_name || r.class_label || String(classId || "");
          const sectionId   = r.section_id ?? r.section;
          const sectionName = r.section_label || r.section || String(sectionId || "");
          const subjectId   = r.subject_id ?? r.subject;
          const subjectName = r.subject_label || r.subject || String(subjectId || "");
          if (classId == null || sectionId == null || subjectId == null) return null;
          return {
            classId: String(classId),
            className: String(className || classId),
            sectionId: String(sectionId),
            sectionName: String(sectionName || sectionId),
            subjectId: String(subjectId),
            subjectName: String(subjectName || subjectId),
          };
        })
        .filter(Boolean);

    (async () => {
      try {
        const res = await AxiosInstance.get("timetable/", { params: { user: "me" } });
        const rows = Array.isArray(res.data) ? res.data : res.data?.results || [];
        if (!cancelled) setTeachRows(normalize(rows));
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setTeachRows([]);
          toast.error("Couldn't load your teaching assignments.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ───────────────────────────────────────────────────────────
  // 2) Classes from timetable
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    const byClass = new Map();
    for (const r of teachRows) {
      if (!byClass.has(r.classId)) byClass.set(r.classId, r.className);
    }
    const list = Array.from(byClass.entries()).map(([id, name]) => ({ id, name }));
    list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    setClasses(list);

    // reset invalid selection
    if (classId && !byClass.has(String(classId))) {
      setClassId("");
      setSectionId("");
      setSubjectId("");
      setExamId("");
      setStudents([]);
      setMarks({});
      setExistingMarks({});
      setConfig(null);
    }
  }, [teachRows]); // eslint-disable-line react-hooks/exhaustive-deps

  // ───────────────────────────────────────────────────────────
  // 3) Sections when class changes
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    const bySec = new Map();
    for (const r of teachRows) {
      if (String(r.classId) !== String(classId)) continue;
      if (!bySec.has(r.sectionId)) bySec.set(r.sectionId, r.sectionName);
    }
    const list = Array.from(bySec.entries()).map(([id, name]) => ({ id, name }));
    list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    setSections(list);

    setSectionId("");
    setSubjectId("");
    setExamId("");
    setStudents([]);
    setMarks({});
    setExistingMarks({});
    setConfig(null);
  }, [classId, teachRows]);

  // ───────────────────────────────────────────────────────────
  // 4) Subjects when section changes
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    const bySub = new Map();
    for (const r of teachRows) {
      if (String(r.classId) !== String(classId)) continue;
      if (String(r.sectionId) !== String(sectionId)) continue;
      if (!bySub.has(r.subjectId)) bySub.set(r.subjectId, r.subjectName);
    }
    const list = Array.from(bySub.entries()).map(([id, name]) => ({ id, name }));
    list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    setSubjects(list);

    setSubjectId("");
    setExamId("");
    setMarks({});
    setExistingMarks({});
    setConfig(null);
  }, [classId, sectionId, teachRows]);

  // ───────────────────────────────────────────────────────────
  // 5) Exams for selected class+section
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!classId || !sectionId) {
        setExams([]);
        return;
      }
      try {
        const { data } = await AxiosInstance.get("exams/", {
          params: { class_name: classId, section: sectionId },
        });
        const list = Array.isArray(data) ? data : data?.results || [];
        if (!cancelled) setExams(list);
      } catch (err) {
        console.error(err);
        if (!cancelled) setExams([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, sectionId]);

  // ───────────────────────────────────────────────────────────
  // 6) Load students in this class+section
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!classId || !sectionId) {
        setStudents([]);
        setMarks({});
        setExistingMarks({});
        return;
      }
      setLoadingStudents(true);
      try {
        const { data } = await AxiosInstance.get("students/", {
          params: { class_id: classId, section_id: sectionId },
        });
        const rows = Array.isArray(data) ? data : data?.results || [];
        if (!cancelled) {
          setStudents(rows);
          setMarks((prev) => {
            const next = {};
            for (const s of rows) {
              if (prev[s.id]) next[s.id] = prev[s.id];
            }
            return next;
          });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setStudents([]);
          setMarks({});
          setExistingMarks({});
          toast.error("Failed to load students.");
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, sectionId]);

  // ───────────────────────────────────────────────────────────
  // 7) Existing marks (lock rows) for selected exam+subject
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!examId || !subjectId) {
        setExistingMarks({});
        return;
      }
      try {
        const res = await AxiosInstance.get("exam-marks/", {
          params: { exam: examId, subject: subjectId },
        });
        const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
        const map = {};
        for (const m of arr) {
          const sid = m.student;
          map[sid] = {
            cq: m.score_cq ?? null,
            mcq: m.score_mcq ?? null,
            practical: m.score_practical ?? null,
          };
        }
        if (!cancelled) setExistingMarks(map);
      } catch (err) {
        console.warn("Failed to load existing marks", err);
        if (!cancelled) setExistingMarks({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId, subjectId, refreshKey]);

  // ───────────────────────────────────────────────────────────
  // 8) Load full-marks config for exam+subject from admin
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!examId || !subjectId) {
        setConfig(null);
        return;
      }
      setLoadingConfig(true);
      try {
        const res = await AxiosInstance.get("exam-subject-configs/", {
          params: { exam: examId, subject: subjectId },
        });
        const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
        const cfg = arr[0];
        if (!cfg) {
          if (!cancelled) setConfig(null);
          return;
        }
        const full_cq = Number(cfg.full_cq || 0);
        const full_mcq = Number(cfg.full_mcq || 0);
        const full_practical = Number(cfg.full_practical || 0);
        const total = full_cq + full_mcq + full_practical;
        if (!cancelled) setConfig({ full_cq, full_mcq, full_practical, total });
      } catch (err) {
        console.warn("Failed to load exam-subject config", err);
        if (!cancelled) setConfig(null);
      } finally {
        if (!cancelled) setLoadingConfig(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId, subjectId]);

  // ───────────────────────────────────────────────────────────
  // Helpers / derived data
  // ───────────────────────────────────────────────────────────
  const currentClassName = useMemo(
    () => classes.find((c) => String(c.id) === String(classId))?.name || "",
    [classes, classId]
  );
  const currentSectionName = useMemo(
    () => sections.find((s) => String(s.id) === String(sectionId))?.name || "",
    [sections, sectionId]
  );
  const currentSubjectName = useMemo(
    () => subjects.find((s) => String(s.id) === String(subjectId))?.name || "",
    [subjects, subjectId]
  );
  const currentExamName = useMemo(
    () => exams.find((e) => String(e.id) === String(examId))?.name || "",
    [exams, examId]
  );

  const hasCQ = !!(config && config.full_cq > 0);
  const hasMCQ = !!(config && config.full_mcq > 0);
  const hasPractical = !!(config && config.full_practical > 0);

  const fullMarksText = useMemo(() => {
    if (!config) return "Full marks not configured for this exam & subject.";
    const parts = [];
    if (hasCQ) parts.push(`CQ ${config.full_cq}`);
    if (hasMCQ) parts.push(`MCQ ${config.full_mcq}`);
    if (hasPractical) parts.push(`Practical ${config.full_practical}`);
    if (!parts.length) return "Full marks not configured for this exam & subject.";
    return `Full marks: ${config.total} (${parts.join(" + ")})`;
  }, [config, hasCQ, hasMCQ, hasPractical]);

  const clamp = (value, max) => {
    let n = Number(value);
    if (Number.isNaN(n)) return "";
    if (n < 0) n = 0;
    if (max != null && max > 0 && n > max) n = max;
    return String(n);
  };

  const setPartMark = (studentId, part, value) => {
    const raw = (value ?? "").toString().trim();
    if (raw === "") {
      setMarks((prev) => ({
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), [part]: "" },
      }));
      return;
    }
    let max = null;
    if (part === "cq" && hasCQ) max = config.full_cq;
    if (part === "mcq" && hasMCQ) max = config.full_mcq;
    if (part === "practical" && hasPractical) max = config.full_practical;

    const val = clamp(raw, max);
    if (val === "") return;

    setMarks((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [part]: val },
    }));
  };

  const isRowLocked = (sid) => existingMarks[sid] != null;

  const doRefreshMarks = () => setRefreshKey((k) => k + 1);

  // ───────────────────────────────────────────────────────────
  // Save marks (CQ / MCQ / Practical)
  // ───────────────────────────────────────────────────────────
  const saveAll = async () => {
    if (!classId || !sectionId || !subjectId) {
      toast.error("Pick class, section and subject.");
      return;
    }
    if (!examId) {
      toast.error("Pick an exam.");
      return;
    }
    if (!config) {
      toast.error("Admin has not configured full marks for this exam & subject.");
      return;
    }

    // Prepare payloads only for rows that are not locked and have some mark
    const toSave = students
      .filter((s) => !isRowLocked(s.id))
      .map((s) => {
        const row = marks[s.id] || {};
        const cq = hasCQ && row.cq !== "" ? Number(row.cq) : null;
        const mcq = hasMCQ && row.mcq !== "" ? Number(row.mcq) : null;
        const practical = hasPractical && row.practical !== "" ? Number(row.practical) : null;
        if (cq == null && mcq == null && practical == null) return null;
        const total =
          (cq || 0) +
          (mcq || 0) +
          (practical || 0);
        return {
          studentId: s.id,
          cq,
          mcq,
          practical,
          total,
        };
      })
      .filter(Boolean);

    if (!toSave.length) {
      toast("Nothing to save (either all empty or already saved).");
      return;
    }

    const toastId = toast.loading("Saving marks…");
    let ok = 0;
    let fail = 0;

    for (const row of toSave) {
      const base = {
        exam: Number(examId),
        student: Number(row.studentId),
        subject: Number(subjectId),
      };
      const payload = {
        ...base,
        score_cq: row.cq,
        score_mcq: row.mcq,
        score_practical: row.practical,
        score: row.total,
      };

      try {
        await AxiosInstance.post("exam-marks/", payload);
        ok++;
      } catch (err) {
        // if already exists, PATCH
        try {
          const res = await AxiosInstance.get("exam-marks/", { params: base });
          const id =
            (Array.isArray(res.data) ? res.data[0]?.id : res.data?.results?.[0]?.id) || null;
          if (id) {
            await AxiosInstance.patch(`exam-marks/${id}/`, payload);
            ok++;
          } else {
            fail++;
          }
        } catch (e2) {
          console.error(e2);
          fail++;
        }
      }
    }

    toast.dismiss(toastId);

    // track last saved rows
    const savedRows = toSave.map((row) => {
      const stu = students.find((s) => s.id === row.studentId);
      return {
        sid: row.studentId,
        name: stu?.full_name || `Student ${row.studentId}`,
        roll: stu?.roll_number ?? "—",
        score: row.total,
        cq: row.cq,
        mcq: row.mcq,
        practical: row.practical,
        subjectName: currentSubjectName || "—",
        examName: currentExamName || "—",
      };
    });
    setLastSavedRows(savedRows);
    setMarks({});

    if (fail) {
      toast(`Saved ${ok}, failed ${fail}.`, { duration: 5000 });
    } else {
      toast.success(`Saved ${ok} marks.`, { duration: 4000 });
    }

    // refresh existing marks so rows become locked
    doRefreshMarks();
  };

  // ───────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <h1 className="text-xl font-bold">Enter Marks</h1>

      {/* Filters */}
      <div className="bg-white border rounded-md p-4 space-y-3">
        <div className="grid md:grid-cols-4 gap-3">
          {/* Class */}
          <div>
            <label className="text-sm font-semibold">Class</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full border rounded px-2 py-1 bg-white"
            >
              <option value="">Select class…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="text-sm font-semibold">Section</label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={!classId}
              className="w-full border rounded px-2 py-1 bg-white disabled:bg-slate-100"
            >
              <option value="">Select section…</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="text-sm font-semibold">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={!classId || !sectionId}
              className="w-full border rounded px-2 py-1 bg-white disabled:bg-slate-100"
            >
              <option value="">Select subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Exam */}
          <div>
            <label className="text-sm font-semibold">Exam</label>
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              disabled={!classId || !sectionId}
              className="w-full border rounded px-2 py-1 bg-white disabled:bg-slate-100"
            >
              <option value="">Select exam…</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-600">
          <div className="space-y-0.5">
            {currentClassName && currentSectionName && (
              <div>
                Selected: <b>{currentClassName}</b> / <b>{currentSectionName}</b>
                {currentSubjectName ? (
                  <>
                    {" "}
                    / <b>{currentSubjectName}</b>
                  </>
                ) : null}
                {currentExamName ? (
                  <>
                    {" "}
                    / <b>{currentExamName}</b>
                  </>
                ) : null}
              </div>
            )}
            {examId && subjectId && (
              <div className="text-[11px] text-slate-500">
                {loadingConfig
                  ? "Loading full marks configuration…"
                  : fullMarksText}
              </div>
            )}
          </div>

          <button
            onClick={doRefreshMarks}
            className="px-3 py-1.5 text-xs rounded border bg-white hover:bg-slate-50"
            disabled={!examId || !subjectId}
          >
            Refresh marks
          </button>
        </div>
      </div>

      {/* Students + entry */}
      <div className="bg-white border rounded-md overflow-hidden">
        <div className="px-4 py-2 text-sm font-semibold bg-slate-50 border-b flex items-center justify-between">
          <div>
            Students {loadingStudents ? "(loading…)" : `(${students.length})`}
          </div>
          <button
            onClick={() => setShowSavedModal(true)}
            disabled={!lastSavedRows.length}
            className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-slate-50 disabled:opacity-60"
          >
            View saved marks{lastSavedRows.length ? ` (${lastSavedRows.length})` : ""}
          </button>
        </div>

        {(!classId || !sectionId) && (
          <div className="p-4 text-sm text-slate-500">
            Pick class and section to load students.
          </div>
        )}

        {classId && sectionId && !loadingStudents && students.length === 0 && (
          <div className="p-4 text-sm text-slate-500">No students found.</div>
        )}

        {classId &&
          sectionId &&
          !loadingStudents &&
          students.length > 0 && (
            <>
              {/* Header row */}
              <div className="grid grid-cols-7 gap-3 px-4 py-2 text-xs font-medium text-slate-600 border-b bg-slate-50">
                <div>#</div>
                <div>Name</div>
                <div>Roll</div>
                <div>Subject</div>
                <div>Exam</div>
                <div className="flex flex-wrap gap-2">
                  {hasCQ && <span>CQ</span>}
                  {hasMCQ && <span>MCQ</span>}
                  {hasPractical && <span>Practical</span>}
                  {!config && <span>Marks</span>}
                </div>
                <div className="text-center">Status</div>
              </div>

              {/* Student rows */}
              {students.map((s, index) => {
                const locked = isRowLocked(s.id);
                const typed = marks[s.id] || {};
                const saved = existingMarks[s.id] || {};

                const cqVal = locked
                  ? saved.cq ?? ""
                  : typed.cq ?? "";
                const mcqVal = locked
                  ? saved.mcq ?? ""
                  : typed.mcq ?? "";
                const pracVal = locked
                  ? saved.practical ?? ""
                  : typed.practical ?? "";

                const maxCq = hasCQ ? config.full_cq : undefined;
                const maxMcq = hasMCQ ? config.full_mcq : undefined;
                const maxPrac = hasPractical ? config.full_practical : undefined;

                return (
                  <div
                    key={s.id}
                    className="grid grid-cols-7 gap-3 px-4 py-2 text-sm border-b last:border-b-0"
                  >
                    <div>{index + 1}</div>
                    <div>{s.full_name}</div>
                    <div>{s.roll_number ?? "—"}</div>
                    <div>{currentSubjectName || "—"}</div>
                    <div>{currentExamName || "—"}</div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {hasCQ && (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-500">
                            CQ
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={maxCq}
                            value={cqVal}
                            onChange={(e) =>
                              setPartMark(s.id, "cq", e.target.value)
                            }
                            disabled={!subjectId || !examId || locked}
                            className={`w-16 border rounded px-1 py-0.5 text-xs ${
                              locked
                                ? "bg-slate-100 text-slate-600 cursor-not-allowed"
                                : ""
                            }`}
                            placeholder={maxCq ? `0–${maxCq}` : "CQ"}
                          />
                        </div>
                      )}
                      {hasMCQ && (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-500">
                            MCQ
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={maxMcq}
                            value={mcqVal}
                            onChange={(e) =>
                              setPartMark(s.id, "mcq", e.target.value)
                            }
                            disabled={!subjectId || !examId || locked}
                            className={`w-16 border rounded px-1 py-0.5 text-xs ${
                              locked
                                ? "bg-slate-100 text-slate-600 cursor-not-allowed"
                                : ""
                            }`}
                            placeholder={maxMcq ? `0–${maxMcq}` : "MCQ"}
                          />
                        </div>
                      )}
                      {hasPractical && (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-500">
                            Prac
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={maxPrac}
                            value={pracVal}
                            onChange={(e) =>
                              setPartMark(s.id, "practical", e.target.value)
                            }
                            disabled={!subjectId || !examId || locked}
                            className={`w-16 border rounded px-1 py-0.5 text-xs ${
                              locked
                                ? "bg-slate-100 text-slate-600 cursor-not-allowed"
                                : ""
                            }`}
                            placeholder={maxPrac ? `0–${maxPrac}` : "Prac"}
                          />
                        </div>
                      )}
                      {!config && (
                        <span className="text-[11px] text-rose-500">
                          No config
                        </span>
                      )}
                      {locked && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 border border-slate-300">
                          🔒
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      {locked ? (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                          Saved
                        </span>
                      ) : (
                        <span className="text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-xs">
                          Editable
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="p-3 flex justify-end">
                <button
                  onClick={saveAll}
                  className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                  disabled={
                    !subjectId ||
                    !examId ||
                    students.length === 0 ||
                    !config
                  }
                >
                  Save all
                </button>
              </div>
            </>
          )}
      </div>

      {/* Recently saved marks modal */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowSavedModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold">
                Recently saved marks
                {currentExamName ? ` — ${currentExamName}` : ""}
                {currentSubjectName ? ` (${currentSubjectName})` : ""}
              </div>
              <button
                onClick={() => setShowSavedModal(false)}
                className="px-2 py-1 text-sm border rounded hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {!lastSavedRows.length ? (
              <div className="p-4 text-sm text-slate-600">
                Nothing saved yet in this session.
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <div className="grid grid-cols-6 gap-3 px-4 py-2 text-xs font-medium text-slate-600 border-b bg-slate-50">
                  <div>#</div>
                  <div>Name</div>
                  <div>Roll</div>
                  <div>CQ</div>
                  <div>MCQ / Practical</div>
                  <div>Total</div>
                </div>
                {lastSavedRows.map((r, i) => (
                  <div
                    key={`${r.sid}-${i}`}
                    className="grid grid-cols-6 gap-3 px-4 py-2 text-sm border-b last:border-b-0"
                  >
                    <div>{i + 1}</div>
                    <div>{r.name}</div>
                    <div>{r.roll}</div>
                    <div>{r.cq ?? "—"}</div>
                    <div>
                      {r.mcq != null ? `MCQ ${r.mcq}` : ""}
                      {r.practical != null
                        ? `${r.mcq != null ? " | " : ""}Prac ${r.practical}`
                        : r.mcq == null
                        ? "—"
                        : ""}
                    </div>
                    <div>{r.score}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 flex justify-end gap-2">
              <button
                onClick={() => setLastSavedRows([])}
                className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-slate-50"
              >
                Clear list
              </button>
              <button
                onClick={() => setShowSavedModal(false)}
                className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
