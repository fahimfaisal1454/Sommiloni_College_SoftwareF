import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../components/AxiosInstance";

/* ---------- helpers ---------- */
const normalize = (v) =>
  String(v || "")
    .toLowerCase()
    .trim();

const absUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = axiosInstance.defaults?.baseURL || "";
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

/* ---------- component ---------- */
export default function PublicStudents() {
  const [students, setStudents] = useState([]);
  const [activeClass, setActiveClass] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ---------- load students ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await axiosInstance.get("students/");
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.results || [];
        setStudents(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- group students ---------- */
  const grouped = useMemo(() => {
    const map = {};

    students.forEach((s) => {
      const clsKey = normalize(s.class_name_label);
      const secKey = normalize(s.section_label);

      if (!clsKey || !secKey) return;

      if (!map[clsKey]) {
        map[clsKey] = {
          label: s.class_name_label,
          sections: {},
        };
      }

      if (!map[clsKey].sections[secKey]) {
        map[clsKey].sections[secKey] = {
          label: s.section_label,
          students: [],
        };
      }

      map[clsKey].sections[secKey].students.push(s);
    });

    return map;
  }, [students]);

  /* ---------- class keys ---------- */
  const classKeys = Object.keys(grouped).sort((a, b) =>
    grouped[a].label.localeCompare(grouped[b].label, undefined, {
      numeric: true,
    })
  );

  /* ---------- auto select class ---------- */
  useEffect(() => {
    if (!activeClass && classKeys.length) {
      setActiveClass(classKeys[0]);
    }
  }, [classKeys, activeClass]);

  /* ---------- reset section ---------- */
  useEffect(() => {
    if (!activeClass || !grouped[activeClass]) return;
    const sections = Object.keys(grouped[activeClass].sections);
    setActiveSection(sections[0] || null);
  }, [activeClass, grouped]);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500">
        Loading students...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Title */}
      <h1 className="text-2xl font-bold text-center mb-4">
        Our Students
      </h1>

      {/* ---------- class tabs ---------- */}
      <div className="flex justify-center gap-2 mb-4 flex-wrap">
        {classKeys.map((cls) => (
          <button
            key={cls}
            onClick={() => setActiveClass(cls)}
            className={`px-4 py-1.5 rounded-full border text-sm font-semibold transition
              ${
                activeClass === cls
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-green-700 border-green-500 hover:bg-green-50"
              }`}
          >
            {grouped[cls].label}
          </button>
        ))}
      </div>

      {/* ---------- active class ---------- */}
      {activeClass && (
        <div className="text-center mb-3">
          <h2 className="text-xl font-semibold text-green-700 leading-tight">
            {grouped[activeClass].label}
          </h2>
          <div className="w-16 h-0.5 bg-green-600 mx-auto mt-1 rounded" />
        </div>
      )}

      {/* ---------- section tabs ---------- */}
      {activeClass && (
        <div className="flex justify-center gap-2 mb-4 flex-wrap">
          {Object.keys(grouped[activeClass].sections).map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition
                ${
                  activeSection === sec
                    ? "bg-green-600 text-white"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
            >
              Section {grouped[activeClass].sections[sec].label}
            </button>
          ))}
        </div>
      )}

      {/* ---------- students grid ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {activeClass &&
        activeSection &&
        grouped[activeClass].sections[activeSection]?.students.length ? (
          grouped[activeClass].sections[activeSection].students
            .sort(
              (a, b) =>
                Number(a.roll_number) - Number(b.roll_number)
            )
            .map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-lg border shadow-sm p-4 text-center hover:shadow-md transition"
              >
                <img
                  src={
                    absUrl(s.photo) ||
                    "https://cdn-icons-png.flaticon.com/512/4140/4140037.png"
                  }
                  alt={s.full_name}
                  className="w-20 h-20 mx-auto rounded-full object-cover border mb-2"
                />
                <h3 className="font-semibold text-base leading-tight">
                  {s.full_name}
                </h3>
                <p className="text-xs text-slate-600">
                  Roll: {s.roll_number}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {grouped[activeClass].label} –{" "}
                  {grouped[activeClass].sections[activeSection].label}
                </p>
              </div>
            ))
        ) : (
          <div className="col-span-full text-center text-slate-500 py-6">
            No students found.
          </div>
        )}
      </div>
    </div>
  );
}
