import { useState } from "react";
import { Copy, Check, ExternalLink, Eye, EyeOff } from "lucide-react";
import FileCard from "./FileCard";

/**
 * Custom High-Performance Markdown, Code Block & File Attachment Parser for Bento Chat
 */
export default function MessageContent({ content = "", onOpenImage }) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState({});

  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleSpoiler = (index) => {
    setRevealedSpoilers((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Detect image markdown or image URLs: ![alt](url) or http...(.png|.jpg|.jpeg|.webp|.gif)
  const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s]+|data:image\/[^\s]+)\)/g;
  const fileRegex = /\[file:([^:]+):([^\]]*)\]\(([^)]+)\)/g;
  const directImageRegex = /^(https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp)(\?[^\s]*)?)$/i;

  // Render code blocks ```lang ... ```
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;

    // Split by code blocks
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let blockIdx = 0;

    while ((match = codeBlockRegex.exec(rawText)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: rawText.slice(lastIndex, match.index),
          key: `text-${lastIndex}`,
        });
      }

      parts.push({
        type: "code",
        lang: match[1] || "code",
        code: match[2].trim(),
        key: `code-${match.index}`,
        index: blockIdx++,
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < rawText.length) {
      parts.push({
        type: "text",
        content: rawText.slice(lastIndex),
        key: `text-${lastIndex}`,
      });
    }

    return parts.map((part) => {
      if (part.type === "code") {
        return (
          <div
            key={part.key}
            className="my-2 rounded-xl bg-[#0d0d11] border border-white/10 overflow-hidden font-mono text-[11px] shadow-sm select-text"
          >
            {/* Code Block Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#131318] border-b border-white/10 text-zinc-400">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-300">
                {part.lang}
              </span>
              <button
                onClick={() => handleCopyCode(part.code, part.index)}
                className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded-md hover:bg-white/10 transition cursor-pointer"
              >
                {copiedIndex === part.index ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            {/* Code Content */}
            <pre className="p-3 overflow-x-auto text-zinc-100 leading-relaxed font-mono">
              <code>{part.code}</code>
            </pre>
          </div>
        );
      }

      // Inline text formatting (bold, italic, inline code, links, spoilers)
      return (
        <span key={part.key} className="whitespace-pre-wrap break-words">
          {renderInlineFormatting(part.content)}
        </span>
      );
    });
  };

  const renderInlineFormatting = (str) => {
    // Regex for inline code `...`, spoilers ||...||, links http..., bold **...**, italics *...*
    const tokenRegex = /(`[^`]+`|\|\|.+?\|\||https?:\/\/[^\s]+|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const tokens = str.split(tokenRegex);

    return tokens.map((token, idx) => {
      if (!token) return null;

      // Inline Code `...`
      if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-white/10 border border-white/10 text-zinc-200 font-mono text-[11px]"
          >
            {token.slice(1, -1)}
          </code>
        );
      }

      // Spoiler ||...||
      if (token.startsWith("||") && token.endsWith("||") && token.length > 4) {
        const spoilerText = token.slice(2, -2);
        const isRevealed = revealedSpoilers[idx];
        return (
          <span
            key={idx}
            onClick={() => toggleSpoiler(idx)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md text-[11px] font-mono cursor-pointer transition-all ${
              isRevealed
                ? "bg-zinc-800 text-zinc-200 border border-white/10"
                : "bg-zinc-900 text-transparent hover:text-zinc-300 select-none blur-[4px] hover:blur-none border border-white/10"
            }`}
            title="Click to reveal spoiler"
          >
            {spoilerText}
            {isRevealed ? (
              <EyeOff className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
            ) : (
              <Eye className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
            )}
          </span>
        );
      }

      // Hyperlink
      if (token.startsWith("http://") || token.startsWith("https://")) {
        // If image link, render image card
        if (directImageRegex.test(token)) {
          return (
            <div key={idx} className="my-2 max-w-sm rounded-xl overflow-hidden border border-white/10 bg-[#0d0d11] group cursor-pointer">
              <img
                src={token}
                alt="Attachment"
                onClick={() => onOpenImage && onOpenImage(token)}
                className="max-h-64 w-auto object-cover rounded-xl transition hover:opacity-90"
                loading="lazy"
              />
            </div>
          );
        }

        return (
          <a
            key={idx}
            href={token}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition mx-0.5"
          >
            <span>{token.length > 35 ? token.slice(0, 32) + "..." : token}</span>
            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
          </a>
        );
      }

      // Bold **...**
      if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
        return (
          <strong key={idx} className="font-bold text-white">
            {token.slice(2, -2)}
          </strong>
        );
      }

      // Italic *...*
      if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
        return (
          <em key={idx} className="italic text-zinc-300">
            {token.slice(1, -1)}
          </em>
        );
      }

      return <span key={idx}>{token}</span>;
    });
  };

  // Check for file attachment markdown: [file:filename:size](dataUrl)
  if (fileRegex.test(content)) {
    const fileMatches = [];
    let match;
    const regexClone = new RegExp(fileRegex);
    while ((match = regexClone.exec(content)) !== null) {
      fileMatches.push({
        full: match[0],
        filename: match[1],
        size: match[2],
        dataUrl: match[3],
      });
    }

    const textWithoutFiles = content.replace(fileRegex, "").trim();

    return (
      <div className="space-y-2">
        {textWithoutFiles && <div>{renderFormattedText(textWithoutFiles)}</div>}
        {fileMatches.map((f, i) => (
          <FileCard
            key={i}
            filename={f.filename}
            size={f.size}
            dataUrl={f.dataUrl}
          />
        ))}
      </div>
    );
  }

  // Check for image markdown ![alt](url)
  if (imageRegex.test(content)) {
    const parts = content.split(imageRegex);
    return (
      <div className="space-y-2">
        {parts.map((p, i) => {
          if (p.startsWith("http") || p.startsWith("data:image")) {
            return (
              <div
                key={i}
                onClick={() => onOpenImage && onOpenImage(p)}
                className="max-w-sm rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d11] shadow-md group cursor-pointer hover:border-white/20 transition-all"
              >
                <img
                  src={p}
                  alt="Attachment"
                  className="max-h-64 w-auto object-cover rounded-xl transition group-hover:scale-[1.02]"
                  loading="lazy"
                />
              </div>
            );
          }
          return p ? <div key={i}>{renderFormattedText(p)}</div> : null;
        })}
      </div>
    );
  }

  return <>{renderFormattedText(content)}</>;
}
