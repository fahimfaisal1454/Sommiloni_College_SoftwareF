// src/pages/TeacherPanel/TeacherRoutine.jsx
import { useEffect, useMemo, useState } from "react";
import AxiosInstance from "../../components/AxiosInstance";
import { Toaster, toast } from "react-hot-toast";

const DAYS = [
  { value: "Mon", label: "Monday" },
  { value: "Tue", label: "Tuesday" },
  { value: "Wed", label: "Wednesday" },
  { value: "Thu", label: "Thursday" },
  { value: "Fri", label: "Friday" },
  { value: "Sat", label: "Saturday" },
  { value: "Sun", label: "Sunday" },
];

export default function TeacherRoutine() {
  const [routine, setRoutine] = useState({});
  const [loading, setLoading] = useState(false);

  // ─────────────────────────────────────
  // Load weekly routine for logged-in teacher
  // ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        const userID = user?.id || null;

        if (!userID) {
          toast.error("No logged-in user found");
          setLoading(false);
          return;
        }

        const res = await AxiosInstance.get("timetable/week", {
          params: { user_id: userID },
        });

        const data = res?.data || {};
        console.log("Fetched routine data:", data);
        setRoutine(data);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load routine");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─────────────────────────────────────
  // Build period slots (columns) + fast lookup map for cells
  // ─────────────────────────────────────
  const { slots, cells, hasAnyClass } = useMemo(() => {
    const slotMap = new Map();
    const cellMap = new Map();
    let any = false;

    DAYS.forEach((day) => {
      const rows = routine?.[day.value] || [];
      if (rows.length > 0) any = true;

      rows.forEach((r) => {
        const start = r.start_time;
        const end = r.end_time;
        if (!start || !end) return;

        const key = `${start}-${end}`;
        if (!slotMap.has(key)) {
          slotMap.set(key, {
            key,
            start,
            end,
          });
        }
        cellMap.set(`${day.value}|${key}`, r);
      });
    });

    // Sort periods by start time
    const slotsArr = Array.from(slotMap.values()).sort((a, b) =>
      String(a.start).localeCompare(String(b.start))
    );

    return { slots: slotsArr, cells: cellMap, hasAnyClass: any };
  }, [routine]);

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-semibold">My Weekly Routine</h1>

      {loading && <p>Loading…</p>}

      {!loading && !hasAnyClass && (
        <div className="bg-white border rounded p-3 text-sm text-gray-600">
          No classes assigned in this week&apos;s routine.
        </div>
      )}

      {!loading && hasAnyClass && (
        <div className="overflow-x-auto bg-white border rounded">
          <table className="min-w-full text-sm text-center border-collapse">
            <thead className="bg-gray-50">
              <tr>
                {/* Left column header for days */}
                <th className="border px-4 py-2 text-left w-32">Day</th>

                {/* Period headers with time */}
                {slots.map((slot, index) => {
                  const start = slot.start?.slice(0, 5);
                  const end = slot.end?.slice(0, 5);
                  return (
                    <th key={slot.key} className="border px-4 py-2">
                      <div className="font-semibold">
                        Period {index + 1}
                      </div>
                      <div className="text-xs text-gray-600">
                        {start} – {end}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => (
                <tr key={day.value}>
                  {/* Day name on the left */}
                  <td className="border px-4 py-2 text-left font-medium bg-gray-50">
                    {day.label}
                  </td>

                  {/* One cell per period for this day */}
                  {slots.map((slot) => {
                    const key = `${day.value}|${slot.key}`;
                    const r = cells.get(key);

                    if (!r) {
                      // No class -> hyphen
                      return (
                        <td key={slot.key} className="border px-2 py-2">
                          -
                        </td>
                      );
                    }

                    const classSection = `${r.class_name_label || ""}${
                      r.section_label ? " " + r.section_label : ""
                    }`.trim();

                    return (
                      <td
                        key={slot.key}
                        className="border px-2 py-2 align-top"
                      >
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-semibold">
                            {r.subject_label}
                          </span>
                          {classSection && <span>{classSection}</span>}
                          {(r.classroom_label || r.room) && (
                            <span className="text-[10px] text-gray-500">
                              Room {r.classroom_label || r.room}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
