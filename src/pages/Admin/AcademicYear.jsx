import { useEffect, useState } from "react";
import AxiosInstance from "../../components/AxiosInstance";
import toast from "react-hot-toast";

const AcademicYear = () => {
  const [years, setYears] = useState([]);
  const [yearInput, setYearInput] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchYears = async () => {
    try {
      const res = await AxiosInstance.get("/academic-years/");
      setYears(res.data);
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      toast.error("Failed to update year");
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.id}>
                <td>{y.year}</td>
                <td>
                  {y.is_active ? (
                    <span className="badge badge-success">Active</span>
                  ) : (
                    <span className="badge badge-ghost">Inactive</span>
                  )}
                </td>
                <td>
                  {!y.is_active && (
                    <button
                      onClick={() => setActiveYear(y.id)}
                      className="btn btn-xs btn-outline"
                    >
                      Set Active
                    </button>
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
