import {
  Users,
  Briefcase,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const stats = [
  {
    label: "Total Candidates",
    value: "1,247",
    change: "+12.5%",
    trending: "up",
    icon: Users,
  },
  {
    label: "Active Hiring Drives",
    value: "8",
    change: "+2",
    trending: "up",
    icon: Briefcase,
  },
  {
    label: "Conversion Rate",
    value: "34.2%",
    change: "+4.1%",
    trending: "up",
    icon: TrendingUp,
  },
  {
    label: "Pending Interviews",
    value: "23",
    change: "-3",
    trending: "down",
    icon: Clock,
  },
];

const barData = [
  { month: "Jan", applications: 120, hired: 18 },
  { month: "Feb", applications: 180, hired: 25 },
  { month: "Mar", applications: 150, hired: 20 },
  { month: "Apr", applications: 210, hired: 35 },
  { month: "May", applications: 190, hired: 30 },
  { month: "Jun", applications: 240, hired: 42 },
];

const pieData = [
  { name: "Applied", value: 450, color: "#2563eb" },
  { name: "Exam Passed", value: 280, color: "#14b8a6" },
  { name: "Interviewed", value: 150, color: "#f59e0b" },
  { name: "Hired", value: 62, color: "#22c55e" },
];

const recentActivity = [
  {
    name: "Sarah Miller",
    action: "completed the aptitude exam",
    time: "2 min ago",
    score: "92%",
  },
  {
    name: "James Wilson",
    action: "moved to Round 3 - HR Interview",
    time: "15 min ago",
  },
  {
    name: "Emily Chen",
    action: "submitted application for UX Designer",
    time: "32 min ago",
  },
  {
    name: "Michael Brown",
    action: "completed technical interview",
    time: "1 hour ago",
    score: "85%",
  },
  {
    name: "Lisa Anderson",
    action: "registered as new candidate",
    time: "2 hours ago",
  },
];

export default function HrDashboard() {
  return (
    <div className="w-full text-left">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, Sarah. Here is your recruitment overview.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white px-6 py-5 transition-all duration-300 ease-out hover:-translate-z-1 hover:shadow-lg hover:shadow-blue-100"
          >
            {/* Top Row */}
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                <stat.icon className="h-5 w-5 text-blue-600" />
              </div>

              <span
                className={`flex items-center gap-1 text-xs font-semibold ${
                  stat.trending === "up" ? "text-green-600" : "text-red-500"
                }`}
              >
                {stat.trending === "up" ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {stat.change}
              </span>
            </div>

            <div className="mt-5">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm xl:col-span-3">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-900">
              Applications vs Hires
            </h3>
            <p className="text-xs text-gray-500">Last 6 months performance</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar
                  dataKey="applications"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                />
                <Bar dataKey="hired" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm xl:col-span-2">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-900">
              Pipeline Breakdown
            </h3>
            <p className="text-xs text-gray-500">Current hiring funnel</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  animationDuration={800}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value, name) => [`${value}`, name]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-gray-600">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-10 rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-5">
          Recent Activity
        </h3>

        <div className="divide-y divide-gray-200">
          {recentActivity.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                  {item.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>

                <div>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{item.name}</span>{" "}
                    {item.action}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{item.time}</p>
                </div>
              </div>

              {item.score && (
                <span className="text-sm font-semibold text-green-600">
                  {item.score}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
