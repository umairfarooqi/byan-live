import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteParticipant,
} from "livekit-client";
import { WaveformCircle } from "@/components/WaveformCircle";
import { PlayButton } from "@/components/PlayButton";
import { StatusDot } from "@/components/StatusDot";
import { useWakeLock } from "@/hooks/use-wake-lock";
import {
  createLiveKitToken,
  DEFAULT_TITLE,
  LIVEKIT_URL,
  OFFLINE_TITLE,
} from "@/lib/livekit-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Audio Broadcast — Listen Live" },
      {
        name: "description",
        content:
          "Tune in to the live audio broadcast. No sign-up needed — press play and listen in real time.",
      },
      { property: "og:title", content: "Live Audio Broadcast — Listen Live" },
      {
        property: "og:description",
        content: "Tune in to the live audio broadcast. No sign-up needed — just press play.",
      },
    ],
  }),
  component: ListenerPage,
});

function readTitleFromParticipants(room: Room): string | null {
  for (const p of room.remoteParticipants.values()) {
    if (!p.metadata) continue;
    try {
      const parsed = JSON.parse(p.metadata) as { title?: string };
      if (parsed.title) return parsed.title;
    } catch {
      /* ignore malformed metadata */
    }
  }
  return null;
}

function ListenerPage() {
  const [playing, setPlaying] = useState(false);
  const [live, setLive] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [amplitude, setAmplitude] = useState<number | null>(null);

  const roomRef = useRef<Room | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useWakeLock(playing);

  // Connect once on load as a subscriber-only listener. No login, ever.
  useEffect(() => {
    let disposed = false;
    const room = new Room({ adaptiveStream: true });
    roomRef.current = room;

    const syncLive = () => {
      let hasAudio = false;
      for (const p of room.remoteParticipants.values()) {
        for (const pub of p.trackPublications.values()) {
          if (pub.kind === Track.Kind.Audio) hasAudio = true;
        }
      }
      setLive(hasAudio);
      setTitle(readTitleFromParticipants(room));
    };

    const attach = (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Audio) return;
      const el = track.attach() as HTMLAudioElement;
      el.autoplay = true;
      el.style.display = "none";
      document.body.appendChild(el);
      audioElRef.current = el;
      setupAnalyser(track.mediaStream ?? null);
      syncLive();
    };

    const setupAnalyser = (stream: MediaStream | null) => {
      if (!stream) return;
      try {
        const AudioCtx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = ((data[i] ?? 128) - 128) / 128;
            sum += v * v;
          }
          setAmplitude(Math.min(1, Math.sqrt(sum / data.length) * 3.5));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // Fallback: WaveformCircle uses its smooth looping pulse when amplitude stays null.
        setAmplitude(null);
      }
    };

    room
      .on(RoomEvent.TrackSubscribed, attach)
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach().forEach((el) => el.remove());
        syncLive();
      })
      .on(RoomEvent.ParticipantConnected, syncLive)
      .on(RoomEvent.ParticipantDisconnected, syncLive)
      .on(RoomEvent.ParticipantMetadataChanged, syncLive)
      .on(RoomEvent.DataReceived, (payload: Uint8Array, _p?: RemoteParticipant) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload)) as { title?: string };
          if (typeof msg.title === "string") setTitle(msg.title || null);
        } catch {
          /* ignore */
        }
      });

    void (async () => {
      try {
        const token = await createLiveKitToken({
          identity: `listener-${Math.random().toString(36).slice(2, 10)}`,
          canPublish: false,
        });
        if (disposed) return;
        await room.connect(LIVEKIT_URL, token, { autoSubscribe: true });
        syncLive();
      } catch {
        setLive(false);
      }
    })();

    // Poll room state every few seconds so the title/live flag stay fresh.
    const poll = window.setInterval(syncLive, 3000);

    return () => {
      disposed = true;
      window.clearInterval(poll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      void room.disconnect();
    };
  }, []);

  const displayTitle = live ? (title ?? DEFAULT_TITLE) : OFFLINE_TITLE;

  const toggle = useCallback(() => {
    const el = audioElRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [playing]);

  // Media Session API: lock-screen / headset controls + proper metadata.
  // NOTE: iOS Safari may still suspend playback when the tab is backgrounded —
  // that is a browser-level limitation with no full JS fix.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: displayTitle,
      artist: "Live Broadcast",
    });
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    navigator.mediaSession.setActionHandler("play", () => {
      if (!playing) toggle();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      if (playing) toggle();
    });
  }, [displayTitle, playing, toggle]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background px-6 py-16">
      <WaveformCircle active={live && playing} amplitude={playing ? amplitude : null} />
      <h1 className="text-center text-4xl font-bold tracking-tight text-navy sm:text-5xl">
        {displayTitle}
      </h1>
      <PlayButton playing={playing} disabled={!live} onClick={toggle} />
      <StatusDot live={live} />
    </main>
  );
}
