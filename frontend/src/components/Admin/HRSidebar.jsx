import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  BarChart3,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MapPin,
  ChevronDown,
  Search,
} from "lucide-react";

import { cn } from "../../utils/cn";
import { useDrive } from "../../context/DriveContext";
import { usePermissions } from "../../hooks/usePermissions";

const navItems = [
  { label: "Dashboard", href: "/hr-home", icon: LayoutDashboard, permission: null }, // always visible
  { label: "Drives Info", href: "/hr/drives", icon: MapPin, permission: "drives" },
  { label: "Candidates", href: "/hr/candidate-dashboard", icon: Users, permission: "candidates" },
  { label: "Candidate 360", href: "/hr/candidate-360", icon: Search, permission: "search" },
  { label: "Exams", href: "/hr/exam", icon: FileText, permission: "exams" },
  { label: "Decisions", href: "/hr/decisions", icon: ClipboardList, permission: "decisions" },
  { label: "Reports", href: "/hr/reports", icon: BarChart3, permission: "reports" },
  { label: "Audit Logs", href: "/hr/audit-logs", icon: ClipboardList, permission: "audit_logs" },
  { label: "Admin Settings", href: "/admin-settings", icon: Settings, permission: "settings" },
];

export default function HrSidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const [collapsed, setCollapsed] = useState(false);
  const { drives, selectedDriveId, setSelectedDriveId, selectedDrive } = useDrive();
  const [driveDropdownOpen, setDriveDropdownOpen] = useState(false);
  const { can, isSuperAdmin } = usePermissions();

  const activeDrives = drives.filter((d) => d.isActive);

  // Filter nav items based on user permissions
  const visibleNavItems = navItems.filter((item) => {
    // Items with no permission requirement are always visible
    if (!item.permission) return true;
    // Super admin sees everything
    if (isSuperAdmin) return true;
    // "Candidates" is also visible if user has any round permission (round_r2, round_r3, round_r4)
    if (item.permission === "candidates") {
      return (
        can("candidates", "view") ||
        can("round_r2", "view") ||
        can("round_r3", "view") ||
        can("round_r4", "view")
      );
    }
    // Check if user has 'view' permission on the module
    return can(item.permission, "view");
  });

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen shrink-0 bg-[#0f1e3d] text-white border-r border-white/10 transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className="flex items-center h-16 px-6 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>

        {!collapsed && (
          <span className="ml-3 text-lg font-semibold tracking-wide">
            Tecnoprism
          </span>
        )}
      </div>

      {/* Drive Selector */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-white/10">
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-medium">
            Active Drive
          </label>
          <div className="relative">
            <button
              onClick={() => setDriveDropdownOpen(!driveDropdownOpen)}
              className="flex items-center justify-between w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                <span className="truncate">
                  {selectedDriveId === "all"
                    ? "All Drives"
                    : selectedDrive?.name || "Select Drive"}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-transform",
                  driveDropdownOpen && "rotate-180"
                )}
              />
            </button>

            {driveDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg bg-[#1a2e54] border border-white/10 shadow-xl py-1 max-h-48 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedDriveId("all");
                    setDriveDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors",
                    selectedDriveId === "all"
                      ? "text-blue-400 bg-white/5"
                      : "text-white/70"
                  )}
                >
                  All Drives
                </button>
                {activeDrives.map((drive) => (
                  <button
                    key={drive._id}
                    onClick={() => {
                      setSelectedDriveId(drive._id);
                      setDriveDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors flex items-center gap-2",
                      selectedDriveId === drive._id
                        ? "text-blue-400 bg-white/5"
                        : "text-white/70"
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                    <span className="truncate">{drive.name}</span>
                  </button>
                ))}
                {/* Also show inactive drives grayed out */}
                {drives
                  .filter((d) => !d.isActive)
                  .map((drive) => (
                    <button
                      key={drive._id}
                      onClick={() => {
                        setSelectedDriveId(drive._id);
                        setDriveDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors flex items-center gap-2",
                        selectedDriveId === drive._id
                          ? "text-blue-400 bg-white/5"
                          : "text-white/40"
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-500 shrink-0" />
                      <span className="truncate">{drive.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapsed Drive Indicator */}
      {collapsed && (
        <div className="flex justify-center py-3 border-b border-white/10">
          <div
            title={
              selectedDriveId === "all"
                ? "All Drives"
                : selectedDrive?.name || "Select Drive"
            }
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10"
          >
            <MapPin className="w-4 h-4 text-blue-400" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex flex-col flex-1 px-4 py-6 space-y-1">
        {visibleNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              to={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                collapsed ? "justify-center" : "justify-start",
                isActive
                  ? "bg-white/10 text-white shadow-md"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="ml-3">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-4 py-4 border-t border-white/10 space-y-2">
        {/* Collapse */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center w-full rounded-lg px-4 py-3 text-sm transition-all duration-200",
            collapsed ? "justify-center" : "justify-start",
            "text-white/70 hover:bg-white/10 hover:text-white"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="ml-3">Collapse</span>
            </>
          )}
        </button>

        {/* Logout */}
        <Link to="/hr-login">
          <button
            type="button"
            className={cn(
              "flex items-center w-full rounded-lg px-4 py-3 text-sm transition-all duration-200",
              collapsed ? "justify-center" : "justify-start",
              "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && (
              <span className="ml-3">Logout</span>
            )}
          </button>
        </Link>
      </div>
    </aside>
  );
}