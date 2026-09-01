import { useEffect, useState, useRef } from "react";
import { Track } from "livekit-client";

/**
 * Isolated Web Audio API analyzer hook for per-participant 0ms audio volume & speaking detection.
 * Strictly binds only to the specific participant's own audio stream track with instantaneous mute reset
 * and automatic idle suspension when the window is hidden/minimized.
 */
export function useParticipantAudio(participant) {
  const [volume, setVolume] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!participant) return;

    let isMounted = true;
    let audioCtx = null;
    let analyser = null;
    let source = null;
    let dataArray = null;
    let sampleAudioLoop = null;

    const resetSilence = () => {
      if (dataArray) dataArray.fill(0);
      if (isMounted) {
        setVolume(0);
        setIsSpeaking(false);
      }
    };

    const setupAudio = () => {
      try {
        let streamTrack = null;
        let micPub = null;

        // 1. Check direct microphone track publication on this participant
        micPub = participant.getTrackPublication?.(Track.Source.Microphone);
        if (
          micPub?.track?.mediaStreamTrack &&
          micPub.track.mediaStreamTrack.readyState === "live" &&
          !micPub.isMuted &&
          micPub.track.mediaStreamTrack.enabled !== false
        ) {
          streamTrack = micPub.track.mediaStreamTrack;
        }

        // 2. Check all audio track publications strictly owned by this participant
        if (!streamTrack && participant.audioTrackPublications) {
          for (const pub of participant.audioTrackPublications.values()) {
            if (
              pub.track?.mediaStreamTrack &&
              pub.track.mediaStreamTrack.readyState === "live" &&
              !pub.isMuted &&
              pub.track.mediaStreamTrack.enabled !== false
            ) {
              streamTrack = pub.track.mediaStreamTrack;
              micPub = pub;
              break;
            }
          }
        }

        // If this participant is not publishing audio or is muted, immediately reset to zero
        if (!streamTrack || micPub?.isMuted || participant.isMicrophoneEnabled === false) {
          resetSilence();
          return;
        }

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          setIsSpeaking(Boolean(participant.isSpeaking));
          return;
        }

        audioCtx = new AudioContextClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.15; // Fast responsive envelope

        const mediaStream = new MediaStream([streamTrack]);
        source = audioCtx.createMediaStreamSource(mediaStream);
        source.connect(analyser);

        dataArray = new Uint8Array(analyser.frequencyBinCount);

        sampleAudioLoop = () => {
          if (!isMounted) return;

          // If window is minimized or hidden in background, suspend loop to achieve near-zero idle CPU
          if (document.visibilityState === "hidden") {
            animFrameRef.current = null;
            return;
          }

          // Check on every frame if the track was muted or disabled mid-speech
          const isMutedNow =
            !streamTrack ||
            streamTrack.enabled === false ||
            streamTrack.muted ||
            streamTrack.readyState !== "live" ||
            micPub?.isMuted === true ||
            participant.isMicrophoneEnabled === false;

          if (isMutedNow) {
            resetSilence();
            animFrameRef.current = requestAnimationFrame(sampleAudioLoop);
            return;
          }

          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(1, avg / 70);

          const speaking = normalized > 0.08;
          setVolume(normalized);
          setIsSpeaking(speaking);

          animFrameRef.current = requestAnimationFrame(sampleAudioLoop);
        };

        sampleAudioLoop();

        // Listen for direct stream track mute/unmute events
        streamTrack.onmute = () => resetSilence();
        streamTrack.onunmute = () => handleTrackUpdate();
        streamTrack.onended = () => resetSilence();
      } catch {
        resetSilence();
      }
    };

    setupAudio();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isMounted && sampleAudioLoop && !animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(sampleAudioLoop);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleTrackUpdate = () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtx && audioCtx.state !== "closed") audioCtx.close().catch(() => {});
      setupAudio();
    };

    const handleMuteEvent = () => {
      resetSilence();
      handleTrackUpdate();
    };

    if (typeof participant.on === "function") {
      participant.on("trackPublished", handleTrackUpdate);
      participant.on("trackSubscribed", handleTrackUpdate);
      participant.on("trackUnpublished", handleMuteEvent);
      participant.on("trackUnsubscribed", handleMuteEvent);
      participant.on("trackMuted", handleMuteEvent);
      participant.on("localTrackMuted", handleMuteEvent);
      participant.on("trackUnmuted", handleTrackUpdate);
      participant.on("localTrackUnmuted", handleTrackUpdate);
      participant.on("isSpeakingChanged", (speaking) => {
        if (!analyser) {
          if (!speaking) {
            resetSilence();
          } else {
            setIsSpeaking(true);
            setVolume(0.5);
          }
        }
      });
    }

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (typeof participant.off === "function") {
        participant.off("trackPublished", handleTrackUpdate);
        participant.off("trackSubscribed", handleTrackUpdate);
        participant.off("trackUnpublished", handleMuteEvent);
        participant.off("trackUnsubscribed", handleMuteEvent);
        participant.off("trackMuted", handleMuteEvent);
        participant.off("localTrackMuted", handleMuteEvent);
        participant.off("trackUnmuted", handleTrackUpdate);
        participant.off("localTrackUnmuted", handleTrackUpdate);
      }
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    };
  }, [participant]);

  return { volume, isSpeaking };
}
