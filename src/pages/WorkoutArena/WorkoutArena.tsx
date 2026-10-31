import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Info,
  LoaderCircle,
  Pause,
  Play,
  Square,
  Video,
  XCircle,
} from "lucide-react";
import { EXERCISES, getExercise } from "../../data/exercises";
import {
  Card,
  SectionTitle,
  Stat,
  DemoTag,
} from "../../components/ui/Primitives";
import { useAuth } from "@clerk/clerk-react";
import { apiFetch } from "../../services/apiClient";
import {
  MediaPipePoseVerifier,
} from "../../services/interfaces/poseVerifier";

const CATEGORY_TABS = [
  { id: "all", label: "All" },
  { id: "strength", label: "Strength" },
  { id: "core", label: "Core" },
  { id: "cardio", label: "Cardio" },
  { id: "mobility", label: "Mobility" },
] as const;

const SUPPORTED_POSE_EXERCISES = new Set(["pushup", "goblet-squat", "split-squat"]);
const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [15, 17], [17, 19], [19, 21],
  [12, 14], [14, 16], [16, 18], [18, 20], [20, 22],
  [11, 23], [12, 24], [23, 25], [25, 27], [27, 29],
  [24, 26], [26, 28], [28, 30], [23, 24],
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [8, 10], [5, 9], [9, 11], [11, 12],
];

function drawPoseOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  landmarks: Array<{ x: number; y: number } | null> | null,
) {
  const context = canvas.getContext("2d");
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  if (!context) return;

  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);

  if (!landmarks || !landmarks.length) return;

  context.lineWidth = 2;
  context.strokeStyle = "rgba(163, 230, 53, 0.9)";
  context.fillStyle = "rgba(163, 230, 53, 0.9)";

  for (const [fromIndex, toIndex] of POSE_CONNECTIONS) {
    const from = landmarks[fromIndex];
    const to = landmarks[toIndex];
    if (!from || !to) continue;
    context.beginPath();
    context.moveTo(from.x * width, from.y * height);
    context.lineTo(to.x * width, to.y * height);
    context.stroke();
  }

  for (const landmark of landmarks) {
    if (!landmark) continue;
    context.beginPath();
    context.arc(landmark.x * width, landmark.y * height, 3, 0, Math.PI * 2);
    context.fill();
  }
}

export default function WorkoutArena() {
  const { getToken } = useAuth();
  const [category, setCategory] =
    useState<(typeof CATEGORY_TABS)[number]["id"]>("all");
  const [exerciseId, setExerciseId] = useState("pushup");
  const ex = getExercise(exerciseId);
  const canVerifyPose = SUPPORTED_POSE_EXERCISES.has(ex.id);

  // session state
  const [phase, setPhase] = useState<"idle" | "running" | "paused" | "done">(
    "idle",
  );
  const [count, setCount] = useState(0); // reps or seconds
  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState<{
    sessionId: string;
    quantity: number;
    status: "unverified";
  } | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const sessionStartedAtRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // camera state
  const [camStatus, setCamStatus] = useState<
    "off" | "requesting" | "on" | "denied" | "unavailable" | "preview-error"
  >("off");
  const [verificationState, setVerificationState] = useState<
    "inactive" | "loading" | "active" | "poor-visibility" | "error"
  >("inactive");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const poseVerifierRef = useRef<MediaPipePoseVerifier | null>(null);
  const animationRef = useRef<number | null>(null);

  // ticking timer
  useEffect(() => {
    if (phase !== "running") return;
    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
      if (ex.unit === "second") setCount((c) => c + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, ex.unit]);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    poseVerifierRef.current?.destroy();
    poseVerifierRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamStatus("off");
    setVerificationState("inactive");
  }, []);

  // stop camera on unmount / leaving workout
  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (camStatus !== "on" || !videoRef.current || !poseVerifierRef.current) return;
    const runFrame = async () => {
      const video = videoRef.current;
      const verifier = poseVerifierRef.current;
      if (!video || !verifier || !streamRef.current) return;

      try {
        const result = await verifier.countRep(video);
        if (result.landmarks) {
          drawPoseOverlay(canvasRef.current!, video, result.landmarks);
        }
        if (result.counted && phase === "running" && ex.unit === "rep") {
          setCount((current) => current + 1);
        }
        setVerificationState(result.confidence >= 0.65 ? "active" : "poor-visibility");
      } catch {
        setVerificationState("error");
      }

      animationRef.current = requestAnimationFrame(runFrame);
    };

    animationRef.current = requestAnimationFrame(runFrame);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [camStatus, ex.unit, phase]);

  const startCamera = async () => {
    setCamStatus("requesting");
    setVerificationState("loading");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamStatus("unavailable");
        setVerificationState("error");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setCamStatus("preview-error");
          setVerificationState("error");
          return;
        }
      }

      const verifier = new MediaPipePoseVerifier(ex.id);
      poseVerifierRef.current = verifier;
      try {
        await verifier.initialize();
      } catch {
        setCamStatus("preview-error");
        setVerificationState("error");
        return;
      }

      setCamStatus("on");
      setVerificationState("active");
    } catch (err) {
      const name = (err as DOMException).name;
      setCamStatus(
        name === "NotAllowedError" || name === "SecurityError"
          ? "denied"
          : "unavailable",
      );
      setVerificationState("error");
    }
  };

  const startSession = () => {
    setSummary(null);
    setSubmissionError(null);
    setCount(0);
    setElapsed(0);
    setManualInput("");
    sessionStartedAtRef.current = new Date().toISOString();
    sessionIdRef.current = crypto.randomUUID();
    setPhase("running");
  };

  const finishSession = async () => {
    const q = manualInput ? parseInt(manualInput, 10) || 0 : count;
    if (q <= 0) {
      setSubmissionError("Record a positive quantity before saving the session.");
      return;
    }
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      setSubmissionError("This workout session is no longer active. Start a new session.");
      return;
    }
    setSubmitting(true);
    setSubmissionError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your sign-in session is unavailable. Please sign in again.");
      const response = await apiFetch("/workouts", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          exerciseId: ex.id,
          quantity: q,
          durationSec: Math.max(1, elapsed),
          startedAt: sessionStartedAtRef.current ?? new Date().toISOString(),
        }),
      });
      setSummary({
        sessionId: response.workout.sessionId,
        quantity: response.workout.quantity,
        status: "unverified",
      });
      setPhase("done");
      stopCamera();
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "The workout report could not be saved.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const cancelSession = () => {
    // Cancelled workouts award NOTHING.
    stopCamera();
    sessionStartedAtRef.current = null;
    setPhase("idle");
    setCount(0);
    setElapsed(0);
    setManualInput("");
  };

  const filtered = EXERCISES.filter(
    (e) => category === "all" || e.category === category,
  );
  const isRep = ex.unit === "rep";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-100">
            Workout Arena
          </h1>
          <p className="text-sm text-gray-500">
            {canVerifyPose
              ? "Live MediaPipe pose detection is active for supported repetitions."
              : "This exercise is not yet connected to the verified camera pipeline."}
          </p>
        </div>
        <DemoTag>
          {canVerifyPose
            ? "Pose verifier active for push-ups and squat variants"
            : "Session reports remain unverified"}
        </DemoTag>
      </div>

      <Card>
        <SectionTitle>Choose your exercise</SectionTitle>
        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORY_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setCategory(t.id)}
              disabled={phase === "running" || phase === "paused"}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${category === t.id ? "border-lime/60 bg-lime/15 text-lime" : "border-white/10 text-gray-400 hover:bg-white/5"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((e) => (
            <button
              key={e.id}
              disabled={phase === "running" || phase === "paused"}
              onClick={() => {
                if (phase === "idle" || phase === "done") {
                  setExerciseId(e.id);
                  setSummary(null);
                  setPhase("idle");
                }
              }}
              className={`rounded-xl border p-3.5 text-left transition ${exerciseId === e.id ? "border-lime/60 bg-lime/10" : "border-white/10 bg-graphite/60 hover:bg-white/5"} ${phase === "running" || phase === "paused" ? "opacity-50" : ""}`}
            >
              <div className="font-semibold text-gray-200">{e.name}</div>
              <div className="mt-0.5 text-xs text-gray-500">
                {e.unit === "rep" ? "Repetition report" : "Duration report"} · {SUPPORTED_POSE_EXERCISES.has(e.id) ? "pose-enabled" : "manual only"}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <SectionTitle right={<DemoTag />}>Training ground</SectionTitle>

          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${camStatus === "on" ? "" : "hidden"}`}
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 h-full w-full ${camStatus === "on" ? "" : "hidden"}`}
            />
            {camStatus === "on" && (
              <div className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-yellow-400">
                {verificationState === "active"
                  ? "Pose verification active"
                  : verificationState === "poor-visibility"
                    ? "Pose confidence low — improve framing"
                    : "Preparing pose verification"}
              </div>
            )}
            {camStatus === "requesting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
                <LoaderCircle className="animate-spin" size={30} /> Requesting
                camera…
              </div>
            )}
            {(camStatus === "off" ||
              camStatus === "denied" ||
            camStatus === "unavailable" ||
            camStatus === "preview-error") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                {camStatus === "denied" ? (
                  <XCircle size={30} className="text-red-400" />
                ) : camStatus === "unavailable" || camStatus === "preview-error" ? (
                  <CameraOff size={30} className="text-gray-500" />
                ) : (
                  <Camera size={30} className="text-gray-500" />
                )}
                <p className="text-sm text-gray-400">
                  {camStatus === "denied"
                    ? "Camera permission denied. Camera preview is unavailable; no exercise verification is active."
                    : camStatus === "unavailable"
                        ? "Camera access is not supported or no usable camera was found on this device."
                        : camStatus === "preview-error"
                          ? "Camera permission was granted, but the browser could not start the preview. Check playback settings and retry."
                        : canVerifyPose
                          ? "Enable the camera to start MediaPipe pose verification for this exercise."
                          : "Camera preview is available, but this exercise is not supported by the live verification model."}
                </p>
                {camStatus !== "denied" && camStatus !== "unavailable" && (
                  <button className="btn-primary text-sm" onClick={startCamera}>
                    <Video size={16} /> {canVerifyPose ? "Enable camera" : "Open camera preview"}
                  </button>
                )}
              </div>
            )}
          </div>

          {camStatus === "on" && (
            <button className="btn-ghost mt-3 w-full text-sm" onClick={stopCamera}>
              <CameraOff size={15} /> Stop camera
            </button>
          )}

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              label={isRep ? "Repetitions" : "Seconds"}
              value={manualInput ? `${manualInput} (self-reported)` : count}
              accent="text-lime"
            />
            <Stat
              label="Elapsed"
              value={`${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`}
            />
            <Stat
              label="XP earned"
              value={0}
              accent="text-gray-100"
            />
            <Stat
              label="FM earned"
              value={0}
              accent="text-royalbright"
            />
          </div>

          {phase === "running" && isRep && (
            <button
              className="btn-royal mt-4 w-full text-lg font-bold"
              onClick={() => setCount((c) => c + 1)}
            >
              SELF-REPORT REP ({count})
            </button>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            {(phase === "idle" || phase === "done") && (
              <button className="btn-primary flex-1" onClick={startSession}>
                <Play size={17} /> Start {ex.name}
              </button>
            )}
            {phase === "running" && (
              <button className="btn-ghost flex-1" onClick={() => setPhase("paused")}>
                <Pause size={16} /> Pause
              </button>
            )}
            {phase === "paused" && (
              <button className="btn-primary flex-1" onClick={() => setPhase("running")}>
                <Play size={16} /> Resume
              </button>
            )}
            {(phase === "running" || phase === "paused") && (
              <>
                <button className="btn-royal flex-1" onClick={() => void finishSession()} disabled={submitting}>
                  <Square size={15} /> {submitting ? "Saving…" : "Save report"}
                </button>
                <button className="btn-ghost flex-1" onClick={cancelSession}>
                  <XCircle size={15} /> Cancel
                </button>
              </>
            )}
          </div>

          {(phase === "running" || phase === "paused") && isRep && (
            <div className="mt-4">
              <label className="text-xs uppercase tracking-wider text-gray-500">
                {canVerifyPose ? "Verified repetitions" : "Self-reported repetitions (unverified)"}
              </label>
              <input
                className="input-field mt-1.5"
                inputMode="numeric"
                placeholder={canVerifyPose ? "Camera counts automatically" : "e.g. 25"}
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          )}
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <SectionTitle>{ex.name}</SectionTitle>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {ex.targetMuscles.map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-gray-400"
                >
                  {m}
                </span>
              ))}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Instructions
            </div>
            <ol className="mt-2 space-y-1.5 text-sm text-gray-300">
              {ex.instructions.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-lime">{i + 1}.</span> {s}
                </li>
              ))}
            </ol>
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-royal/30 bg-royal/5 p-3 text-xs text-royalbright">
              <Info size={14} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Form guide</div>
                <ul className="mt-1 list-disc pl-4 text-royalbright/80">
                  {ex.formTips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>
              Reward rules <DemoTag>configurable</DemoTag>
            </SectionTitle>
            <div className="text-sm text-gray-400">
              <div>
                XP: <strong className="text-gray-100">{ex.xpPerUnit}</strong> /{" "}
                {isRep ? "rep" : "sec"}
              </div>
              <div className="mt-1">
                Strength:{" "}
                <strong className="text-lime">{ex.strengthPerUnit}</strong> /{" "}
                {isRep ? "rep" : "sec"}
              </div>
              <div className="mt-1">
                FM Coins:{" "}
                <strong className="text-royalbright">{ex.coinsPerUnit}</strong>{" "}
                / {isRep ? "rep" : "sec"}
              </div>
            </div>
            <p className="mt-3 text-[11px] text-gray-600">
              The listed values are historical game-design constants only. They are
              not used to award rewards because verified pose tracking is not connected.
              Reports are saved as unverified. Category:{" "}
              <strong className="capitalize text-gray-400">
                {ex.buildingCategory}
              </strong>
            </p>
          </Card>

          {submissionError && (
            <Card className="border-red-400/30 text-sm text-red-200">
              {submissionError}
            </Card>
          )}

          {summary && (
            <Card className="border-lime/40">
              <div className="flex items-center gap-2 text-lime">
                <CheckCircle2 size={20} />
                <span className="font-display text-lg font-bold">
                  Workout complete!
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-lg bg-white/5 p-2.5">
                  <div className="font-bold text-gray-100">
                    {summary.quantity}
                  </div>
                  <div className="text-xs text-gray-500">
                    {isRep ? "reps" : "sec"}
                  </div>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <div className="font-bold text-amber-300">Unverified</div>
                  <div className="text-xs text-gray-500">Status</div>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <div className="font-bold text-gray-100">0</div>
                  <div className="text-xs text-gray-500">XP / FM</div>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-gray-500">
                Saved to your authenticated workout history as an unverified
                self-report. It does not change progression or earn rewards.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
