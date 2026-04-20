import { useNavigate } from "react-router-dom"
import { LogOut, Command } from "lucide-react"
import HRSidebar from "../components/Admin/HRSidebar"
import CommandPalette from "../components/Admin/CommandPalette"
import { DriveProvider } from "../context/DriveContext"

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("userData")) || {};
  } catch {
    return {};
  }
}

export default function HRLayout({ children }) {
  const navigate = useNavigate();
  const user = getUser();
  const initials = (user.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userType");
    localStorage.removeItem("userRole");
    localStorage.removeItem("selectedDriveId");
    navigate("/hr-login", { replace: true });
  };

  return (
    <DriveProvider>
      <div className="flex h-screen overflow-hidden bg-gray-100">

        {/* Sidebar */}
        <HRSidebar />

        {/* Right Section */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Header */}
          <header className="flex h-16 shrink-0 items-center justify-end border-b border-gray-200 bg-white px-6">
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
                className="hidden md:flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition"
                title="Open command palette (Ctrl/Cmd + K)"
              >
                <Command size={14} />
                <span>Ctrl/Cmd + K</span>
              </button>
              <span className="text-sm font-medium text-gray-700">
                {user.name || "User"}
              </span>
              <span className="text-xs text-gray-400">
                {user.roleName || ""}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                {initials}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </header>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-6">
              {children}
            </div>
          </main>

        </div>
      </div>
      <CommandPalette />
    </DriveProvider>
  )
}
