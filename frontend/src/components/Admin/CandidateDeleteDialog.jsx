import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";

export default function CandidateDeleteDialog({
  open,
  onClose,
  onConfirm,
  title = "Delete Item?",
  description = "This action cannot be undone.",
}) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose} // Close when clicking outside
    >
      <div
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
        className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-gray-200 p-6 relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="bg-red-100 text-red-600 p-3 rounded-full">
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
          {title}
        </h2>

        {/* Description */}
        <p className="text-sm text-gray-500 text-center mb-6">
          {description}
        </p>

        {/* Buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
