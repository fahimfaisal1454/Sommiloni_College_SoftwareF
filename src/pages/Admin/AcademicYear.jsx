import { useEffect, useState } from "react";
import AxiosInstance from "../../components/AxiosInstance";
import toast from "react-hot-toast";

const AcademicYear = () => {
  const [years, setYears] = useState([]);
  const [yearInput, setYearInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editYear, setEditYear] = useState("");

  const fetchYears = async () => {
    try {
      const res = await AxiosInstance.get("/academic-years/");
      setYears(res.data);
    } catch {
      toast.error("Failed to load academic years");
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  // Add new year
  const handleAddYear = async () => {
    if (!yearInput) {
      toast.error("Enter a year");
      return;
    }

    try {
      setLoading(true);
      await AxiosInstance.post("/academic-years/", {
        year: Number(yearInput),
        is_active: false,
      });
      toast.success("Academic year added");
      setYearInput("");
      fetchYears();
    } catch {
      toast.error("Year already exists or invalid");
    } finally {
      setLoading(false);
    }
  };

  // Set active year
  const setActiveYear = async (id) => {
    try {
      await AxiosInstance.patch(`/academic-years/${id}/`, {
        is_active: true,
      });
      toast.success("Active year updated");
      fetchYears();
    } catch {
      toast.error("Failed to update year");
    }
  };

  // Start edit
  const startEdit = (year) => {
    setEditId(year.id);
    setEditYear(year.year);
  };

  // Save edit
  const saveEdit = async () => {
    if (!editYear) {
      toast.error("Year cannot be empty");
      return;
    }

    try {
      await AxiosInstance.patch(`/academic-years/${editId}/`, {
        year: Number(editYear),
      });
      toast.success("Academic year updated");
      setEditId(null);
      setEditYear("");
      fetchYears();
    } catch {
      toast.error("Update failed");
    }
  };

  // Delete year
  const deleteYear = async (id) => {
    if (!window.confirm("Are you sure you want to delete this academic year?")) {
      return;
    }

    try {
      await AxiosInstance.delete(`/academic-years/${id}/`);
      toast.success("Academic year deleted");
      fetchYears();
    } catch {
      toast.error("Cannot delete active or used year");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Academic Year Management</h1>

      {/* Add Year */}
      <div className="flex gap-3 mb-6">
        <input
          type="number"
          placeholder="e.g. 2026"
          value={yearInput}
          onChange={(e) => setYearInput(e.target.value)}
          className="input input-bordered w-full"
        />
        <button
          onClick={handleAddYear}
          disabled={loading}
          className="btn btn-primary"
        >
          Add Year
        </button>
      </div>

      {/* Year List */}
      <div className="bg-base-100 shadow rounded">
        <table className="table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.id}>
                <td>
                  {editId === y.id ? (
                    <input
                      type="number"
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      className="input input-sm input-bordered w-28"
                    />
                  ) : (
                    y.year
                  )}
                </td>

                <td>
                  {y.is_active ? (
                    <span className="badge badge-success">Active</span>
                  ) : (
                    <span className="badge badge-ghost">Inactive</span>
                  )}
                </td>

                <td className="text-right space-x-2">
                  {editId === y.id ? (
                    <>
                      <button
                        onClick={saveEdit}
                        className="btn btn-xs btn-success"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="btn btn-xs"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {!y.is_active && (
                        <button
                          onClick={() => setActiveYear(y.id)}
                          className="btn btn-xs btn-outline"
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(y)}
                        className="btn btn-xs btn-warning"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteYear(y.id)}
                        className="btn btn-xs btn-error"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}

            {years.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center text-gray-400">
                  No academic years found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AcademicYear;
