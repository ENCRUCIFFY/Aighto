import { useState, useEffect, useRef, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { ArrowRight, Menu, Search } from "lucide-react";
import { supabase } from "./supabase";
import { generateToken, livekitUrl } from "./livekit";
import { VoiceRoomStage } from "./VoiceRoom";
import BentoAudioDock from "./components/BentoAudioDock";
import Sidebar from "./components/Sidebar";
import ChatFeed from "./components/ChatFeed";
import ProfilePopover from "./components/ProfilePopover";
import SettingsModal from "./components/SettingsModal";
import CommandPalette from "./components/CommandPalette";
import AddFriendModal from "./components/AddFriendModal";
import UpdateModal from "./components/UpdateModal";
import RetrowaveRadioModal from "./components/RetrowaveRadioModal";
import AightoLogo from "./components/AightoLogo";
import { MusicPlayerProvider, useMusicPlayer } from "./MusicPlayerContext";

function RetrowaveRadioGlobal() {
  const { isFullscreenStage, setIsFullscreenStage } = useMusicPlayer();
  return (
    <RetrowaveRadioModal
      isOpen={isFullscreenStage}
      onClose={() => setIsFullscreenStage(false)}
    />
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState(() => {
    try {
      return localStorage.getItem("aighto_profile_username") || "";
    } catch {
      return "";
    }
  });
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Channels, Profiles & Realtime State
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [unreadDMs, setUnreadDMs] = useState({}); // { [userId]: boolean }
  const [onlineUsers, setOnlineUsers] = useState({}); // { [userId]: "online" | "away" }
  const [myStatus, setMyStatus] = useState("online"); // "online" | "away"
  const presenceChannelRef = useRef(null);

  const [activeDMUser, setActiveDMUser] = useState(null);
  const [activeDMChannelId, setActiveDMChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState({}); // { [msgId]: { [emoji]: string[] } }
  const [pinnedByRoom, setPinnedByRoom] = useState({}); // { [roomId]: string[] }
  const [typingUsers, setTypingUsers] = useState({}); // { [userId]: { username, timestamp } }
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const realtimeChannelRef = useRef(null);
  const globalSignalRef = useRef(null);

  // Voice Mesh State (Public General Voice Stage)
  const [connectedVoice, setConnectedVoice] = useState(null);
  const [voiceToken, setVoiceToken] = useState("");
  const [isViewingStage, setIsViewingStage] = useState(false);
  const [voiceConnecting, setVoiceConnecting] = useState(false);

  // Layout, Modals & Menus State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);

  // Canonical active room UUID (channel id or database DM channel id)
  const currentRoomId = activeDMUser
    ? activeDMChannelId
    : activeChannel?.id;

  // Active pinned message IDs for the currently selected channel or DM
  const currentPinnedIds = currentRoomId ? (pinnedByRoom[currentRoomId] || []) : [];

  // Helper to send instant broadcast on permanent global bus
  const sendGlobalBroadcast = useCallback((event, payload) => {
    if (globalSignalRef.current) {
      try {
        globalSignalRef.current.send({
          type: "broadcast",
          event,
          payload,
        });
      } catch (err) {
        console.error("Global signal send error:", err);
      }
    }
  }, []);

  const handleDisconnectVoice = useCallback(() => {
    setVoiceToken("");
    setConnectedVoice(null);
    setIsViewingStage(false);
  }, []);

  // Authentication Session Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Keyboard Shortcuts (Ctrl+K / Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch Channels, Profiles, Friends & Requests on Login
  // Helper to extract and sync friends and requests from PostgreSQL channels
  const syncFriendsAndRequests = useCallback((channelList, profileList, currentUserId) => {
    if (!currentUserId || !channelList || !profileList) return;

    // 1. Confirmed Friends (friend_<userA>_<userB>)
    const friendChannels = channelList.filter(
      (c) => c.name?.startsWith("friend_") && c.name.includes(currentUserId)
    );
    const friendUserIds = friendChannels.map((c) => {
      const parts = c.name.replace("friend_", "").split("_");
      return parts.find((id) => id !== currentUserId);
    }).filter(Boolean);
    const friendProfiles = profileList.filter((p) => friendUserIds.includes(p.id));
    setFriends(friendProfiles);

    // 2. Incoming Requests (freq_<senderId>_<receiverId>)
    const incChannels = channelList.filter(
      (c) => c.name?.startsWith("freq_") && c.name.endsWith(`_${currentUserId}`)
    );
    const incUserIds = incChannels.map((c) => {
      const parts = c.name.split("_");
      return parts[1]; // sender
    }).filter(Boolean);
    const incProfiles = profileList.filter((p) => incUserIds.includes(p.id));
    setIncomingRequests(incProfiles);

    // 3. Outgoing Requests (freq_<senderId>_<receiverId>)
    const outChannels = channelList.filter(
      (c) => c.name?.startsWith(`freq_${currentUserId}_`)
    );
    const outUserIds = outChannels.map((c) => {
      const parts = c.name.split("_");
      return parts[2]; // receiver
    }).filter(Boolean);
    const outProfiles = profileList.filter((p) => outUserIds.includes(p.id));
    setOutgoingRequests(outProfiles);
  }, []);

  // Fetch Channels, Profiles, Friends & Requests from Supabase on Login
  useEffect(() => {
    if (!session?.user) return;

    const fetchChannelsAndProfiles = async () => {
      const { data: profileData } = await supabase.from("profiles").select("*");
      if (profileData) {
        setAllProfiles(profileData);
        const myProf = profileData.find((p) => p.id === session.user.id);
        if (myProf?.username) {
          setCurrentUsername(myProf.username);
          try {
            localStorage.setItem("aighto_profile_username", myProf.username);
          } catch (e) {
            console.debug("Failed to cache username:", e);
          }
        } else {
          // Initialize profile if it doesn't exist yet
          const initialName =
            session.user.user_metadata?.username ||
            session.user.email?.split("@")[0] ||
            "Operator";
          await supabase.from("profiles").upsert([
            { id: session.user.id, username: initialName },
          ]);
          setCurrentUsername(initialName);
          try {
            localStorage.setItem("aighto_profile_username", initialName);
          } catch (e) {
            console.debug("Failed to cache username:", e);
          }
        }
      }

      const { data: channelData } = await supabase.from("channels").select("*");
      if (channelData && channelData.length > 0) {
        const publicChannels = channelData.filter(
          (c) => !c.name.startsWith("dm_") && !c.name.startsWith("friend_") && !c.name.startsWith("freq_")
        );
        setChannels(publicChannels);
        if (!activeDMUser && !activeChannel && publicChannels.length > 0) {
          setActiveChannel(publicChannels[0]);
        }

        syncFriendsAndRequests(channelData, profileData || [], session.user.id);
      }
    };

    fetchChannelsAndProfiles();
  }, [session, activeDMUser, activeChannel, syncFriendsAndRequests]);

  // Listen to Database Realtime Changes on 'channels' Table for Cross-Instance Sync
  useEffect(() => {
    if (!session?.user) return;

    const channelsChannel = supabase
      .channel("aighto_channels_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels" },
        async () => {
          const { data: latestProfiles } = await supabase.from("profiles").select("*");
          if (latestProfiles) setAllProfiles(latestProfiles);

          const { data: latestChannels } = await supabase.from("channels").select("*");
          if (latestChannels && session?.user) {
            const publicChannels = latestChannels.filter(
              (c) => !c.name.startsWith("dm_") && !c.name.startsWith("friend_") && !c.name.startsWith("freq_")
            );
            setChannels(publicChannels);
            syncFriendsAndRequests(latestChannels, latestProfiles || allProfiles, session.user.id);
          }
        }
      )
      .subscribe();

    // Realtime Database sync on 'profiles' table for instant profile changes across all users
    const profilesChannel = supabase
      .channel("aighto_profiles_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          if (payload.new && payload.new.id) {
            const updated = payload.new;
            setAllProfiles((prev) => {
              const exists = prev.some((p) => p.id === updated.id);
              if (exists) {
                return prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
              }
              return [...prev, updated];
            });
            setFriends((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
            );
            if (session?.user?.id === updated.id && updated.username) {
              setCurrentUsername(updated.username);
              try {
                localStorage.setItem("aighto_profile_username", updated.username);
              } catch (e) {
                console.debug("Failed to cache username:", e);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [session, allProfiles, syncFriendsAndRequests]);

  // Permanent Global Realtime Signaling Bus (Realtime Instant UI Broadcasts & DMs)
  useEffect(() => {
    if (!session?.user) return;

    const globalSignal = supabase
      .channel("aighto_global_mesh", {
        config: { broadcast: { self: false } },
      })
      // 1. Friend Requests
      .on("broadcast", { event: "friend_request" }, ({ payload }) => {
        if (!payload?.toUserId || payload.toUserId !== session.user.id) return;
        const from = payload.fromUser;
        if (!from) return;
        setIncomingRequests((prev) => {
          if (prev.some((p) => p.id === from.id)) return prev;
          return [...prev, from];
        });
      })
      // 2. Friend Cancel
      .on("broadcast", { event: "friend_cancel" }, ({ payload }) => {
        if (!payload?.toUserId || payload.toUserId !== session.user.id) return;
        setIncomingRequests((prev) => prev.filter((p) => p.id !== payload.fromUserId));
      })
      // 3. Friend Accept
      .on("broadcast", { event: "friend_accept" }, ({ payload }) => {
        if (!payload?.toUserId || payload.toUserId !== session.user.id) return;
        const from = payload.fromUser;
        if (!from) return;
        setOutgoingRequests((prev) => prev.filter((p) => p.id !== from.id));
        setFriends((prev) => {
          if (prev.some((p) => p.id === from.id)) return prev;
          return [...prev, from];
        });
      })
      // 4. Friend Decline
      .on("broadcast", { event: "friend_decline" }, ({ payload }) => {
        if (!payload?.toUserId || payload.toUserId !== session.user.id) return;
        setOutgoingRequests((prev) => prev.filter((p) => p.id !== payload.fromUserId));
      })
      // 5. Friend Remove / Unfriend
      .on("broadcast", { event: "friend_remove" }, ({ payload }) => {
        if (!payload?.toUserId || payload.toUserId !== session.user.id) return;
        setFriends((prev) => prev.filter((p) => p.id !== payload.fromUserId));
      })
      // 6. Background DM Delivery
      .on("broadcast", { event: "dm_notification" }, ({ payload }) => {
        if (!payload?.toUserId || payload.toUserId !== session.user.id) return;
        const { senderId, message } = payload;

        if (!activeDMUser || activeDMUser.id !== senderId) {
          setUnreadDMs((prev) => ({ ...prev, [senderId]: true }));
        } else {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }
      })
      // 7. Realtime Profile Update Broadcast
      .on("broadcast", { event: "profile_updated" }, ({ payload }) => {
        if (!payload?.userId || !payload?.username) return;
        const { userId, username: newName } = payload;
        setAllProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, username: newName } : p))
        );
        setFriends((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, username: newName } : p))
        );
        setIncomingRequests((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, username: newName } : p))
        );
        setOutgoingRequests((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, username: newName } : p))
        );
        setActiveDMUser((prev) =>
          prev?.id === userId ? { ...prev, username: newName } : prev
        );
      })
      .subscribe();

    globalSignalRef.current = globalSignal;

    return () => {
      supabase.removeChannel(globalSignal);
      globalSignalRef.current = null;
    };
  }, [session, activeDMUser]);

  // Realtime Global Presence Tracking (Online / Away / Offline)
  useEffect(() => {
    if (!session?.user) return;

    const presenceChannel = supabase.channel("aighto_presence_global", {
      config: {
        presence: {
          key: session.user.id,
        },
      },
    });

    presenceChannelRef.current = presenceChannel;

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const map = {};
        Object.entries(state).forEach(([key, presences]) => {
          if (Array.isArray(presences) && presences.length > 0) {
            const latest = presences[presences.length - 1];
            map[key] = latest.status || "online";
          }
        });
        setOnlineUsers(map);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        if (Array.isArray(newPresences) && newPresences.length > 0) {
          const latest = newPresences[newPresences.length - 1];
          setOnlineUsers((prev) => ({ ...prev, [key]: latest.status || "online" }));
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setOnlineUsers((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          try {
            await presenceChannel.track({
              userId: session.user.id,
              username: currentUsername || session.user.email?.split("@")[0] || "Operator",
              status: myStatus,
              lastSeen: Date.now(),
            });
          } catch (err) {
            console.debug("Presence track error:", err);
          }
        }
      });

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
    };
  }, [session, currentUsername, myStatus]);

  // 5-Minute Idle Detector (Auto "away" status on 5 minutes inactivity)
  useEffect(() => {
    if (!session?.user) return;

    let idleTimer = null;
    const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    const updatePresenceStatus = (newStatus) => {
      setMyStatus(newStatus);
      if (presenceChannelRef.current) {
        try {
          presenceChannelRef.current.track({
            userId: session.user.id,
            username: currentUsername || session.user.email?.split("@")[0] || "Operator",
            status: newStatus,
            lastSeen: Date.now(),
          });
        } catch (e) {
          console.debug("Presence track update error:", e);
        }
      }
    };

    const handleUserActivity = () => {
      if (idleTimer) clearTimeout(idleTimer);

      setMyStatus((prev) => {
        if (prev !== "online") {
          updatePresenceStatus("online");
          return "online";
        }
        return prev;
      });

      idleTimer = setTimeout(() => {
        updatePresenceStatus("away");
      }, IDLE_TIMEOUT_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleUserActivity();
      }
    };

    // Initialize 5-minute timer
    idleTimer = setTimeout(() => {
      updatePresenceStatus("away");
    }, IDLE_TIMEOUT_MS);

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session, currentUsername]);

  // Profile Update Handler (Saves to DB, updates Auth metadata & broadcasts live to peers)
  const handleUpdateProfile = useCallback(
    async (newUsername) => {
      if (!session?.user || !newUsername?.trim()) {
        return { error: "Please enter a valid display name." };
      }
      const trimmed = newUsername.trim();

      try {
        // 1. Upsert profiles table in Supabase PostgreSQL
        const { error: dbError } = await supabase.from("profiles").upsert([
          { id: session.user.id, username: trimmed },
        ]);

        if (dbError) {
          console.error("Profile DB upsert error:", dbError);
          return { error: dbError.message };
        }

        // 2. Update Supabase Auth user_metadata
        try {
          await supabase.auth.updateUser({
            data: { username: trimmed },
          });
        } catch (authErr) {
          console.warn("Auth metadata update warning:", authErr);
        }

        // 3. Update local state & localStorage cache
        setCurrentUsername(trimmed);
        try {
          localStorage.setItem("aighto_profile_username", trimmed);
        } catch (e) {
          console.debug("Failed to cache username:", e);
        }

        setAllProfiles((prev) => {
          const exists = prev.some((p) => p.id === session.user.id);
          if (exists) {
            return prev.map((p) =>
              p.id === session.user.id ? { ...p, username: trimmed } : p
            );
          }
          return [...prev, { id: session.user.id, username: trimmed }];
        });

        setFriends((prev) =>
          prev.map((p) =>
            p.id === session.user.id ? { ...p, username: trimmed } : p
          )
        );

        // 4. Broadcast instant profile update to all active users
        sendGlobalBroadcast("profile_updated", {
          userId: session.user.id,
          username: trimmed,
        });

        return { success: true };
      } catch (err) {
        console.error("handleUpdateProfile error:", err);
        return { error: err.message || "Failed to update profile." };
      }
    },
    [session, sendGlobalBroadcast]
  );

  // Two-Way Friend Request Handlers (Persisting in Supabase PostgreSQL & Broadcasting)
  const handleSendFriendRequest = useCallback(async (targetProfile) => {
    if (!session?.user || !targetProfile) return;

    const myProfile = {
      id: session.user.id,
      username: currentUsername || session.user.user_metadata?.username || session.user.email?.split("@")[0] || "Operator",
      email: session.user.email,
    };

    const reqChannelName = `freq_${session.user.id}_${targetProfile.id}`;

    // Optimistic UI update
    setOutgoingRequests((prev) => {
      if (prev.some((p) => p.id === targetProfile.id)) return prev;
      return [...prev, targetProfile];
    });

    // Persist request in Supabase channels table
    await supabase.from("channels").insert([
      {
        name: reqChannelName,
        type: "text",
        server_id: "b846cbbc-6fbe-4038-b194-b45bfb3fa72a",
      },
    ]);

    sendGlobalBroadcast("friend_request", {
      toUserId: targetProfile.id,
      fromUser: myProfile,
    });
  }, [session, currentUsername, sendGlobalBroadcast]);

  const handleCancelFriendRequest = useCallback(async (targetProfileId) => {
    if (!session?.user) return;

    const reqChannelName = `freq_${session.user.id}_${targetProfileId}`;

    setOutgoingRequests((prev) => prev.filter((p) => p.id !== targetProfileId));

    // Delete request from Supabase channels table
    await supabase.from("channels").delete().eq("name", reqChannelName);

    sendGlobalBroadcast("friend_cancel", {
      toUserId: targetProfileId,
      fromUserId: session.user.id,
    });
  }, [session, sendGlobalBroadcast]);

  const handleAcceptFriendRequest = useCallback(async (reqProfile) => {
    if (!session?.user || !reqProfile) return;

    const myProfile = {
      id: session.user.id,
      username: currentUsername || session.user.user_metadata?.username || session.user.email?.split("@")[0] || "Operator",
      email: session.user.email,
    };

    const reqChannelName = `freq_${reqProfile.id}_${session.user.id}`;
    const friendChannelName = `friend_${[session.user.id, reqProfile.id].sort().join("_")}`;

    // Optimistic UI update
    setIncomingRequests((prev) => prev.filter((p) => p.id !== reqProfile.id));
    setFriends((prev) => {
      if (prev.some((p) => p.id === reqProfile.id)) return prev;
      return [...prev, reqProfile];
    });

    // Delete pending request & insert confirmed friendship in Supabase
    await supabase.from("channels").delete().eq("name", reqChannelName);
    await supabase.from("channels").insert([
      {
        name: friendChannelName,
        type: "text",
        server_id: "b846cbbc-6fbe-4038-b194-b45bfb3fa72a",
      },
    ]);

    sendGlobalBroadcast("friend_accept", {
      toUserId: reqProfile.id,
      fromUser: myProfile,
    });
  }, [session, currentUsername, sendGlobalBroadcast]);

  const handleDeclineFriendRequest = useCallback(async (reqProfileId) => {
    if (!session?.user) return;

    const reqChannelName = `freq_${reqProfileId}_${session.user.id}`;

    setIncomingRequests((prev) => prev.filter((p) => p.id !== reqProfileId));

    // Delete request from Supabase channels table
    await supabase.from("channels").delete().eq("name", reqChannelName);

    sendGlobalBroadcast("friend_decline", {
      toUserId: reqProfileId,
      fromUserId: session.user.id,
    });
  }, [session, sendGlobalBroadcast]);

  const handleRemoveFriend = useCallback(async (friendId) => {
    if (!session?.user) return;

    const friendChannelName = `friend_${[session.user.id, friendId].sort().join("_")}`;

    setFriends((prev) => prev.filter((f) => f.id !== friendId));

    // Delete friendship from Supabase channels table
    await supabase.from("channels").delete().eq("name", friendChannelName);

    sendGlobalBroadcast("friend_remove", {
      toUserId: friendId,
      fromUserId: session.user.id,
    });

    if (activeDMUser?.id === friendId) {
      setActiveDMUser(null);
      setActiveDMChannelId(null);
      if (channels.length > 0) setActiveChannel(channels[0]);
    }
  }, [session, activeDMUser, channels, sendGlobalBroadcast]);

  // Dynamic DM Channel Helper: Finds or creates a valid database UUID channel row
  const getOrCreateDMChannelId = useCallback(async (dmUser) => {
    if (!session?.user || !dmUser) return null;
    const dmName = `dm_${[session.user.id, dmUser.id].sort().join("_")}`;

    // Check if channel already exists
    const { data: existing } = await supabase
      .from("channels")
      .select("id")
      .eq("name", dmName)
      .maybeSingle();

    if (existing) return existing.id;

    // If not, insert channel row
    const { data: created, error } = await supabase
      .from("channels")
      .insert([
        {
          name: dmName,
          type: "text",
          server_id: "b846cbbc-6fbe-4038-b194-b45bfb3fa72a",
        },
      ])
      .select("id")
      .single();

    if (!error && created) return created.id;
    return null;
  }, [session]);

  // Fetch & Subscribe to Active Channel / DM Messages via Canonical UUID
  useEffect(() => {
    if (!session || !currentRoomId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", currentRoomId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
      } else {
        setMessages([]);
      }
    };

    fetchMessages();

    const channelSub = supabase
      .channel(`chat:${currentRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${currentRoomId}`,
        },
        (payload) => {
          if (!payload?.new) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${currentRoomId}`,
        },
        (payload) => {
          if (!payload?.old?.id) return;
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .on("broadcast", { event: "delete_message" }, ({ payload }) => {
        if (!payload?.msgId) return;
        setMessages((prev) => prev.filter((m) => m.id !== payload.msgId));
      })
      .on("broadcast", { event: "toggle_pin" }, ({ payload }) => {
        if (!payload?.roomId || !payload?.msgId) return;
        const { roomId, msgId, action } = payload;
        setPinnedByRoom((prev) => {
          const current = prev[roomId] || [];
          let next;
          if (action === "unpin") {
            next = current.filter((id) => id !== msgId);
          } else {
            next = current.includes(msgId) ? current : [...current, msgId];
          }
          return { ...prev, [roomId]: next };
        });
      })
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        if (!payload) return;
        const { msgId, emoji, userId, action } = payload;
        setReactions((prev) => {
          const currentMsg = prev[msgId] || {};
          const currentUsers = currentMsg[emoji] || [];
          let nextUsers;
          if (action === "remove") {
            nextUsers = currentUsers.filter((id) => id !== userId);
          } else {
            if (!currentUsers.includes(userId)) {
              nextUsers = [...currentUsers, userId];
            } else {
              nextUsers = currentUsers;
            }
          }
          const nextMsg = { ...currentMsg };
          if (nextUsers.length === 0) {
            delete nextMsg[emoji];
          } else {
            nextMsg[emoji] = nextUsers;
          }
          return { ...prev, [msgId]: nextMsg };
        });
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload?.userId || payload.userId === session?.user?.id) return;
        setTypingUsers((prev) => ({
          ...prev,
          [payload.userId]: {
            username: payload.username || "User",
            timestamp: Date.now(),
          },
        }));
      })
      .on("broadcast", { event: "stop_typing" }, ({ payload }) => {
        if (!payload?.userId || payload.userId === session?.user?.id) return;
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[payload.userId];
          return next;
        });
      })
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    realtimeChannelRef.current = channelSub;

    return () => {
      supabase.removeChannel(channelSub);
      realtimeChannelRef.current = null;
    };
  }, [session, currentRoomId]);

  // Periodic TTL timer to prune idle typing indicators (> 3.5s)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const activeEntries = Object.entries(prev).filter(
          ([, data]) => now - data.timestamp < 3500
        );
        if (activeEntries.length === Object.keys(prev).length) return prev;
        return Object.fromEntries(activeEntries);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSendTyping = useCallback(
    (isTyping) => {
      if (!currentRoomId || !session?.user || !realtimeChannelRef.current) return;
      const event = isTyping ? "typing" : "stop_typing";
      try {
        realtimeChannelRef.current.send({
          type: "broadcast",
          event,
          payload: {
            roomId: currentRoomId,
            userId: session.user.id,
            username:
              currentUsername ||
              session.user.user_metadata?.username ||
              session.user.email?.split("@")[0] ||
              "User",
          },
        });
      } catch (err) {
        console.error("Typing broadcast error:", err);
      }
    },
    [currentRoomId, session, currentUsername]
  );

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(null);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setAuthError(error.message);
        return;
      }
      if (data?.user) {
        await supabase.from("profiles").insert([
          { id: data.user.id, username: username || email.split("@")[0] },
        ]);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
  };

  const handleSendMessage = async (text) => {
    if (!text || !currentRoomId || !session) return;

    // Clear typing broadcast immediately
    handleSendTyping(false);

    const senderHandle =
      currentUsername ||
      session.user.user_metadata?.username ||
      session.user.email?.split("@")[0] ||
      "Operator";

    // Insert to PostgreSQL with valid schema
    const { data: newMsg, error } = await supabase
      .from("messages")
      .insert([
        {
          channel_id: currentRoomId,
          user_id: session.user.id,
          username: senderHandle,
          content: text,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Message send error:", error.message);
      return;
    }

    if (newMsg) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      if (activeDMUser) {
        sendGlobalBroadcast("dm_notification", {
          toUserId: activeDMUser.id,
          dmRoomId: currentRoomId,
          senderId: session.user.id,
          senderName: senderHandle,
          message: newMsg,
        });
      }
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!msgId || !session) return;

    setMessages((prev) => prev.filter((m) => m.id !== msgId));

    // Delete in Supabase PostgreSQL
    await supabase.from("messages").delete().eq("id", msgId);

    // Broadcast instant delete
    if (realtimeChannelRef.current) {
      try {
        realtimeChannelRef.current.send({
          type: "broadcast",
          event: "delete_message",
          payload: { msgId },
        });
      } catch (err) {
        console.error("Delete broadcast error:", err);
      }
    }
  };

  const handleToggleReaction = async (targetMsgId, targetEmoji) => {
    let msgId = targetMsgId;
    let emoji = targetEmoji;
    if (typeof targetMsgId === "object" && targetMsgId !== null) {
      msgId = targetMsgId.msgId;
      emoji = targetMsgId.emoji;
    }
    if (!session?.user || !msgId || !emoji) return;
    const userId = session.user.id;

    let willAdd = true;

    // Optimistic UI update
    setReactions((prev) => {
      const currentMsg = prev[msgId] || {};
      const currentUsers = currentMsg[emoji] || [];
      const hasReacted = currentUsers.includes(userId);
      willAdd = !hasReacted;

      const nextUsers = hasReacted
        ? currentUsers.filter((id) => id !== userId)
        : [...currentUsers, userId];

      const nextMsg = { ...currentMsg };
      if (nextUsers.length === 0) {
        delete nextMsg[emoji];
      } else {
        nextMsg[emoji] = nextUsers;
      }
      return { ...prev, [msgId]: nextMsg };
    });

    // Broadcast reaction to peers
    if (realtimeChannelRef.current) {
      try {
        realtimeChannelRef.current.send({
          type: "broadcast",
          event: "reaction",
          payload: {
            msgId,
            emoji,
            userId,
            action: willAdd ? "add" : "remove",
          },
        });
      } catch (err) {
        console.error("Reaction broadcast error:", err);
      }
    }
  };

  const handleTogglePin = (msgId) => {
    if (!currentRoomId) return;

    const currentPins = pinnedByRoom[currentRoomId] || [];
    const isPinned = currentPins.includes(msgId);
    const action = isPinned ? "unpin" : "pin";
    const nextPins = isPinned
      ? currentPins.filter((id) => id !== msgId)
      : [...currentPins, msgId];

    setPinnedByRoom((prev) => ({ ...prev, [currentRoomId]: nextPins }));

    if (realtimeChannelRef.current) {
      try {
        realtimeChannelRef.current.send({
          type: "broadcast",
          event: "toggle_pin",
          payload: { roomId: currentRoomId, msgId, action },
        });
      } catch (err) {
        console.error("Pin broadcast error:", err);
      }
    }
  };

  const handleJoinVoice = async (roomName) => {
    if (connectedVoice === roomName) {
      setIsViewingStage((prev) => !prev);
      return;
    }

    try {
      setVoiceConnecting(true);

      if (connectedVoice) {
        setVoiceToken("");
        setConnectedVoice(null);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const identity =
        currentUsername ||
        session?.user?.user_metadata?.username ||
        session?.user?.email?.split("@")[0] ||
        "Operator";
      const token = await generateToken(roomName, identity);
      setVoiceToken(token);
      setConnectedVoice(roomName);
      setIsViewingStage(true);
    } catch (err) {
      console.error("Voice connection error:", err);
    } finally {
      setVoiceConnecting(false);
    }
  };

  const handleLogout = async () => {
    handleDisconnectVoice();
    setIsProfileMenuOpen(false);
    await supabase.auth.signOut();
  };

  const handleSelectChannel = (channel) => {
    setMessages([]);
    setTypingUsers({});
    setActiveChannel(channel);
    setActiveDMUser(null);
    setActiveDMChannelId(null);
  };

  const handleSelectDM = async (dmUser) => {
    setMessages([]);
    setTypingUsers({});
    setActiveDMUser(dmUser);
    setActiveChannel(null);
    setUnreadDMs((prev) => ({ ...prev, [dmUser.id]: false }));

    const channelId = await getOrCreateDMChannelId(dmUser);
    if (channelId) {
      setActiveDMChannelId(channelId);
    }
  };

  // Auth Screen View
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen w-screen bg-[var(--bg-main)] relative overflow-hidden select-none">
        <div className="w-full max-w-sm p-7 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-2xl shadow-black/80 relative z-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent-border)] mb-3 shadow-inner">
              <AightoLogo className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Aighto
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Secure WebRTC Audio & Data Mesh
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Operator Handle
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ghost_01"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[var(--accent-color)] transition"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="operator@aighto.network"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[var(--accent-color)] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[var(--accent-color)] transition"
              />
            </div>

            {authError && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[var(--accent-color)] hover:opacity-90 text-[var(--accent-text)] text-xs font-semibold tracking-wide transition shadow-lg shadow-black/40 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>{isSignUp ? "Create Account" : "Sign In"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError(null);
              }}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Workspace Main Content View
  const mainContent = (
    <div className="flex flex-col h-screen h-[100dvh] w-screen bg-[var(--bg-main)] text-zinc-100 overflow-hidden select-none relative">
      {/* Mobile Top Navigation Bar (Hidden on md+ desktop) */}
      <header className="md:hidden h-12 px-3 pt-safe bg-[var(--bg-card)] border-b border-[var(--border-card)] flex items-center justify-between shrink-0 z-20 select-none shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-200 transition-colors cursor-pointer shrink-0"
            title="Open Channels & DMs"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <AightoLogo className="w-5 h-5 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-zinc-100 truncate">
                {activeDMUser
                  ? `@${activeDMUser.username || activeDMUser.id.slice(0, 8)}`
                  : activeChannel?.name ? `#${activeChannel.name}` : "Aighto"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Search (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            data-profile-trigger="true"
            className="w-8 h-8 rounded-lg bg-[var(--bg-input)] border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-zinc-200 cursor-pointer relative"
            title="Profile & Settings"
          >
            {(currentUsername || session.user.email?.slice(0, 2) || "OP").slice(0, 2).toUpperCase()}
            <span
              className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-[var(--bg-card)] ${
                myStatus === "away" ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer Backdrop & Modal (Hidden on md+ desktop) */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop blur */}
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          />

          {/* Drawer Container */}
          <div className="relative z-10 w-72 max-w-[85vw] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-card)] shadow-2xl flex flex-col pt-safe pb-safe animate-in slide-in-from-left duration-200">
            <Sidebar
              channels={channels}
              activeChannel={activeChannel}
              onSelectChannel={handleSelectChannel}
              friends={friends}
              pendingIncomingCount={incomingRequests.length}
              unreadDMs={unreadDMs}
              activeDMUser={activeDMUser}
              onSelectDM={handleSelectDM}
              onOpenAddFriend={() => setIsAddFriendOpen(true)}
              activeVoice={connectedVoice}
              isVoiceConnecting={voiceConnecting}
              onJoinVoice={handleJoinVoice}
              user={session.user}
              currentUsername={currentUsername}
              onlineUsers={onlineUsers}
              userStatus={myStatus}
              isCollapsed={false}
              onToggleCollapse={() => {}}
              onOpenSearch={() => setIsCommandPaletteOpen(true)}
              onOpenProfileMenu={() => setIsProfileMenuOpen((prev) => !prev)}
              isMobileDrawer={true}
              onCloseDrawer={() => setIsMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Desktop Sidebar Navigation (Hidden on mobile, visible on md+) */}
        <div className="hidden md:flex h-full shrink-0">
          <Sidebar
            channels={channels}
            activeChannel={activeChannel}
            onSelectChannel={handleSelectChannel}
            friends={friends}
            pendingIncomingCount={incomingRequests.length}
            unreadDMs={unreadDMs}
            activeDMUser={activeDMUser}
            onSelectDM={handleSelectDM}
            onOpenAddFriend={() => setIsAddFriendOpen(true)}
            activeVoice={connectedVoice}
            isVoiceConnecting={voiceConnecting}
            onJoinVoice={handleJoinVoice}
            user={session.user}
            currentUsername={currentUsername}
            onlineUsers={onlineUsers}
            userStatus={myStatus}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
            onOpenSearch={() => setIsCommandPaletteOpen(true)}
            onOpenProfileMenu={() => setIsProfileMenuOpen((prev) => !prev)}
          />
        </div>

        {/* Main Island Surface */}
        <main className="flex-1 flex overflow-hidden min-w-0 p-1.5 md:p-3 md:pl-0 pb-safe relative bg-[var(--bg-main)]">
          {connectedVoice && isViewingStage ? (
            <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 bg-[var(--bg-sidebar)]">
              <VoiceRoomStage
                roomName={connectedVoice}
                onDisconnect={handleDisconnectVoice}
                onToggleStageView={() => setIsViewingStage(false)}
                username={
                  currentUsername ||
                  session.user.user_metadata?.username ||
                  session.user.email?.split("@")[0]
                }
              />
            </div>
          ) : (
            <ChatFeed
              channelName={
                activeDMUser
                  ? `@${activeDMUser.username || activeDMUser.id.slice(0, 8)}`
                  : activeChannel?.name || "general"
              }
              activeDMUser={activeDMUser}
              messages={messages}
              reactions={reactions}
              pinnedMessageIds={currentPinnedIds}
              onTogglePin={handleTogglePin}
              onSendMessage={handleSendMessage}
              onDeleteMessage={handleDeleteMessage}
              onToggleReaction={handleToggleReaction}
              currentUser={session.user}
              currentUsername={currentUsername}
              allProfiles={allProfiles}
              typingUsers={typingUsers}
              onlineUsers={onlineUsers}
              onSendTyping={handleSendTyping}
              isRealtimeConnected={isRealtimeConnected}
            />
          )}

          {/* Floating Bento Audio Dock when browsing channels with active voice session */}
          {connectedVoice && !isViewingStage && (
            <BentoAudioDock
              roomName={connectedVoice}
              onDisconnect={handleDisconnectVoice}
              isStageView={false}
              onToggleStageView={() => setIsViewingStage(true)}
              floating={true}
            />
          )}
        </main>
      </div>

      {/* Add Friend / Friend Management Modal with 3 Tabs */}
      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        allProfiles={allProfiles}
        friends={friends}
        onlineUsers={onlineUsers}
        incomingRequests={incomingRequests}
        outgoingRequests={outgoingRequests}
        currentUser={session.user}
        onSendRequest={handleSendFriendRequest}
        onCancelRequest={handleCancelFriendRequest}
        onAcceptRequest={handleAcceptFriendRequest}
        onDeclineRequest={handleDeclineFriendRequest}
        onRemoveFriend={handleRemoveFriend}
        onSelectDM={(u) => {
          handleSelectDM(u);
          setIsAddFriendOpen(false);
        }}
      />

      {/* User Profile & Action Popover */}
      <ProfilePopover
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        user={session.user}
        currentUsername={currentUsername}
        userStatus={myStatus}
        isCollapsed={isSidebarCollapsed}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSignOut={handleLogout}
      />

      {/* Comprehensive Bento Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={session.user}
        currentUsername={currentUsername}
        onUpdateProfile={handleUpdateProfile}
      />

      {/* Command Search Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        channels={channels}
        activeChannel={activeChannel}
        onSelectChannel={(ch) => {
          handleSelectChannel(ch);
          setIsCommandPaletteOpen(false);
        }}
        activeVoice={connectedVoice}
        onJoinVoice={(v) => {
          handleJoinVoice(v);
          setIsCommandPaletteOpen(false);
        }}
        onDisconnectVoice={handleDisconnectVoice}
        isViewingStage={isViewingStage}
        onToggleStageView={() => setIsViewingStage((prev) => !prev)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        onSignOut={handleLogout}
      />

      {/* Floating In-App Tauri Updater Modal */}
      <UpdateModal />
    </div>
  );

  return (
    <MusicPlayerProvider isVoiceConnected={Boolean(connectedVoice)}>
      {voiceToken ? (
        <LiveKitRoom
          key={voiceToken}
          token={voiceToken}
          serverUrl={livekitUrl}
          connect={true}
          audio={true}
          video={false}
          className="h-screen w-screen bg-[#09090b]"
        >
          <RoomAudioRenderer />
          {mainContent}
        </LiveKitRoom>
      ) : (
        mainContent
      )}
      <RetrowaveRadioGlobal />
    </MusicPlayerProvider>
  );
}