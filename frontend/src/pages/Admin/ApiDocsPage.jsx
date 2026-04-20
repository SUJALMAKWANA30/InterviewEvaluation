import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Lock,
  Globe,
  Server,
  Code2,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const METHOD_COLORS = {
  GET: "bg-green-100 text-green-700 border-green-300",
  POST: "bg-blue-100 text-blue-700 border-blue-300",
  PUT: "bg-amber-100 text-amber-700 border-amber-300",
  PATCH: "bg-purple-100 text-purple-700 border-purple-300",
  DELETE: "bg-red-100 text-red-700 border-red-300",
};

const METHOD_DOT_COLORS = {
  GET: "bg-green-500",
  POST: "bg-blue-500",
  PUT: "bg-amber-500",
  PATCH: "bg-purple-500",
  DELETE: "bg-red-500",
};

// ===================== API DEFINITIONS =====================
const API_GROUPS = [
  {
    name: "Authentication",
    prefix: "/api/auth",
    description: "HR / Admin authentication and session management",
    endpoints: [
      {
        method: "POST",
        path: "/api/auth/login",
        summary: "HR Login",
        auth: false,
        body: {
          email: { type: "string", required: true, example: "admin@tecnoprism.com" },
          password: { type: "string", required: true, example: "Admin@123" },
        },
        response: {
          success: true,
          message: "Login successful",
          token: "jwt-access-token",
          refreshToken: "jwt-refresh-token",
          user: {
            id: "ObjectId",
            name: "Admin",
            email: "admin@tecnoprism.com",
            role: "Super Admin",
            roleSlug: "super-admin",
            level: 0,
            permissions: [{ module: "candidates", actions: ["view", "edit"] }],
            drives: [],
          },
        },
        errors: [
          { status: 400, message: "Email and password are required." },
          { status: 401, message: "Invalid email or password." },
          { status: 401, message: "Your account has been deactivated." },
        ],
      },
      {
        method: "POST",
        path: "/api/auth/refresh-token",
        summary: "Refresh JWT Token",
        auth: false,
        body: {
          refreshToken: { type: "string", required: true, example: "jwt-refresh-token" },
        },
        response: { success: true, token: "new-jwt-access-token" },
        errors: [{ status: 401, message: "Invalid or expired refresh token." }],
      },
      {
        method: "GET",
        path: "/api/auth/profile",
        summary: "Get HR Profile",
        auth: true,
        response: {
          success: true,
          data: { id: "ObjectId", name: "Admin", email: "admin@tecnoprism.com", role: { name: "Super Admin", level: 0 } },
        },
      },
      {
        method: "POST",
        path: "/api/auth/logout",
        summary: "Logout HR",
        auth: true,
        response: { success: true, message: "Logged out successfully" },
      },
    ],
  },
  {
    name: "Admin — Roles",
    prefix: "/api/admin/roles",
    description: "Role management (Super Admin only for create/update/delete)",
    endpoints: [
      {
        method: "GET",
        path: "/api/admin/permissions/modules",
        summary: "Get all permission modules",
        auth: true,
        authLevel: "Authenticated HR",
        response: {
          success: true,
          data: [
            { module: "candidates", label: "Candidates", actions: ["view", "create", "edit", "delete", "export"] },
            { module: "round_r2", label: "Round R2 (Technical)", actions: ["view", "edit"] },
          ],
        },
      },
      {
        method: "GET",
        path: "/api/admin/roles",
        summary: "Get all roles",
        auth: true,
        authLevel: "Level ≤ 1 (Admin+)",
        response: { success: true, data: [{ _id: "ObjectId", name: "Super Admin", slug: "super-admin", level: 0, permissions: [], isSystem: true }] },
      },
      {
        method: "GET",
        path: "/api/admin/roles/:id",
        summary: "Get role by ID",
        auth: true,
        authLevel: "Level ≤ 1",
        params: { id: { type: "ObjectId", required: true, description: "Role ID" } },
        response: { success: true, data: { _id: "ObjectId", name: "Recruiter", slug: "recruiter", level: 3, permissions: [] } },
      },
      {
        method: "POST",
        path: "/api/admin/roles",
        summary: "Create a new role",
        auth: true,
        authLevel: "Level 0 (Super Admin)",
        body: {
          name: { type: "string", required: true, example: "Senior Recruiter" },
          level: { type: "number", required: false, example: 3 },
          permissions: { type: "array", required: false, example: [{ module: "candidates", actions: ["view", "edit"] }] },
        },
        response: { success: true, message: "Role created successfully.", data: {} },
        errors: [
          { status: 400, message: "A role with this name already exists." },
          { status: 403, message: "Cannot create a role with equal or higher privilege than your own." },
        ],
      },
      {
        method: "PUT",
        path: "/api/admin/roles/:id",
        summary: "Update a role",
        auth: true,
        authLevel: "Level 0",
        params: { id: { type: "ObjectId", required: true } },
        body: {
          name: { type: "string", required: false },
          level: { type: "number", required: false },
          permissions: { type: "array", required: false },
        },
        response: { success: true, message: "Role updated successfully.", data: {} },
      },
      {
        method: "DELETE",
        path: "/api/admin/roles/:id",
        summary: "Delete a role (cascade deletes users)",
        auth: true,
        authLevel: "Level 0",
        params: { id: { type: "ObjectId", required: true } },
        response: { success: true, message: "Role deleted successfully." },
        errors: [{ status: 403, message: "System roles cannot be deleted." }],
      },
    ],
  },
  {
    name: "Admin — Users",
    prefix: "/api/admin/users",
    description: "HR user management (create, update, toggle, delete)",
    endpoints: [
      {
        method: "GET",
        path: "/api/admin/interviewers",
        summary: "Get interviewer names",
        auth: true,
        authLevel: "Any HR",
        response: { success: true, data: [{ _id: "ObjectId", name: "Rahul Sharma" }] },
      },
      {
        method: "GET",
        path: "/api/admin/users",
        summary: "Get all HR users",
        auth: true,
        authLevel: "Level ≤ 1",
        response: { success: true, data: [{ _id: "ObjectId", name: "User", email: "user@test.com", role: { name: "Recruiter" }, isActive: true }] },
      },
      {
        method: "POST",
        path: "/api/admin/users",
        summary: "Create HR user (sends credentials email)",
        auth: true,
        authLevel: "Level ≤ 1",
        body: {
          name: { type: "string", required: true, example: "Jane Doe" },
          email: { type: "string", required: true, example: "jane@company.com" },
          password: { type: "string", required: true, example: "SecurePass123" },
          roleId: { type: "ObjectId", required: true, example: "665a..." },
          drives: { type: "array", required: false, example: ["665b..."] },
          maxCandidateLoad: { type: "number", required: false, example: 50 },
        },
        response: { success: true, message: "User created successfully.", data: {} },
        errors: [
          { status: 400, message: "A user with this email already exists." },
          { status: 400, message: "Invalid role ID." },
        ],
      },
      {
        method: "PUT",
        path: "/api/admin/users/:id",
        summary: "Update HR user",
        auth: true,
        authLevel: "Level ≤ 1",
        params: { id: { type: "ObjectId", required: true } },
        body: {
          name: { type: "string", required: false },
          email: { type: "string", required: false },
          roleId: { type: "ObjectId", required: false },
          drives: { type: "array", required: false },
        },
        response: { success: true, message: "User updated successfully.", data: {} },
      },
      {
        method: "PATCH",
        path: "/api/admin/users/:id/toggle-status",
        summary: "Toggle user active/inactive",
        auth: true,
        authLevel: "Level ≤ 1",
        params: { id: { type: "ObjectId", required: true } },
        response: { success: true, message: "User status updated.", data: { isActive: false } },
      },
      {
        method: "DELETE",
        path: "/api/admin/users/:id",
        summary: "Delete HR user",
        auth: true,
        authLevel: "Level ≤ 1",
        params: { id: { type: "ObjectId", required: true } },
        response: { success: true, message: "User deleted successfully." },
      },
    ],
  },
  {
    name: "Candidates",
    prefix: "/api/candidate-details",
    description: "Candidate registration, login, and details",
    endpoints: [
      {
        method: "POST",
        path: "/api/candidate-details/register",
        summary: "Register a new candidate (with file uploads)",
        auth: false,
        body: {
          firstName: { type: "string", required: true, example: "John" },
          lastName: { type: "string", required: true, example: "Doe" },
          email: { type: "string", required: true, example: "john@test.com" },
          phone: { type: "string", required: true, example: "9876543210" },
          password: { type: "string", required: true, example: "Pass@123" },
          driveId: { type: "ObjectId", required: false, description: "Drive to associate with" },
          skills: { type: "string", required: false, example: "JavaScript, Python" },
          currentCTC: { type: "string", required: false },
          totalExperience: { type: "string", required: false },
          noticePeriod: { type: "string", required: false },
          willingToRelocate: { type: "string", required: false },
        },
        fileUploads: ["resume (10MB)", "idProof (10MB)", "photo (10MB)", "payslips (10MB)", "lastBreakup (10MB)"],
        response: { success: true, message: "Registration successful", data: { _id: "ObjectId", uniqueId: "UID-xxx" } },
        errors: [
          { status: 400, message: "Please provide all required fields" },
          { status: 400, message: "A candidate with this email already exists" },
        ],
      },
      {
        method: "POST",
        path: "/api/candidate-details/login",
        summary: "Candidate login",
        auth: false,
        body: {
          email: { type: "string", required: true, example: "john@test.com" },
          password: { type: "string", required: true, example: "Pass@123" },
        },
        response: { success: true, token: "jwt-token", user: { id: "ObjectId", email: "john@test.com" } },
      },
      {
        method: "GET",
        path: "/api/candidate-details",
        summary: "Get all candidates",
        auth: true,
        query: { driveId: { type: "ObjectId", required: false, description: "Filter by drive" } },
        response: { success: true, data: [] },
      },
      {
        method: "GET",
        path: "/api/candidate-details/:id",
        summary: "Get candidate by ID",
        auth: true,
        params: { id: { type: "ObjectId", required: true } },
        response: { success: true, data: {} },
      },
      {
        method: "GET",
        path: "/api/candidate-details/me",
        summary: "Get logged-in candidate profile",
        auth: true,
        authLevel: "Candidate token",
        response: { success: true, data: {} },
      },
      {
        method: "PUT",
        path: "/api/candidate-details/:id",
        summary: "Update candidate details",
        auth: true,
        params: { id: { type: "ObjectId", required: true } },
        body: { firstName: { type: "string", required: false }, lastName: { type: "string", required: false } },
        response: { success: true, data: {} },
      },
    ],
  },
  {
    name: "Drives",
    prefix: "/api/drives",
    description: "Manage hiring drives",
    endpoints: [
      {
        method: "GET",
        path: "/api/drives/active",
        summary: "Get active drives (public)",
        auth: false,
        response: { success: true, data: [{ _id: "ObjectId", name: "Drive 2026", location: "Vadodara", isActive: true }] },
      },
      {
        method: "GET",
        path: "/api/drives",
        summary: "Get all drives",
        auth: true,
        response: { success: true, data: [] },
      },
      {
        method: "GET",
        path: "/api/drives/:id",
        summary: "Get drive by ID",
        auth: true,
        params: { id: { type: "ObjectId", required: true } },
        response: { success: true, data: {} },
      },
      {
        method: "POST",
        path: "/api/drives",
        summary: "Create a drive",
        auth: true,
        authLevel: "Permission: drives.create",
        body: {
          name: { type: "string", required: true, example: "Campus Drive 2026" },
          location: { type: "string", required: true, example: "Vadodara" },
          date: { type: "string", required: false, example: "2026-03-15" },
          rounds: { type: "array", required: false, example: [{ name: "R1", type: "Exam", order: 1 }] },
        },
        response: { success: true, data: {} },
      },
      {
        method: "PUT",
        path: "/api/drives/:id",
        summary: "Update a drive",
        auth: true,
        authLevel: "Permission: drives.edit",
        params: { id: { type: "ObjectId", required: true } },
        response: { success: true, data: {} },
      },
      {
        method: "PATCH",
        path: "/api/drives/:id/toggle-status",
        summary: "Toggle drive active/inactive",
        auth: true,
        authLevel: "Permission: drives.edit",
        params: { id: { type: "ObjectId", required: true } },
        response: { success: true, data: {} },
      },
      {
        method: "DELETE",
        path: "/api/drives/:id",
        summary: "Delete a drive",
        auth: true,
        authLevel: "Permission: drives.delete",
        params: { id: { type: "ObjectId", required: true } },
        response: { success: true, message: "Drive deleted." },
      },
    ],
  },
  {
    name: "Exams",
    prefix: "/api/exams",
    description: "Exam CRUD and management",
    endpoints: [
      {
        method: "GET",
        path: "/api/exams/active",
        summary: "Get active exam (public)",
        auth: false,
        response: { success: true, data: { _id: "ObjectId", title: "Technical Assessment", duration: 60, sections: [] } },
      },
      {
        method: "GET",
        path: "/api/exams",
        summary: "Get all exams",
        auth: true,
        response: { success: true, data: [] },
      },
      {
        method: "GET",
        path: "/api/exams/:id",
        summary: "Get exam by ID",
        auth: true,
        params: { id: { type: "ObjectId", required: true } },
        response: { success: true, data: {} },
      },
      {
        method: "POST",
        path: "/api/exams",
        summary: "Create a new exam",
        auth: true,
        authLevel: "Permission: exams.create",
        body: {
          title: { type: "string", required: true, example: "Technical Assessment" },
          duration: { type: "number", required: true, example: 60, description: "Minutes" },
          sections: { type: "array", required: true, example: [{ name: "Logical", questions: [] }] },
        },
        response: { success: true, data: {} },
      },
      {
        method: "PUT",
        path: "/api/exams/:id",
        summary: "Update exam",
        auth: true,
        authLevel: "Permission: exams.edit",
        params: { id: { type: "ObjectId", required: true } },
        response: { success: true, data: {} },
      },
      {
        method: "DELETE",
        path: "/api/exams/:id",
        summary: "Delete exam",
        auth: true,
        authLevel: "Permission: exams.delete",
        params: { id: { type: "ObjectId", required: true } },
        response: { success: true, message: "Exam deleted." },
      },
      {
        method: "PATCH",
        path: "/api/exams/:id/toggle-active",
        summary: "Toggle exam active status",
        auth: true,
        authLevel: "Permission: exams.edit",
        params: { id: { type: "ObjectId", required: true } },
        response: { success: true, data: {} },
      },
    ],
  },
  {
    name: "Quiz Results",
    prefix: "/api/quizresult",
    description: "Quiz results submission and retrieval (public endpoints)",
    endpoints: [
      {
        method: "POST",
        path: "/api/quizresult",
        summary: "Submit quiz result",
        auth: false,
        body: {
          email: { type: "string", required: true },
          totalMarks: { type: "number", required: true },
          sectionWiseMarks: { type: "array", required: false, example: [{ sectionName: "Logical", marks: 5 }] },
        },
        response: { success: true, data: {} },
      },
      {
        method: "GET",
        path: "/api/quizresult",
        summary: "Get all quiz results",
        auth: false,
        query: { driveId: { type: "ObjectId", required: false } },
        response: { success: true, data: [] },
      },
      {
        method: "GET",
        path: "/api/quizresult/:id",
        summary: "Get quiz result by ID",
        auth: false,
        params: { id: { type: "ObjectId", required: true } },
        response: { success: true, data: {} },
      },
      {
        method: "GET",
        path: "/api/quizresult/email/:email",
        summary: "Get quiz result by email",
        auth: false,
        params: { email: { type: "string", required: true } },
        response: { success: true, data: {} },
      },
    ],
  },
  {
    name: "User Time Details",
    prefix: "/api/user-time-details",
    description: "Track exam timing and completion",
    endpoints: [
      {
        method: "POST",
        path: "/api/user-time-details/register",
        summary: "Register time details",
        auth: false,
        body: { email: { type: "string", required: true } },
        response: { success: true, data: {} },
      },
      {
        method: "POST",
        path: "/api/user-time-details/start",
        summary: "Start exam timer",
        auth: false,
        body: { email: { type: "string", required: true } },
        response: { success: true, data: { startTime: "ISO Date" } },
      },
      {
        method: "POST",
        path: "/api/user-time-details/end",
        summary: "End exam timer",
        auth: false,
        body: { email: { type: "string", required: true } },
        response: { success: true, data: { endTime: "ISO Date", completionTime: 1800 } },
      },
      {
        method: "POST",
        path: "/api/user-time-details/complete",
        summary: "Mark exam as complete",
        auth: false,
        body: { email: { type: "string", required: true } },
        response: { success: true },
      },
      {
        method: "GET",
        path: "/api/user-time-details",
        summary: "Get all time details",
        auth: false,
        query: { driveId: { type: "ObjectId", required: false } },
        response: { success: true, data: [] },
      },
      {
        method: "GET",
        path: "/api/user-time-details/email/:email",
        summary: "Get time details by email",
        auth: false,
        params: { email: { type: "string", required: true } },
        response: { success: true, data: {} },
      },
    ],
  },
  {
    name: "Location",
    prefix: "/api/location",
    description: "Location token validation for exam centers",
    endpoints: [
      {
        method: "GET",
        path: "/api/location/validate",
        summary: "Validate location token",
        auth: false,
        query: {
          token: { type: "string", required: true, example: "ExamCenter1" },
          lat: { type: "number", required: true, example: 22.315 },
          lon: { type: "number", required: true, example: 73.144 },
        },
        response: { success: true, data: { valid: true, centerName: "Exam Center 1" } },
      },
    ],
  },
];

// ===================== COMPONENTS =====================

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 hover:bg-gray-200 rounded transition" title="Copy">
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} className="text-gray-400" />}
    </button>
  );
}

function JsonBlock({ data, label }) {
  const text = JSON.stringify(data, null, 2);
  return (
    <div className="mt-2">
      {label && <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</span>}
      <div className="relative mt-1 bg-gray-900 rounded-lg overflow-hidden">
        <div className="absolute top-2 right-2"><CopyButton text={text} /></div>
        <pre className="text-xs text-green-300 p-4 overflow-x-auto leading-relaxed">{text}</pre>
      </div>
    </div>
  );
}

function ParamTable({ params, title }) {
  if (!params || Object.keys(params).length === 0) return null;
  return (
    <div className="mt-3">
      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{title}</span>
      <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-500">Name</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500">Type</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500">Required</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500">Description / Example</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(params).map(([key, val]) => (
              <tr key={key} className="border-t border-gray-100">
                <td className="px-3 py-2 font-mono text-indigo-600 font-medium">{key}</td>
                <td className="px-3 py-2 text-gray-600">{val.type}</td>
                <td className="px-3 py-2">
                  {val.required
                    ? <span className="text-red-500 font-semibold">Yes</span>
                    : <span className="text-gray-400">No</span>}
                </td>
                <td className="px-3 py-2 text-gray-500">
                  {val.description && <span>{val.description} </span>}
                  {val.example !== undefined && (
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                      {typeof val.example === "object" ? JSON.stringify(val.example) : String(val.example)}
                    </code>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EndpointCard({ endpoint }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition"
      >
        <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded border ${METHOD_COLORS[endpoint.method]}`}>
          {endpoint.method}
        </span>
        <code className="text-sm text-gray-700 font-mono flex-1">{endpoint.path}</code>
        <div className="flex items-center gap-2">
          {endpoint.auth
            ? <Lock size={13} className="text-amber-500" />
            : <Globe size={13} className="text-green-500" />}
          <span className="text-xs text-gray-400">{endpoint.summary}</span>
          {expanded
            ? <ChevronDown size={14} className="text-gray-400" />
            : <ChevronRight size={14} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
          <p className="text-sm text-gray-700 font-medium mb-2">{endpoint.summary}</p>

          {/* Auth info */}
          <div className="flex items-center gap-2 mb-3 text-xs">
            {endpoint.auth ? (
              <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                <Lock size={11} /> {endpoint.authLevel || "Bearer Token Required"}
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                <Globe size={11} /> Public
              </span>
            )}
          </div>

          {/* Path params */}
          <ParamTable params={endpoint.params} title="Path Parameters" />

          {/* Query params */}
          <ParamTable params={endpoint.query} title="Query Parameters" />

          {/* Request body */}
          <ParamTable params={endpoint.body} title="Request Body" />

          {/* File uploads */}
          {endpoint.fileUploads && (
            <div className="mt-3">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">File Uploads (multipart/form-data)</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {endpoint.fileUploads.map((f) => (
                  <span key={f} className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded border border-purple-200">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Response */}
          {endpoint.response && <JsonBlock data={endpoint.response} label="Success Response (200)" />}

          {/* Errors */}
          {endpoint.errors?.length > 0 && (
            <div className="mt-3">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Error Responses</span>
              <div className="mt-1 space-y-1">
                {endpoint.errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs py-1.5 px-3 bg-red-50 rounded border border-red-100">
                    <span className="font-bold text-red-600">{err.status}</span>
                    <span className="text-red-700">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===================== MAIN PAGE =====================
export default function ApiDocsPage() {
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [expandAll, setExpandAll] = useState(false);

  const totalEndpoints = API_GROUPS.reduce((sum, g) => sum + g.endpoints.length, 0);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return API_GROUPS;
    const q = search.toLowerCase();
    return API_GROUPS.map((g) => ({
      ...g,
      endpoints: g.endpoints.filter(
        (e) =>
          e.path.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.method.toLowerCase().includes(q)
      ),
    })).filter((g) => g.endpoints.length > 0 || g.name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Code2 size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Interview Evaluation API</h1>
                <p className="text-xs text-gray-500">
                  {API_GROUPS.length} groups &middot; {totalEndpoints} endpoints &middot; Base: <code className="bg-gray-100 px-1 rounded">{API_BASE}</code>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/hr-home" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft size={14} /> Back
              </Link>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search endpoints, methods, or paths..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            {/* Method legend */}
            <div className="hidden md:flex items-center gap-2">
              {Object.entries(METHOD_DOT_COLORS).map(([m, c]) => (
                <span key={m} className="flex items-center gap-1 text-xs text-gray-500">
                  <span className={`w-2 h-2 rounded-full ${c}`} /> {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Sidebar TOC */}
        <nav className="hidden lg:block w-56 shrink-0 sticky top-[140px] self-start">
          <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-3">API Groups</h4>
          <ul className="space-y-1">
            {API_GROUPS.map((g) => (
              <li key={g.name}>
                <a
                  href={`#group-${g.name.replace(/\s+/g, "-")}`}
                  className={`block px-3 py-1.5 text-sm rounded-md transition ${
                    selectedGroup === g.name ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"
                  }`}
                  onClick={() => setSelectedGroup(g.name)}
                >
                  {g.name}
                  <span className="ml-1 text-xs text-gray-400">({g.endpoints.length})</span>
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
            <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Authentication</h4>
            <div className="text-xs text-gray-500 space-y-1">
              <p className="flex items-center gap-1"><Lock size={11} className="text-amber-500" /> JWT Bearer Token</p>
              <p className="flex items-center gap-1"><Shield size={11} className="text-red-500" /> Role-based (Level 0-4)</p>
              <p className="flex items-center gap-1"><Globe size={11} className="text-green-500" /> Public endpoints</p>
            </div>
          </div>
        </nav>

        {/* Main */}
        <div className="flex-1 space-y-8">
          {filteredGroups.map((group) => (
            <section key={group.name} id={`group-${group.name.replace(/\s+/g, "-")}`}>
              <div className="mb-3">
                <h2 className="text-lg font-bold text-gray-800 text-left">{group.name}</h2>
                <p className="text-sm text-gray-500 text-left">{group.description}</p>
                <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded mt-1 inline-block">{group.prefix}</code>
              </div>
              <div className="space-y-2">
                {group.endpoints.map((ep, i) => (
                  <EndpointCard key={`${ep.method}-${ep.path}-${i}`} endpoint={ep} />
                ))}
              </div>
            </section>
          ))}

          {filteredGroups.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <Server size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No endpoints match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
