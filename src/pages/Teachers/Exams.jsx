// src/pages/teachers/EnterMarks.jsx
import { useEffect, useMemo, useState } from "react";
import AxiosInstance from "../../components/AxiosInstance";
import { toast, Toaster } from "react-hot-toast";

export default function EnterMarks() {
  // timetable-derived options
  const [teachRows, setTeachRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);

  // selections
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examId, setExamId] = useState("");

  // students
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // exam+subject full marks config
  // { full_cq, full_mcq, full_practical, total }
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // active grade scale (percentage based)
  const [gradeScale, setGradeScale] = useState(null); // { id, name, bands: [{min_score,max_score,letter,gpa}] }
  const [loadingScale, setLoadingScale] = useState(false);

  // UI marks: { [studentId]: { cq:"", mcq:"", practical:"" } }
  const [marks, setMarks] = useState({});

  // saved marks: { [studentId]: { id, cq, mcq, practical, total } }
  const [existingMarks, setExistingMarks] = useState({});

  // ───────────────────────────────────────────────────────────
  // helpers / derived
  // ───────────────────────────────────────────────────────────
  const currentClass = useMemo(
    () => classes.find((c) => String(c.id) === String(classId)),
    [classes, classId]
  );
  const currentSection = useMemo(
    () => sections.find((s) => String(s.id) === String(sectionId)),
    [sections, sectionId]
  );
  const currentSubject = useMemo(
    () => subjects.find((s) => String(s.id) === String(subjectId)),
    [subjects, subjectId]
  );
  const currentExam = useMemo(
    () => exams.find((e) => String(e.id) === String(examId)),
    [exams, examId]
  );

  const hasCQ = !!(config && config.full_cq > 0);
  const hasMCQ = !!(config && config.full_mcq > 0);
  const hasPractical = !!(config && config.full_practical > 0);

  const componentCount =
    (hasCQ ? 1 : 0) + (hasMCQ ? 1 : 0) + (hasPractical ? 1 : 0);
  // Fixed columns: No, Name, Roll, Sub, Total, Obtain, Letter, GPA = 8
  const tableColSpan = 8 + componentCount;

  const fullMarksText = useMemo(() => {
    if (!config) return "Full marks not configured for this exam & subject.";
    const parts = [];
    if (hasCQ) parts.push(`CQ ${config.full_cq}`);
    if (hasMCQ) parts.push(`MCQ ${config.full_mcq}`);
    if (hasPractical) parts.push(`Prac ${config.full_practical}`);
    return `Total ${config.total} (${parts.join(" + ")})`;
  }, [config, hasCQ, hasMCQ, hasPractical]);

  const computeRowTotal = (m) => {
    if (!m) return 0;
    const cq = hasCQ ? Number(m.cq || 0) : 0;
    const mcq = hasMCQ ? Number(m.mcq || 0) : 0;
    const prac = hasPractical ? Number(m.practical || 0) : 0;
    const total = cq + mcq + prac;
    return Number.isNaN(total) ? 0 : total;
  };

  const handlePartChange = (studentId, part, value) => {
    const rawStr = value ?? "";
    if (rawStr === "") {
      setMarks((prev) => ({
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), [part]: "" },
      }));
      return;
    }
    const raw = Number(rawStr);
    if (Number.isNaN(raw)) return;

    let max = null;
    if (part === "cq" && hasCQ) max = config.full_cq;
    if (part === "mcq" && hasMCQ) max = config.full_mcq;
    if (part === "practical" && hasPractical) max = config.full_practical;

    let val = raw;
    if (val < 0) val = 0;
    if (max != null && val > max) val = max;

    setMarks((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [part]: String(val) },
    }));
  };

  const hardResetMarks = () => {
    setMarks({});
    setExistingMarks({});
    setConfig(null);
  };

  // convert obtain & total to letter/gpa using percentage bands
  const gradeFor = (obtain) => {
    if (!gradeScale || !Array.isArray(gradeScale.bands) || !config || !config.total)
      return { letter: "", gpa: "" };

    const total = config.total;
    if (!total || obtain == null) return { letter: "", gpa: "" };

    const perc = (Number(obtain) / Number(total)) * 100;
    if (Number.isNaN(perc)) return { letter: "", gpa: "" };

    const band = gradeScale.bands.find(
      (b) =>
        perc >= Number(b.min_score ?? 0) &&
        perc <= Number(b.max_score ?? 100)
    );
    if (!band) return { letter: "", gpa: "" };
    return { letter: band.letter ?? "", gpa: band.gpa ?? "" };
  };

  // ───────────────────────────────────────────────────────────
  // 1) load timetable
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await AxiosInstance.get("timetable/", {
          params: { user: "me" },
        });
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];

        const normalized = data
          .map((r) => {
            const clsId = r.class_name_id ?? r.class_name ?? r.class_id;
            const clsName =
              r.class_name_label || r.class_name || r.class_label || String(clsId || "");
            const secId = r.section_id ?? r.section;
            const secName = r.section_label || r.section || String(secId || "");
            const subId = r.subject_id ?? r.subject;
            const subName = r.subject_label || r.subject || String(subId || "");
            if (!clsId || !secId || !subId) return null;
            return {
              classId: String(clsId),
              className: String(clsName),
              sectionId: String(secId),
              sectionName: String(secName),
              subjectId: String(subId),
              subjectName: String(subName),
            };
          })
          .filter(Boolean);

        setTeachRows(normalized);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load your timetable.");
      }
    })();
  }, []);

  // 2) classes from timetable
  useEffect(() => {
    const byClass = new Map();
    for (const r of teachRows) {
      if (!byClass.has(r.classId)) byClass.set(r.classId, r.className);
    }
    const cls = Array.from(byClass.entries()).map(([id, name]) => ({ id, name }));
    cls.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    setClasses(cls);
  }, [teachRows]);

  // 3) sections on class change
  useEffect(() => {
    const bySec = new Map();
    for (const r of teachRows) {
      if (String(r.classId) !== String(classId)) continue;
      if (!bySec.has(r.sectionId)) bySec.set(r.sectionId, r.sectionName);
    }
    const secs = Array.from(bySec.entries()).map(([id, name]) => ({ id, name }));
    secs.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    setSections(secs);

    setSectionId("");
    setSubjectId("");
    setExamId("");
    setStudents([]);
    hardResetMarks();
  }, [classId, teachRows]);

  // 4) subjects on section change
  useEffect(() => {
    const bySub = new Map();
    for (const r of teachRows) {
      if (String(r.classId) !== String(classId)) continue;
      if (String(r.sectionId) !== String(sectionId)) continue;
      if (!bySub.has(r.subjectId)) bySub.set(r.subjectId, r.subjectName);
    }
    const subs = Array.from(bySub.entries()).map(([id, name]) => ({ id, name }));
    subs.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    setSubjects(subs);

    setSubjectId("");
    setExamId("");
    hardResetMarks();
  }, [classId, sectionId, teachRows]);

  // 5) exams for class+section
  useEffect(() => {
    (async () => {
      if (!classId || !sectionId) {
        setExams([]);
        return;
      }
      try {
        const res = await AxiosInstance.get("exams/", {
          params: { class_name: classId, section: sectionId },
        });
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setExams(list);
      } catch (err) {
        console.error(err);
        setExams([]);
      }
    })();
  }, [classId, sectionId]);

  // 6) students for class+section
  useEffect(() => {
    (async () => {
      if (!classId || !sectionId) {
        setStudents([]);
        hardResetMarks();
        return;
      }
      setLoadingStudents(true);
      try {
        const res = await AxiosInstance.get("students/", {
          params: { class_id: classId, section_id: sectionId },
        });
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setStudents(list);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load students.");
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, [classId, sectionId]);

  // 7) active grade scale (percentage)
  useEffect(() => {
    (async () => {
      setLoadingScale(true);
      try {
        const res = await AxiosInstance.get("grade-scales/", {
          params: { is_active: true },
        });
        const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
        const scale = arr[0] || null;
        setGradeScale(scale);
      } catch (err) {
        console.error(err);
        setGradeScale(null);
      } finally {
        setLoadingScale(false);
      }
    })();
  }, []);

  // 8) full marks config for exam+subject
  useEffect(() => {
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
          setConfig(null);
        } else {
          const full_cq = Number(cfg.full_cq || 0);
          const full_mcq = Number(cfg.full_mcq || 0);
          const full_practical = Number(cfg.full_practical || 0);
          setConfig({
            full_cq,
            full_mcq,
            full_practical,
            total: full_cq + full_mcq + full_practical,
          });
        }
      } catch (err) {
        console.error(err);
        setConfig(null);
      } finally {
        setLoadingConfig(false);
      }
    })();
  }, [examId, subjectId]);

  // 9) existing marks for exam+subject
  useEffect(() => {
    (async () => {
      if (!examId || !subjectId) {
        setExistingMarks({});
        setMarks({});
        return;
      }
      try {
        const res = await AxiosInstance.get("exam-marks/", {
          params: { exam: examId, subject: subjectId },
        });
        const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
        const map = {};
        const initial = {};
        arr.forEach((m) => {
          const sid = m.student;
          map[sid] = {
            id: m.id,
            cq: m.score_cq,
            mcq: m.score_mcq,
            practical: m.score_practical,
            total: m.score,
          };
          initial[sid] = {
            cq: m.score_cq != null ? String(m.score_cq) : "",
            mcq: m.score_mcq != null ? String(m.score_mcq) : "",
            practical: m.score_practical != null ? String(m.score_practical) : "",
          };
        });
        setExistingMarks(map);
        setMarks(initial); // overwrite with existing for clean refresh
      } catch (err) {
        console.error(err);
        setExistingMarks({});
      }
    })();
  }, [examId, subjectId]);

  // when subject/exam changed by user, immediately clear marks so UI refreshes
  const onSubjectChange = (val) => {
    setSubjectId(val);
    setExamId("");
    hardResetMarks();
  };

  const onExamChange = (val) => {
    setExamId(val);
    hardResetMarks();
  };

  // ───────────────────────────────────────────────────────────
  // save
  // ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!classId || !sectionId || !subjectId || !examId) {
      toast.error("Please select class, section, subject and exam.");
      return;
    }
    if (!config) {
      toast.error("Admin has not configured full marks for this exam & subject.");
      return;
    }

    const payloads = students
      .map((stu) => {
        const m = marks[stu.id] || {};
        const cq = hasCQ && m.cq !== "" ? Number(m.cq) : null;
        const mcq = hasMCQ && m.mcq !== "" ? Number(m.mcq) : null;
        const prac = hasPractical && m.practical !== "" ? Number(m.practical) : null;
        if (cq === null && mcq === null && prac === null) return null;

        const clamp = (val, max) => {
          if (val == null || Number.isNaN(val)) return null;
          if (val < 0) return 0;
          if (max != null && val > max) return max;
          return val;
        };

        return {
          studentId: stu.id,
          body: {
            exam: Number(examId),
            student: Number(stu.id),
            subject: Number(subjectId),
            score_cq: clamp(cq, config.full_cq),
            score_mcq: clamp(mcq, config.full_mcq),
            score_practical: clamp(prac, config.full_practical),
          },
        };
      })
      .filter(Boolean);

    if (!payloads.length) {
      toast("Nothing to save.");
      return;
    }

    const toastId = toast.loading("Saving marks…");
    let ok = 0;
    let fail = 0;

    for (const item of payloads) {
      const existing = existingMarks[item.studentId];
      try {
        if (existing?.id) {
          await AxiosInstance.patch(`exam-marks/${existing.id}/`, item.body);
        } else {
          await AxiosInstance.post("exam-marks/", item.body);
        }
        ok++;
      } catch (err) {
        console.error(err);
        fail++;
      }
    }

    toast.dismiss(toastId);
    if (fail) {
      toast(`Saved ${ok}, failed ${fail}.`, { duration: 5000 });
    } else {
      toast.success(`Saved ${ok} marks.`, { duration: 4000 });
    }

    // reload marks to sync totals
    try {
      const res = await AxiosInstance.get("exam-marks/", {
        params: { exam: examId, subject: subjectId },
      });
      const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
      const map = {};
      arr.forEach((m) => {
        const sid = m.student;
        map[sid] = {
          id: m.id,
          cq: m.score_cq,
          mcq: m.score_mcq,
          practical: m.score_practical,
          total: m.score,
        };
      });
      setExistingMarks(map);
    } catch (err) {
      console.error(err);
    }
  };

  // ───────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <h1 className="text-xl font-bold">Enter Exam Marks</h1>

      {/* filters */}
      <div className="bg-white border rounded-md p-4 space-y-3">
        <div className="grid md:grid-cols-4 gap-3">
          {/* class */}
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

          {/* section */}
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

          {/* subject */}
          <div>
            <label className="text-sm font-semibold">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => onSubjectChange(e.target.value)}
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

          {/* exam */}
          <div>
            <label className="text-sm font-semibold">Exam</label>
            <select
              value={examId}
              onChange={(e) => onExamChange(e.target.value)}
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

        <div className="text-xs text-slate-600 mt-1 space-y-0.5">
          <div>
            {currentClass && currentSection && (
              <>
                Class <b>{currentClass.name}</b>, Section{" "}
                <b>{currentSection.name}</b>
              </>
            )}
            {currentSubject && (
              <>
                {" "}
                | Subject: <b>{currentSubject.name}</b>
              </>
            )}
            {currentExam && (
              <>
                {" "}
                | Exam: <b>{currentExam.name}</b>
              </>
            )}
          </div>
          {examId && subjectId && (
            <div className="text-[11px] text-slate-500">
              {loadingConfig ? "Loading full marks…" : fullMarksText}
              {loadingScale && " • Loading grade scale…"}
            </div>
          )}
        </div>
      </div>

      {/* marks table */}
      <div className="bg-white border rounded-md p-4 overflow-x-auto">
        {(!classId || !sectionId || !subjectId || !examId) && (
          <div className="text-sm text-slate-500">
            Select class, section, subject and exam to enter marks.
          </div>
        )}

        {classId &&
          sectionId &&
          subjectId &&
          examId &&
          !loadingStudents &&
          students.length === 0 && (
            <div className="text-sm text-slate-500">No students found.</div>
          )}

        {classId &&
          sectionId &&
          subjectId &&
          examId &&
          students.length > 0 && (
            <>
              <table className="w-full border border-black text-xs">
                <thead>
                  {/* title row */}
                  <tr>
                    <th
                      colSpan={tableColSpan}
                      className="border border-black text-center py-2 text-sm font-semibold"
                    >
                      {currentExam?.name || "Exam"}
                    </th>
                  </tr>

                  {/* header row */}
                  <tr className="bg-gray-50">
                    <th className="border border-black px-2 py-1">No</th>
                    <th className="border border-black px-2 py-1">Name</th>
                    <th className="border border-black px-2 py-1">Roll</th>
                    <th className="border border-black px-2 py-1">Sub</th>
                    {hasCQ && (
                      <th className="border border-black px-2 py-1">CQ</th>
                    )}
                    {hasMCQ && (
                      <th className="border border-black px-2 py-1">MCQ</th>
                    )}
                    {hasPractical && (
                      <th className="border border-black px-2 py-1">Prac</th>
                    )}
                    <th className="border border-black px-2 py-1">
                      Total mark
                    </th>
                    <th className="border border-black px-2 py-1">
                      Obtain mark
                    </th>
                    <th className="border border-black px-2 py-1">Letter</th>
                    <th className="border border-black px-2 py-1">GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((stu, index) => {
                    const rowMarks = marks[stu.id] || {};
                    const existing = existingMarks[stu.id];

                    const obtain =
                      existing?.total != null
                        ? Number(existing.total)
                        : computeRowTotal(rowMarks);

                    const { letter, gpa } =
                      obtain > 0 ? gradeFor(obtain) : { letter: "", gpa: "" };

                    return (
                      <tr key={stu.id}>
                        <td className="border border-black px-2 py-1 text-center">
                          {index + 1}
                        </td>
                        <td className="border border-black px-2 py-1">
                          {stu.full_name ||
                            [stu.first_name, stu.last_name]
                              .filter(Boolean)
                              .join(" ")}
                        </td>
                        <td className="border border-black px-2 py-1 text-center">
                          {stu.roll_number ?? ""}
                        </td>
                        <td className="border border-black px-2 py-1 text-center">
                          {currentSubject?.name || ""}
                        </td>

                        {hasCQ && (
                          <td className="border border-black px-2 py-1 text-center">
                            <input
                              type="number"
                              min={0}
                              max={config?.full_cq ?? undefined}
                              value={rowMarks.cq ?? ""}
                              onChange={(e) =>
                                handlePartChange(stu.id, "cq", e.target.value)
                              }
                              className="w-16 border px-1 py-0.5 text-xs bg-blue-50"
                            />
                          </td>
                        )}

                        {hasMCQ && (
                          <td className="border border-black px-2 py-1 text-center">
                            <input
                              type="number"
                              min={0}
                              max={config?.full_mcq ?? undefined}
                              value={rowMarks.mcq ?? ""}
                              onChange={(e) =>
                                handlePartChange(stu.id, "mcq", e.target.value)
                              }
                              className="w-16 border px-1 py-0.5 text-xs bg-blue-50"
                            />
                          </td>
                        )}

                        {hasPractical && (
                          <td className="border border-black px-2 py-1 text-center">
                            <input
                              type="number"
                              min={0}
                              max={config?.full_practical ?? undefined}
                              value={rowMarks.practical ?? ""}
                              onChange={(e) =>
                                handlePartChange(
                                  stu.id,
                                  "practical",
                                  e.target.value
                                )
                              }
                              className="w-16 border px-1 py-0.5 text-xs bg-blue-50"
                            />
                          </td>
                        )}

                        {/* full total */}
                        <td className="border border-black px-2 py-1 text-center">
                          {config?.total ?? ""}
                        </td>

                        {/* obtain mark */}
                        <td className="border border-black px-2 py-1 text-center">
                          {obtain ? obtain.toFixed(2).replace(/\.00$/, "") : ""}
                        </td>

                        {/* letter (computed from percentage) */}
                        <td className="border border-black px-2 py-1 text-center">
                          {letter}
                        </td>

                        {/* GPA (computed from percentage) */}
                        <td className="border border-black px-2 py-1 text-center">
                          {gpa !== "" ? Number(gpa).toFixed(2) : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={!config}
                  className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Save marks
                </button>
              </div>
            </>
          )}
      </div>
    </div>
  );
}
