import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  GitBranch,
  BarChart3,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";

import { cn } from "../../utils/cn"; // adjust path if needed

const navItems = [
  { label: "Dashboard", href: "/hr-home", icon: LayoutDashboard },
  { label: "Candidates", href: "/hr/candidate-dashboard", icon: Users },
  { label: "Exams", href: "/hr/exam", icon: FileText },
  { label: "Rounds", href: "/hr/rounds", icon: GitBranch },
  { label: "Reports", href: "/hr/reports", icon: BarChart3 },
  { label: "Settings", href: "/hr/settings", icon: Settings },
];

export default function HrSidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-white/10 bg-[#0f1e3d] text-white transition-all duration-200 lg:flex",
        collapsed ? "w-17" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold tracking-wide text-white">
            Tecnoprism
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3 mt-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-white/10 text-white shadow-md"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Collapse */}
      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>

        <Link to="/hr-login">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            {collapsed ? (
              <LogOut className="h-4 w-4" />
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </>
            )}
          </button>
        </Link>
      </div>
    </aside>
  );
}
