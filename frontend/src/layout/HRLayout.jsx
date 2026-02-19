import HRSidebar from "../components/Admin/HRSidebar"

export default function HRLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      
      {/* Sidebar */}
      <HRSidebar />

      {/* Right Section */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="w-96">
            <input
              type="text"
              placeholder="Search candidates, exams..."
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-gray-700">
              HR Executive
            </span>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              SR
            </div>
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
  )
}
