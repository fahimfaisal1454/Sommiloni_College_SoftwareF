import { useEffect, useMemo, useState } from "react";
import AxiosInstance from "../../../components/AxiosInstance";
import AttendanceSheet from "../../Teachers/AttendanceSheet";

export default function StudentAttendance() {
  // ---------- helpers ----------
  const normalizeArray = (maybeArray) =>
    Array.isArray(maybeArray) ? maybeArray : maybeArray?.results || [];

  const uniqueById = (arr = []) => {
    const seen = new Map();
    for (const item of arr) {
      if (!seen.has(item.id)) seen.set(item.id, item);
    }
    return Array.from(seen.values());
  };

  // ---------- state ----------
const [years, setYears] = useState([]);    // [2026, 2025, ...]
  const [classes, setClasses] = useState([]); // ONLY classes for selected year
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);

const [selectedYear, setSelectedYear] = useState(""); 
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  // labels
  const selectedClass = useMemo(
    () => classes.find((c) => String(c.id) === String(selectedClassId)),
    [classes, selectedClassId]
  );
  const selectedSection = useMemo(
    () => sections.find((s) => String(s.id) === String(selectedSectionId)),
    [sections, selectedSectionId]
  );
  const selectedSubject = useMemo(
    () => subjects.find((s) => String(s.id) === String(selectedSubjectId)),
    [subjects, selectedSubjectId]
  );

  // ---------- effects ----------
  // Load all years once (derived from /classes/)
  // ✅ Load academic years (CORRECT SOURCE)
useEffect(() => {
  (async () => {
    try {
      const res = await AxiosInstance.get("academic-years/");
      const list = Array.isArray(res.data) ? res.data : [];

      // sort latest year first
      list.sort((a, b) => b.year - a.year);

      setYears(list);
    } catch (e) {
      console.error("Failed to load academic years", e);
      setYears([]);
    }
  })();
}, []);

  // When year changes, fetch classes ONLY for that year (with extra client filter)
useEffect(() => {
  (async () => {
    setSelectedClassId("");
    setSections([]);
    setSelectedSectionId("");
    setSubjects([]);
    setSelectedSubjectId("");

    if (!selectedYear) {
      setClasses([]);
      return;
    }

    try {
      const res = await AxiosInstance.get("classes/", {
        params: { academic_year: selectedYear },
      });

      setClasses(normalizeArray(res.data));
    } catch (e) {
      console.error("Failed to load classes", e);
      setClasses([]);
    }
  })();
}, [selectedYear]);

  // When class changes, populate sections
  useEffect(() => {
    const cls = classes.find((c) => String(c.id) === String(selectedClassId));
    const raw = cls?.sections_detail || cls?.sections || [];
    const normalized = raw.map((s) =>
      typeof s === "object" ? s : { id: s, name: String(s) }
    );
    setSections(normalized);
    setSelectedSectionId("");
    setSubjects([]);
    setSelectedSubjectId("");
  }, [selectedClassId, classes]);

  // When class+section selected, fetch subjects from timetable
 // ✅ Subject loader (YEAR + CLASS + SECTION aware)
useEffect(() => {
  (async () => {
    if (!selectedYear || !selectedClassId || !selectedSectionId) {
      setSubjects([]);
      setSelectedSubjectId("");
      return;
    }

    try {
      const res = await AxiosInstance.get("timetable/", {
        params: {
          academic_year: selectedYear,   // 🔑 IMPORTANT
          class_id: selectedClassId,
          section_id: selectedSectionId,
        },
      });

      const items = normalizeArray(res.data);
      const uniq = new Map();

      for (const r of items) {
        const id = r.subject || r.subject_id;
        const name = r.subject_label || r.subject_name;
        if (id && !uniq.has(id)) {
          uniq.set(id, { id, name });
        }
      }

      setSubjects(Array.from(uniq.values()));
    } catch (e) {
      console.warn("Subject lookup failed", e);
      setSubjects([]);
    }
  })();
}, [selectedYear, selectedClassId, selectedSectionId]);


  // ---------- UI helpers ----------
  // Show year only when NO year is selected; otherwise just the class name
  const classLabel = (c) => (selectedYear ? c.name : `${c.name} (${c.year})`);

  const sortedClasses = useMemo(
    () =>
      [...classes].sort((a, b) =>
        String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase())
      ),
    [classes]
  );

  // ---------- render ----------
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Student Attendance (Monthly Sheet)</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {/* Year (required) */}
        <div>
          <label className="block text-sm font-medium mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="select select-bordered w-full"
          >
            <option value="">Select year…</option>
{years.map((y) => (
  <option key={y.id} value={y.id}>
    {y.year}
  </option>
))}
          </select>
        </div>

        {/* Class — only classes from the selected year, label without year */}
        <div>
          <label className="block text-sm font-medium mb-1">Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="select select-bordered w-full"
            disabled={!selectedYear || sortedClasses.length === 0}
          >
            <option value="">{selectedYear ? "Select class…" : "Pick a year first…"}</option>
            {sortedClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {classLabel(c)}
              </option>
            ))}
          </select>
        </div>

        {/* Section */}
        <div>
          <label className="block text-sm font-medium mb-1">Section</label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="select select-bordered w-full"
            disabled={!selectedClassId}
          >
            <option value="">Select section…</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Subject (optional) */}
        <div>
          <label className="block text-sm font-medium mb-1">Subject (optional)</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="select select-bordered w-full"
            disabled={!selectedClassId || !selectedSectionId}
          >
            <option value="">All subjects…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={() => setSheetOpen(true)}
        disabled={!selectedClassId || !selectedSectionId}
      >
        Open Monthly Sheet
      </button>

      {(selectedYear || selectedClass || selectedSection || selectedSubject) && (
        <div className="mt-3 text-sm text-gray-600 flex flex-wrap gap-x-6 gap-y-1">
          {selectedYear && <div><b>Year:</b> {selectedYear}</div>}
          {selectedClass && <div><b>Class:</b> {selectedClass.name}</div>}
          {selectedSection && <div><b>Section:</b> {selectedSection.name}</div>}
          {selectedSubject && <div><b>Subject:</b> {selectedSubject.name}</div>}
        </div>
      )}

      {sheetOpen && (
<AttendanceSheet
  open={sheetOpen}
  onClose={() => setSheetOpen(false)}
  academicYearId={selectedYear}
  classId={selectedClassId}
  sectionId={selectedSectionId}
  subjectId={selectedSubjectId || undefined}
/>
      )}
    </div>
  );
}
