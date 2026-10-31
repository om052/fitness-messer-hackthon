/**
 * Browser-side pose verification contract.
 * When a compatible MediaPipe runtime is available it performs real landmark
 * analysis and emits a truthful verification state instead of demo counting.
 */

import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

export type VerificationStatus =
  | "not-connected"
  | "connecting"
  | "active"
  | "error";

export interface PoseVerificationResult {
  counted: boolean;
  confidence: number;
  landmarks: NormalizedLandmark[] | null;
}

export interface PoseVerifier {
  readonly status: VerificationStatus;
  countRep(videoFrame: unknown): Promise<PoseVerificationResult>;
  getLatestLandmarks(): NormalizedLandmark[] | null;
  initialize(): Promise<void>;
  destroy(): void;
}

const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function angleAt(a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark) {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag === 0) return 180;
  return Math.acos(clamp(dot / mag, -1, 1)) * (180 / Math.PI);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export class MediaPipePoseVerifier implements PoseVerifier {
  private landmarker: PoseLandmarker | null = null;
  private latestLandmarks: NormalizedLandmark[] | null = null;
  private lastPhase: "up" | "down" | null = null;
  private cooldownUntil = 0;
  private initialized = false;
  private readonly exerciseId: string;

  status: VerificationStatus = "not-connected";

  constructor(exerciseId: string = "pushup") {
    this.exerciseId = exerciseId;
  }

  async initialize(): Promise<void> {
    if (this.initialized && this.landmarker) return;
    this.status = "connecting";
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
        },
        runningMode: "VIDEO",
        numPoses: 1,
        outputSegmentationMasks: false,
      });
      this.status = "active";
      this.initialized = true;
    } catch (error) {
      console.error("Pose landmarker initialization failed", error);
      this.status = "error";
      this.landmarker = null;
      throw error;
    }
  }

  getLatestLandmarks() {
    return this.latestLandmarks;
  }

  async countRep(videoFrame: unknown): Promise<PoseVerificationResult> {
    const video = videoFrame as HTMLVideoElement | VideoFrame | { width?: number; height?: number } | null | undefined;
    if (!video || !this.landmarker) {
      return { counted: false, confidence: 0, landmarks: null };
    }

    const timestamp = typeof performance !== "undefined" ? Math.round(performance.now() * 1000) : Date.now();

    let result;
    if (video instanceof HTMLVideoElement || video instanceof HTMLCanvasElement || "videoWidth" in (video ?? {})) {
      result = this.landmarker.detectForVideo(video as HTMLVideoElement, timestamp);
    } else if (video instanceof VideoFrame) {
      result = this.landmarker.detectForVideo(video as VideoFrame, timestamp);
    } else {
      return { counted: false, confidence: 0, landmarks: null };
    }

    const landmarks = result.landmarks?.[0] ?? null;
    this.latestLandmarks = landmarks;
    if (!landmarks) {
      return { counted: false, confidence: 0, landmarks: null };
    }

    const exerciseResult = this.detectExercise(landmarks);
    this.latestLandmarks = landmarks;
    return {
      counted: exerciseResult.counted,
      confidence: exerciseResult.confidence,
      landmarks,
    };
  }

  destroy(): void {
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }
    this.latestLandmarks = null;
    this.lastPhase = null;
    this.cooldownUntil = 0;
    this.initialized = false;
    this.status = "not-connected";
  }

  private detectExercise(landmarks: NormalizedLandmark[]) {
    if (this.exerciseId === "goblet-squat" || this.exerciseId === "split-squat") {
      return this.detectSquat(landmarks);
    }
    if (this.exerciseId === "pushup" || this.exerciseId === "hip-openers") {
      return this.detectPushup(landmarks);
    }
    return { counted: false, confidence: 0 };
  }

  private detectPushup(landmarks: NormalizedLandmark[]) {
    const shoulderLeft = landmarks[11];
    const shoulderRight = landmarks[12];
    const elbowLeft = landmarks[13];
    const elbowRight = landmarks[14];
    const wristLeft = landmarks[15];
    const wristRight = landmarks[16];
    const hipLeft = landmarks[23];
    const hipRight = landmarks[24];
    if (!shoulderLeft || !shoulderRight || !elbowLeft || !elbowRight || !wristLeft || !wristRight || !hipLeft || !hipRight) {
      return { counted: false, confidence: 0 };
    }

    const elbowAngle = average([
      angleAt(shoulderLeft, elbowLeft, wristLeft),
      angleAt(shoulderRight, elbowRight, wristRight),
    ]);
    const bodyCenterY = average([
      shoulderLeft.y,
      shoulderRight.y,
      hipLeft.y,
      hipRight.y,
      (shoulderLeft.y + shoulderRight.y + hipLeft.y + hipRight.y) / 4,
    ]);
    const wristY = average([wristLeft.y, wristRight.y]);
    const currentPhase = elbowAngle < 120 ? "down" : "up";
    const confidence = clamp(1 - Math.abs(elbowAngle - (currentPhase === "down" ? 85 : 170)) / 120, 0.2, 1);

    const now = performance.now();
    if (this.cooldownUntil > now && this.lastPhase === currentPhase) {
      return { counted: false, confidence };
    }

    if (this.lastPhase && this.lastPhase !== currentPhase) {
      const validCycle =
        (this.lastPhase === "up" && currentPhase === "down") ||
        (this.lastPhase === "down" && currentPhase === "up");
      if (validCycle && bodyCenterY > 0.18 && bodyCenterY < 0.9 && wristY > 0.12) {
        this.cooldownUntil = now + 500;
        this.lastPhase = currentPhase;
        return { counted: true, confidence };
      }
    }

    this.lastPhase = currentPhase;
    return { counted: false, confidence };
  }

  private detectSquat(landmarks: NormalizedLandmark[]) {
    const hipLeft = landmarks[23];
    const hipRight = landmarks[24];
    const kneeLeft = landmarks[25];
    const kneeRight = landmarks[26];
    const ankleLeft = landmarks[27];
    const ankleRight = landmarks[28];
    if (!hipLeft || !hipRight || !kneeLeft || !kneeRight || !ankleLeft || !ankleRight) {
      return { counted: false, confidence: 0 };
    }

    const kneeAngle = average([
      angleAt(hipLeft, kneeLeft, ankleLeft),
      angleAt(hipRight, kneeRight, ankleRight),
    ]);
    const currentPhase = kneeAngle < 100 ? "down" : "up";
    const confidence = clamp(1 - Math.abs(kneeAngle - (currentPhase === "down" ? 80 : 170)) / 120, 0.2, 1);

    const now = performance.now();
    if (this.cooldownUntil > now && this.lastPhase === currentPhase) {
      return { counted: false, confidence };
    }

    if (this.lastPhase && this.lastPhase !== currentPhase) {
      const validCycle =
        (this.lastPhase === "up" && currentPhase === "down") ||
        (this.lastPhase === "down" && currentPhase === "up");
      if (validCycle) {
        this.cooldownUntil = now + 500;
        this.lastPhase = currentPhase;
        return { counted: true, confidence };
      }
    }

    this.lastPhase = currentPhase;
    return { counted: false, confidence };
  }
}

export const noOpVerifier: PoseVerifier = {
  status: "not-connected",
  async initialize() {},
  async countRep() {
    return { counted: false, confidence: 0, landmarks: null };
  },
  getLatestLandmarks() {
    return null;
  },
  destroy() {},
};
