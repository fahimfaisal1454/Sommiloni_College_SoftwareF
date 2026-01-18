import { useState, useEffect } from "react";
import {
  FaFacebookF,
  FaTwitter,
  FaYoutube,
  FaLinkedinIn,
  FaUserAlt,
} from "react-icons/fa";
import { IoIosLogOut } from "react-icons/io";
import { MdDashboard } from "react-icons/md";
import { Link, NavLink } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import { useUser } from "../Provider/UseProvider";
import AxiosInstance from "./AxiosInstance";

export default function Navbar() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [instituteInfo, setInstituteInfo] = useState(null);
  const { user } = useUser();

  const fetchInstitution = async () => {
    try {
      const res = await AxiosInstance.get("institutions/");
      setInstituteInfo(res.data[0]);
    } catch (err) {
      console.error("Failed to fetch institution info:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.reload();
  };

  useEffect(() => {
    fetchInstitution();
  }, []);

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/about", label: "About Us" },
    { path: "/acknowledgment", label: "Accreditation" },
    { path: "/routine", label: "Routine" },
    { path: "/result", label: "Results" },
    { path: "/facnstaff", label: "Faculty & Staff" },
    { path: "/students", label: "Students" },
    { path: "/gallery", label: "Gallery" },
    { path: "/notice", label: "Notices" },
    { path: "/contact", label: "Contact" },
  ];

  return (
    <>
      <header className="">
        {/* Top Bar */}
        <div className="bg-[#2c8e3f] backdrop-blur-md text-black py-2 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 flex justify-end items-center space-x-4">
            <div className="flex items-center space-x-3 text-sm">
              <a href="#" className="hover:text-green-700"><FaFacebookF /></a>
              <a href="#" className="hover:text-green-700"><FaTwitter /></a>
              <a href="#" className="hover:text-green-700"><FaYoutube /></a>
              <a href="#" className="hover:text-green-700"><FaLinkedinIn /></a>
            </div>
            <div className="h-4 w-px bg-black/10" />
            {!user ? (
              <Link to="/login" className="flex items-center space-x-1 text-sm font-medium hover:text-green-700">
                <FaUserAlt /><span>Login</span>
              </Link>
            ) : user.role === "Admin" ? (
              <Link to="/dashboard" className="flex items-center space-x-1 text-sm font-medium hover:text-green-700">
                <MdDashboard /><span>Dashboard</span>
              </Link>
            ) : user.role === "Teacher" ? (
              <Link to="/teacher/dashboard" className="flex items-center space-x-1 text-sm font-medium hover:text-green-700">
                <MdDashboard /><span>Teacher</span>
              </Link>
            ) : user.role === "Student" ? (
              <Link to="/student/dashboard" className="flex items-center space-x-1 text-sm font-medium hover:text-green-700">
                <MdDashboard /><span>Student</span>
              </Link>
            ) : (
              <button onClick={handleLogout} className="flex items-center space-x-1 text-sm font-medium text-red-600 hover:text-red-700">
                <IoIosLogOut /><span>Logout</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Navbar */}
        <div className="bg-lime-50 backdrop-blur-md text-black shadow-md border-b border-black/5">
          <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-3">
            {/* Logo + Name */}
            <Link to="/" className="flex items-center space-x-3">
              <img
                src={instituteInfo?.logo}
                alt="Logo"
                className="w-10 h-10 rounded-full object-cover border border-black/10 shadow-sm"
              />
              <div className="flex flex-col">
                <h1 className="text-lg md:text-2xl font-extrabold text-black">
                  {instituteInfo?.name}
                </h1>
                <p className="text-sm md:text-base text-black/80 leading-tight">
                  {instituteInfo?.address}
                </p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-2 text-sm font-semibold">
              {navItems.map(({ path, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    [
                      "inline-flex items-center justify-center",
                      "h-9 px-3",
                      "rounded-md leading-none",
                      "transition-colors duration-200",
                      "ring-1 shadow-[0_1px_1.5px_rgba(0,0,0,0.06)]",
                      isActive
                        ? "bg-green-700 text-white ring-green-800/50"
                        : "bg-white text-green-700 ring-green-300 hover:bg-green-50 hover:text-green-900"
                    ].join(" ")
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Mobile Toggle */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden text-black"
              aria-label="Toggle menu"
            >
              {showMobileMenu ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden bg-white text-black px-4 pb-4 pt-2 space-y-3 font-semibold border-t border-black/10">
            {navItems.map(({ label, path }) => (
              <NavLink
                key={path}
                to={path}
                onClick={() => setShowMobileMenu(false)}
                className={({ isActive }) =>
                  [
                    "block w-full",
                    "h-10 px-3 inline-flex items-center rounded-md",
                    "ring-1 transition-colors duration-200",
                    isActive
                      ? "bg-[#4FA825] text-white ring-green-800/50"
                      : "bg-white text-green-700 ring-green-300 hover:bg-green-50 hover:text-green-900"
                  ].join(" ")
                }
              >
                {label}
              </NavLink>
            ))}

            <div className="border-t border-black/10 mt-4 pt-4">
              <div className="flex items-center justify-between">
                {!user ? (
                  <Link
                    to="/login"
                    className="flex items-center space-x-2 text-green-700 hover:text-green-900"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <FaUserAlt />
                    <span>Login</span>
                  </Link>
                ) : user.role === "Admin" ? (
                  <Link
                    to="/dashboard"
                    className="flex items-center space-x-2 text-green-700 hover:text-green-900"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <MdDashboard />
                    <span>Dashboard</span>
                  </Link>
                ) : (
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                  >
                    <IoIosLogOut />
                    <span>Logout</span>
                  </button>
                )}
                <div className="flex items-center space-x-3 text-black/70">
                  <a href="#" className="hover:text-green-700"><FaFacebookF /></a>
                  <a href="#" className="hover:text-green-700"><FaTwitter /></a>
                  <a href="#" className="hover:text-green-700"><FaYoutube /></a>
                  <a href="#" className="hover:text-green-700"><FaLinkedinIn /></a>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
