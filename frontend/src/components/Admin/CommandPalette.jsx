import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft } from "lucide-react";
import { advancedAPI } from "../../utils/apiClient";

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    const handleOpenRequest = () => setOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleOpenRequest);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleOpenRequest);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    advancedAPI
      .getCommandPalette()
      .then((res) => setItems(res?.data || []))
      .catch(() => setItems([]));
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => String(item.label || "").toLowerCase().includes(q));
  }, [items, query]);

  const onSelect = (item) => {
    if (!item?.path) return;
    setOpen(false);
    setQuery("");
    navigate(item.path);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/30 flex items-start justify-center pt-24 px-4">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search size={16} className="text-gray-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions..."
            className="w-full text-sm text-gray-800 outline-none"
          />
          <span className="text-xs text-gray-400">Esc</span>
        </div>

        <div className="max-h-80 overflow-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">No actions found.</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <span className="text-sm text-gray-800">{item.label}</span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  Enter <CornerDownLeft size={12} />
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
