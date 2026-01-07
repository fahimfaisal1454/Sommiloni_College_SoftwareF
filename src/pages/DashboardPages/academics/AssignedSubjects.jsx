import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { Toaster, toast } from "react-hot-toast";
import AxiosInstance from "../../../components/AxiosInstance";

const Chip = ({ children }) => (
  <span className="inline-flex items-center h-6 px-2 text-xs rounded-full border border-emerald-300 text-emerald-700 bg-emerald-50 mr-1">
    {children}
  </span>
);

export default function AssignedSubjects() {
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSections, setSelectedSections] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const [loading, setLoading] = useState(false);

  /* ---------------- Loaders ---------------- */

  const loadYears = async () => {
    const res = await AxiosInstance.get("academic-years/");
    setYears(res.data || []);
    const active = res.data.find((y) => y.is_active);
    setSelectedYear(active?.id || res.data[0]?.id || null);
  };

  const loadClasses = async (yearId) => {
    const res = await AxiosInstance.get("classes/", {
      params: { year: yearId },
    });
    setClasses(res.data || []);
  };

  const loadSubjects = async (classId) => {
    const res = await AxiosInstance.get("subjects/", {
      params: { class: classId },
    });
    setSubjects(res.data || []);
  };

  const loadAssignments = async (classId) => {
    const res = await AxiosInstance.get("class-subjects/", {
      params: { class_id: classId },
    });
    setAssignments(res.data || []);
  };

  useEffect(() => {
    loadYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadClasses(selectedYear);
      setSelectedClass(null);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedClass) {
      loadSubjects(selectedClass.value);
      loadAssignments(selectedClass.value);
      setSections(
        (classes.find((c) => c.id === selectedClass.value)?.sections_detail) ||
          []
      );
    }
  }, [selectedClass]);

  /* ---------------- Options ---------------- */

  const yearOptions = years.map((y) => ({
    value: y.id,
    label: `${y.year}${y.is_active ? " (Active)" : ""}`,
  }));

  const classOptions = classes.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const sectionOptions = sections.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const subjectOptions = subjects.map((s) => ({
    value: s.id,
    label:
      s.name +
      (s.is_theory && s.is_practical
        ? " (Theory + Practical)"
        : s.is_practical
        ? " (Practical)"
        : " (Theory)"),
  }));

  /* ---------------- Assign ---------------- */

  const assign = async () => {
    if (!selectedClass || !selectedSections.length || !selectedSubjects.length) {
      toast.error("Select class, sections and subjects");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        class_id: selectedClass.value,
        section_ids: selectedSections.map((s) => s.value),
        subject_ids: selectedSubjects.map((s) => s.value),
      };

      const res = await AxiosInstance.post(
        "class-subjects/bulk-assign/",
        payload
      );
      toast.success(
        `Created ${res.data.created}, skipped ${res.data.skipped_existing}`
      );

      loadAssignments(selectedClass.value);
      setSelectedSections([]);
      setSelectedSubjects([]);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Assign failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Group assignments ---------------- */

  const grouped = useMemo(() => {
    const map = {};
    for (const a of assignments) {
      if (!map[a.subject]) {
        const sub = subjects.find((s) => s.id === a.subject);
        map[a.subject] = {
          subjectId: a.subject,
          subjectName: sub?.name || "—",
          type:
            sub?.is_theory && sub?.is_practical
              ? "Theory & Practical"
              : sub?.is_practical
              ? "Practical"
              : "Theory",
          sections: [],
        };
      }
      const sec = sections.find((s) => s.id === a.section);
      if (sec) map[a.subject].sections.push(sec.name);
    }
    return Object.values(map);
  }, [assignments, subjects, sections]);

  /* ---------------- UI ---------------- */

  return (
    <div className="p-4">
      <Toaster position="top-center" />

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Assign Subjects to Class Sections
        </h2>

        <div className="grid md:grid-cols-4 gap-3">
          <Select
            options={yearOptions}
            value={yearOptions.find((o) => o.value === selectedYear)}
            onChange={(o) => setSelectedYear(o?.value)}
            placeholder="Select year"
          />

          <Select
            options={classOptions}
            value={selectedClass}
            onChange={setSelectedClass}
            placeholder="Select class"
          />

          <Select
            isMulti
            options={sectionOptions}
            value={selectedSections}
            onChange={setSelectedSections}
            placeholder="Select sections"
          />

          <Select
            isMulti
            options={subjectOptions}
            value={selectedSubjects}
            onChange={setSelectedSubjects}
            placeholder="Select subjects"
          />
        </div>

        <button
          onClick={assign}
          disabled={loading}
          className="mt-3 px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {loading ? "Assigning..." : "Assign"}
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-3">Current Assignments</h3>

        {grouped.length === 0 ? (
          <div className="text-slate-500">No assignments yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Sections</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => (
                <tr key={g.subjectId} className="border-t">
                  <td className="px-3 py-2">{g.subjectName}</td>
                  <td className="px-3 py-2">{g.type}</td>
                  <td className="px-3 py-2">
                    {g.sections.map((s) => (
                      <Chip key={s}>{s}</Chip>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
