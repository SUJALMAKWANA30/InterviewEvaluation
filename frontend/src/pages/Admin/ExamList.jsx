import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  FileText,
} from "lucide-react";

export default function ExamsList() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("cards");
  const [search, setSearch] = useState("");

  // 🔥 Replace with API later
  const exams = [
    {
      _id: "1",
      title: "Backend Developer Assessment",
      status: "Draft",
      createdAt: "2026-02-15",
      sections: 3,
      questions: 25,
    },
    {
      _id: "2",
      title: "Frontend Developer Test",
      status: "Published",
      createdAt: "2026-02-10",
      sections: 2,
      questions: 18,
    },
  ];

  const filteredExams = exams.filter((exam) =>
    exam.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen text-left bg-[#f8fafc] p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Exams
            </h1>
            <p className="text-sm text-gray-500">
              Manage and create assessment exams
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* <button
              onClick={() => navigate("/hr/forms")}
              className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm bg-white hover:bg-gray-50"
            >
              <FileText size={16} />
              Forms
            </button> */}

            <button
              onClick={() => navigate("/hr/exams/create")}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 cursor-pointer"
            >
              <Plus size={16} />
              Create Exam
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex justify-between items-center">
          {/* Search */}
          <div className="relative w-72">
            <Search
              size={16}
              className="absolute left-3 top-2.5 text-gray-400"
            />
            <input
              placeholder="Search exams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50 rounded-lg pl-9 pr-3 py-2 text-sm"
            />
          </div>

          {/* View Toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-4 py-2 text-sm flex items-center gap-2 ${
                viewMode === "cards"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600"
              }`}
            >
              <LayoutGrid size={16} />
              Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-4 py-2 text-sm flex items-center gap-2 ${
                viewMode === "table"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600"
              }`}
            >
              <List size={16} />
              Table
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredExams.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-gray-500 mb-3">
              No exams found.
            </p>
            <button
              onClick={() => navigate("/hr/exams/create")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              Create Your First Exam
            </button>
          </div>
        ) : viewMode === "cards" ? (
          /* Cards View */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <div
                key={exam._id}
                onClick={() =>
                  navigate(`/hr/exams/${exam._id}/builder`)
                }
                className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-md transition"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900">
                    {exam.title}
                  </h3>

                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      exam.status === "Published"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {exam.status}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mb-3">
                  Created: {exam.createdAt}
                </p>

                <div className="text-xs text-gray-600 flex justify-between">
                  <span>{exam.sections} Sections</span>
                  <span>{exam.questions} Questions</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-6 py-3">Title</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Sections</th>
                  <th className="text-left px-6 py-3">Questions</th>
                  <th className="text-left px-6 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
                  <tr
                    key={exam._id}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      navigate(`/hr/exams/${exam._id}/builder`)
                    }
                  >
                    <td className="px-6 py-4">{exam.title}</td>
                    <td className="px-6 py-4">{exam.status}</td>
                    <td className="px-6 py-4">{exam.sections}</td>
                    <td className="px-6 py-4">{exam.questions}</td>
                    <td className="px-6 py-4">{exam.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
