import { Outlet } from "react-router-dom";
import StudentSidebar from "../components/Sidebar/StudentSidebar";

export default function StudentPanel() {
  return (
    <div className="flex">
      <StudentSidebar />
      <div className="flex-grow p-4 bg-gray-50 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}
//client/src/Layout/StudentPanel.jsx