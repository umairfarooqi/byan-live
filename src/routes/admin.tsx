import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { StatusDot } from "@/components/StatusDot";
import { WaveformCircle } from "@/components/WaveformCircle";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { ADMIN_PASSWORD, createLiveKitToken, LIVEKIT_URL } from "@/lib/livekit-config";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Broadcast Console" },
      { name: "description", content: "Private console for starting and ending live sessions." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Broadcast Console" },
      { property: "og:description", content: "Private console for live audio sessions." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password === ADMIN_PASSWORD) setAuthed(true);
            else setError(true);
          }}
          className="w-full max-w-sm space-y-4"
        >
          <h1 className="text-center text-2xl font-bold text-navy">Broadcast Console</h1>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Password"
            className="w-full rounded-xl border border-border px-4 py-3 text-navy outline-none focus:border-coral"
          />
          {error && <p className="text-sm text-destructive">Incorrect password</p>}
          <button
            type="submit"
            className="w-full rounded-xl border-2 border-coral py-3 font-semibold text-coral transition-colors hover:bg-coral/10"
          >
            Enter
          </button>
        </form>
      </main>
    );
  }

  return <Console />;
}

function Console() {
  const [title, setTitle] = useState("");
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useWakeLock(live);

  // Push the title to listeners: participant metadata (for late joiners) + data channel.
  useEffect(() => {
    const room = roomRef.current;
    if (!room || !live) return;
    const payload = JSON.stringify({ title });
    void room.localParticipant.setMetadata(payload).catch(() => {});
    void room.localParticipant
      .publishData(new TextEncoder().encode(payload), { reliable: true })
      .catch(() => {});
  }, [title, live]);

  const goLive = async () => {
    setStatus("Requesting microphone…");
    try {
      const token = await createLiveKitToken({ identity: "admin-broadcaster", canPublish: true });
      const room = new Room({ adaptiveStream: false });
      room.on(RoomEvent.Disconnected, () => setLive(false));
      await room.connect(LIVEKIT_URL, token);
      await room.localParticipant.setMicrophoneEnabled(true);
      roomRef.current = room;
      setLive(true);
      setStatus(null);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not start broadcast");
    }
  };

  const endLive = async () => {
    await roomRef.current?.disconnect();
    roomRef.current = null;
    setLive(false);
    setStatus(null);
  };

  // Local-only recording of the admin's own mic via MediaRecorder. Nothing is uploaded.
  const startRecording = () => {
    const room = roomRef.current;
    const micTrack = room?.localParticipant.getTrackPublication(Track.Source.Microphone)?.track
      ?.mediaStreamTrack;
    if (!micTrack) {
      setStatus("Go live first — no microphone track to record");
      return;
    }
    try {
      const recorder = new MediaRecorder(new MediaStream([micTrack]));
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(title || "session").replace(/[^\w-]+/g, "-")}-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        chunksRef.current = [];
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setStatus(null);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Recording not supported on this browser");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center gap-8 bg-background px-6 py-12">
      <p className="w-full text-center text-sm font-medium leading-relaxed text-coral">
        Never leave this screen off and never open another app. Screen band na karein aur koi
        doosri app open na karein.
      </p>

      <div className="w-full rounded-xl border-2 border-coral bg-coral/10 px-5 py-4 text-sm font-medium leading-relaxed text-navy">
        Keep this browser tab open and on-screen the entire time you&apos;re broadcasting.
        Switching apps or letting the screen lock will cut the stream. Keep your phone plugged in
        and Do Not Disturb on.
      </div>

      <WaveformCircle active={live} />

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Session title"
        className="w-full rounded-xl border border-border px-4 py-3 text-center text-lg font-semibold text-navy outline-none focus:border-coral"
      />

      {!live ? (
        <button
          onClick={() => void goLive()}
          className="w-full rounded-xl border-2 border-coral py-4 text-lg font-semibold text-coral transition-colors hover:bg-coral/10"
        >
          Go Live
        </button>
      ) : (
        <button
          onClick={() => void endLive()}
          className="w-full rounded-xl border-2 border-destructive py-4 text-lg font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          End Live Session
        </button>
      )}

      {!recording ? (
        <button
          onClick={startRecording}
          disabled={!live}
          className="w-full rounded-xl border-2 border-navy py-4 text-lg font-semibold text-navy transition-colors hover:bg-navy/10 disabled:opacity-40"
        >
          Record
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="w-full rounded-xl border-2 border-navy bg-navy/5 py-4 text-lg font-semibold text-navy transition-colors hover:bg-navy/10"
        >
          Stop &amp; Download
        </button>
      )}

      {status && <p className="text-sm text-muted-foreground">{status}</p>}
      <StatusDot live={live} label={live ? "Broadcasting" : "Offline"} />
      {recording && <p className="text-sm text-destructive">Recording locally…</p>}
    </main>
  );
}
