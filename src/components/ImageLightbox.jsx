import { useEffect } from "react";
import { X, Download, ExternalLink } from "lucide-react";

export default function ImageLightbox({ imageUrl, onClose }) {
  useEffect(() => {
    if (!imageUrl) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `aighto-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 select-none cursor-zoom-out animate-in fade-in duration-150"
    >
      {/* Top Action Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 flex items-center gap-2 z-10"
      >
        <button
          onClick={handleDownload}
          className="p-2 rounded-xl bg-[#16161b] hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition cursor-pointer shadow-lg"
          title="Download Image"
        >
          <Download className="w-4 h-4" />
        </button>

        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-xl bg-[#16161b] hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition cursor-pointer shadow-lg"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-[#16161b] hover:bg-rose-950/60 hover:border-rose-700/40 border border-white/10 text-zinc-300 hover:text-rose-200 transition cursor-pointer shadow-lg"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Image View */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[85vh] rounded-2xl overflow-hidden border border-white/15 shadow-2xl shadow-black/90 cursor-default"
      >
        <img
          src={imageUrl}
          alt="Full preview"
          className="max-w-full max-h-[85vh] object-contain select-none"
        />
      </div>
    </div>
  );
}
