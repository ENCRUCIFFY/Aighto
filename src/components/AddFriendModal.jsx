import { useState, useEffect, useCallback } from "react";
import {
  X,
  Search,
  UserPlus,
  UserCheck,
  UserMinus,
  Users,
  MessageSquare,
  Sparkles,
  Check,
  Clock,
} from "lucide-react";

export default function AddFriendModal({
  isOpen,
  onClose,
  allProfiles = [],
  friends = [],
  onlineUsers = {},
  incomingRequests = [],
  outgoingRequests = [],
  currentUser,
  onSendRequest,
  onCancelRequest,
  onAcceptRequest,
  onDeclineRequest,
  onRemoveFriend,
  onSelectDM,
}) {
  const [activeTab, setActiveTab] = useState("add"); // "add" | "pending" | "friends"
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const handleClose = useCallback(() => {
    setSearchQuery("");
    setFeedbackMsg("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const friendIds = new Set(friends.map((f) => f.id));
  const outgoingIds = new Set(outgoingRequests.map((r) => r.id));
  const incomingIds = new Set(incomingRequests.map((r) => r.id));

  // Candidate users to add
  const candidateProfiles = allProfiles.filter(
    (p) =>
      p.id !== currentUser?.id &&
      !friendIds.has(p.id) &&
      !incomingIds.has(p.id)
  );

  const filteredCandidates = candidateProfiles.filter((p) => {
    const name = (p.username || p.email || p.id).toLowerCase();
    return name.includes(searchQuery.toLowerCase().trim());
  });

  const filteredFriends = friends.filter((f) => {
    const name = (f.username || f.email || f.id).toLowerCase();
    return name.includes(searchQuery.toLowerCase().trim());
  });

  const handleSend = (profile) => {
    onSendRequest(profile);
    setFeedbackMsg(`Friend request sent to @${profile.username || profile.id.slice(0, 8)}!`);
    setTimeout(() => setFeedbackMsg(""), 3000);
  };

  const totalPending = incomingRequests.length + outgoingRequests.length;

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/80 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-[var(--bg-main)] border border-[var(--border-card)] shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[90dvh]"
      >
        {/* Modal Header */}
        <div className="px-4 md:px-6 py-3.5 md:py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] text-[var(--accent-color)]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Friend Management
              </h3>
              <p className="text-[10px] text-zinc-400">
                Connect with contacts and start direct conversations
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center px-4 md:px-6 pt-3 border-b border-[var(--border-subtle)] gap-2 bg-[var(--bg-sidebar)] overflow-x-auto custom-scrollbar touch-momentum">
          <button
            onClick={() => {
              setActiveTab("add");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold transition border-b-2 cursor-pointer ${activeTab === "add"
                ? "text-white border-[var(--accent-color)]"
                : "text-zinc-400 border-transparent hover:text-zinc-200"
              }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Friend</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("pending");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold transition border-b-2 cursor-pointer ${activeTab === "pending"
                ? "text-white border-[var(--accent-color)]"
                : "text-zinc-400 border-transparent hover:text-zinc-200"
              }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
            {incomingRequests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[var(--accent-color)] text-[var(--accent-text)] text-[9px] font-bold flex items-center justify-center">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("friends");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold transition border-b-2 cursor-pointer ${activeTab === "friends"
                ? "text-white border-[var(--accent-color)]"
                : "text-zinc-400 border-transparent hover:text-zinc-200"
              }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Friends ({friends.length})</span>
          </button>
        </div>

        {/* Search Bar for Add & Friends Tabs */}
        {activeTab !== "pending" && (
          <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-main)]">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] focus-within:border-[var(--accent-color)] transition">
              <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <input
                type="text"
                placeholder={
                  activeTab === "add"
                    ? "Search handle or username..."
                    : "Filter friends..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none w-full font-mono"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-zinc-500 hover:text-zinc-300 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {feedbackMsg && (
              <div className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono text-center animate-in fade-in">
                {feedbackMsg}
              </div>
            )}
          </div>
        )}

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg-main)]">
          {/* TAB 1: ADD FRIEND */}
          {activeTab === "add" && (
            filteredCandidates.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-zinc-500 gap-2 text-xs select-none">
                <div className="w-10 h-10 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-zinc-400">
                  <Sparkles className="w-4 h-4 text-[var(--accent-color)]" />
                </div>
                <p className="font-semibold text-zinc-200">
                  {searchQuery ? "No contacts found" : "No contacts to add"}
                </p>
                <p className="text-[11px] text-zinc-400 max-w-xs">
                  {searchQuery
                    ? "Try searching for a different handle."
                    : "All registered contacts are already in your list or pending."}
                </p>
              </div>
            ) : (
              filteredCandidates.map((candidate) => {
                const name = candidate.username || candidate.id.slice(0, 8);
                const initial = name.slice(0, 2).toUpperCase();
                const isSent = outgoingIds.has(candidate.id);

                return (
                  <div
                    key={candidate.id}
                    className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-card)] transition flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-9 h-9 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-xs font-mono font-bold text-[var(--accent-color)] shrink-0">
                        {initial}
                      </div>
                      <div className="truncate">
                        <h4 className="text-xs font-semibold text-zinc-100 truncate">
                          @{name}
                        </h4>
                        <span className="text-[10px] font-mono text-zinc-500">
                          ID • {candidate.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>

                    {isSent ? (
                      <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-xs font-mono flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Request Sent</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSend(candidate)}
                        className="px-3 py-1.5 rounded-xl bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-black/30 cursor-pointer active:scale-95 shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Friend</span>
                      </button>
                    )}
                  </div>
                );
              })
            )
          )}

          {/* TAB 2: PENDING REQUESTS */}
          {activeTab === "pending" && (
            totalPending === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-zinc-500 gap-2 text-xs select-none">
                <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400">
                  <Clock className="w-4 h-4 text-zinc-400" />
                </div>
                <p className="font-semibold text-zinc-200">No Pending Requests</p>
                <p className="text-[11px] text-zinc-400">
                  You have no incoming or outgoing friend requests.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Incoming Requests */}
                {incomingRequests.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-1">
                      Incoming Friend Requests ({incomingRequests.length})
                    </h4>
                    <div className="space-y-2">
                      {incomingRequests.map((req) => {
                        const name = req.username || req.id.slice(0, 8);
                        const initial = name.slice(0, 2).toUpperCase();

                        return (
                          <div
                            key={req.id}
                            className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-card)] transition flex items-center justify-between gap-3 shadow-sm"
                          >
                            <div className="flex items-center gap-3 truncate">
                              <div className="w-9 h-9 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-xs font-mono font-bold text-[var(--accent-color)] shrink-0">
                                {initial}
                              </div>
                              <div className="truncate">
                                <h4 className="text-xs font-semibold text-zinc-100 truncate">
                                  @{name}
                                </h4>
                                <span className="text-[10px] text-[var(--accent-color)]">
                                  Sent you a friend request
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => onAcceptRequest(req)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1 shadow-md cursor-pointer active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() => onDeclineRequest(req.id)}
                                className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-white/10 transition cursor-pointer"
                                title="Decline Request"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Outgoing Requests */}
                {outgoingRequests.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-1">
                      Outgoing Requests ({outgoingRequests.length})
                    </h4>
                    <div className="space-y-2">
                      {outgoingRequests.map((req) => {
                        const name = req.username || req.id.slice(0, 8);
                        const initial = name.slice(0, 2).toUpperCase();

                        return (
                          <div
                            key={req.id}
                            className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] transition flex items-center justify-between gap-3 shadow-sm"
                          >
                            <div className="flex items-center gap-3 truncate">
                              <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-zinc-300 shrink-0">
                                {initial}
                              </div>
                              <div className="truncate">
                                <h4 className="text-xs font-semibold text-zinc-200 truncate">
                                  @{name}
                                </h4>
                                <span className="text-[10px] font-mono text-zinc-500">
                                  Pending response...
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => onCancelRequest(req.id)}
                              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-white/10 text-xs transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* TAB 3: ALL FRIENDS */}
          {activeTab === "friends" && (
            filteredFriends.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-zinc-500 gap-2 text-xs select-none">
                <div className="w-10 h-10 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-zinc-400">
                  <Users className="w-4 h-4 text-zinc-400" />
                </div>
                <p className="font-semibold text-zinc-200">No Friends Added Yet</p>
                <p className="text-[11px] text-zinc-400 max-w-xs">
                  Switch to the "Add Friend" tab to search contacts and connect.
                </p>
              </div>
            ) : (
              filteredFriends.map((friend) => {
                const name = friend.username || friend.id.slice(0, 8);
                const initial = name.slice(0, 2).toUpperCase();
                const friendStatus = onlineUsers[friend.id] || "offline"; // "online" | "away" | "offline"

                return (
                  <div
                    key={friend.id}
                    className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-card)] transition flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-xs font-mono font-bold text-[var(--accent-color)] shrink-0">
                          {initial}
                        </div>
                        <span
                          className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--bg-card)] z-10 ${friendStatus === "online"
                              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                              : friendStatus === "away"
                                ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                                : "bg-zinc-600"
                            }`}
                        />
                      </div>
                      <div className="truncate min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-zinc-100 truncate">
                          @{name}
                        </h4>
                        <span
                          className={`text-[10px] font-mono flex items-center gap-1 ${friendStatus === "online"
                              ? "text-emerald-400"
                              : friendStatus === "away"
                                ? "text-amber-400"
                                : "text-zinc-500"
                            }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${friendStatus === "online"
                                ? "bg-emerald-400"
                                : friendStatus === "away"
                                  ? "bg-amber-400"
                                  : "bg-zinc-500"
                              }`}
                          />
                          {friendStatus === "online" ? "Online" : friendStatus === "away" ? "Away" : "Offline"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          onSelectDM(friend);
                          handleClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 border border-white/10 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                        title="Open Direct Message"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                        <span className="hidden sm:inline">Message</span>
                      </button>

                      <button
                        onClick={() => onRemoveFriend(friend.id)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-white/10 transition cursor-pointer"
                        title="Remove Friend"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
}
