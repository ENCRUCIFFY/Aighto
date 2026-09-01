import {
  FileText,
  FileCode,
  Archive,
  FileAudio,
  File,
  Download,
} from "lucide-react";

/**
 * Returns an appropriate Lucide icon and color based on file extension
 */
function getFileIcon(filename = "") {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
    case "doc":
    case "docx":
    case "txt":
    case "md":
      return { icon: FileText, color: "text-rose-400", bg: "bg-rose-950/30" };
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "json":
    case "py":
    case "rs":
    case "html":
    case "css":
      return { icon: FileCode, color: "text-indigo-400", bg: "bg-indigo-950/30" };
    case "zip":
    case "tar":
    case "gz":
    case "rar":
    case "7z":
      return { icon: Archive, color: "text-amber-400", bg: "bg-amber-950/30" };
    case "mp3":
    case "wav":
    case "ogg":
    case "m4a":
      return { icon: FileAudio, color: "text-emerald-400", bg: "bg-emerald-950/30" };
    default:
      return { icon: File, color: "text-zinc-400", bg: "bg-zinc-800/40" };
  }
}

export default function FileCard({ filename, size, dataUrl }) {
  const { icon: Icon, color, bg } = getFileIcon(filename);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="my-2 max-w-sm rounded-2xl bg-[#0d0d11] border border-white/10 p-3 flex items-center justify-between gap-3 shadow-md select-none hover:border-white/20 transition-all">
      <div className="flex items-center gap-3 truncate min-w-0">
        <div
          className={`w-10 h-10 rounded-xl ${bg} border border-white/10 flex items-center justify-center shrink-0 shadow-inner`}
        >
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="truncate">
          <p className="text-xs font-semibold text-zinc-100 truncate tracking-tight">
            {filename}
          </p>
          <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">
            {size || "File Attachment"}
          </span>
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition cursor-pointer shrink-0 shadow-sm"
        title={`Download ${filename}`}
      >
        <Download className="w-4 h-4 text-indigo-400" />
      </button>
    </div>
  );
}
