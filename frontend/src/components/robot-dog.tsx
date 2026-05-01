"use client";

import { cn } from "@/lib/utils";

export type DogPose = "stand" | "sit" | "lay";
export type DogAction =
  | "idle"
  | "walk"
  | "bark"
  | "dance"
  | "spin"
  | "shake"
  | "jump";
export type DogComm = "idle" | "listening" | "thinking" | "speaking";

const POSE_LABEL: Record<DogPose, string> = {
  stand: "기립",
  sit: "앉기",
  lay: "엎드리기",
};

const ACTION_LABEL: Record<DogAction, string> = {
  idle: "대기",
  walk: "걷는 중",
  bark: "짖는 중",
  dance: "춤추는 중",
  spin: "회전 중",
  shake: "악수 중",
  jump: "점프!",
};

const COMM_LABEL: Record<DogComm, string> = {
  idle: "대기",
  listening: "듣는 중",
  thinking: "생각 중",
  speaking: "응답 중",
};

const COMM_TONE: Record<DogComm, string> = {
  idle: "bg-emerald-500",
  listening: "bg-rose-500",
  thinking: "bg-amber-500",
  speaking: "bg-sky-500",
};

export function RobotDog({
  pose = "stand",
  action = "idle",
  comm = "idle",
  className,
}: {
  pose?: DogPose;
  action?: DogAction;
  comm?: DogComm;
  className?: string;
}) {
  const label =
    comm !== "idle"
      ? COMM_LABEL[comm]
      : action !== "idle"
        ? ACTION_LABEL[action]
        : POSE_LABEL[pose];

  return (
    <div className={cn("dog-stage", className)}>
      <div className="dog-floor" aria-hidden />
      <div className="dog-grid" aria-hidden />

      <div className="dog-status">
        <span className={cn("dog-status-dot", COMM_TONE[comm])} />
        <span className="dog-status-text">{label}</span>
        <span className="dog-status-model">Unitree Go2 EDU</span>
      </div>

      <div
        className="dog"
        data-pose={pose}
        data-action={action}
        data-comm={comm}
        aria-label={`Robot dog: ${label}`}
      >
        {/* far-side legs (depth) */}
        <div className="dog-leg dog-leg-bf">
          <div className="dog-shin">
            <div className="dog-foot" />
          </div>
        </div>
        <div className="dog-leg dog-leg-ff">
          <div className="dog-shin">
            <div className="dog-foot" />
          </div>
        </div>

        {/* body */}
        <div className="dog-body">
          <div className="dog-body-pack" />
          <div className="dog-body-vent" />
          <div className="dog-body-id">02</div>
        </div>

        {/* head */}
        <div className="dog-head">
          <div className="dog-cam">
            <div className="dog-eye" />
          </div>
          <div className="dog-antenna">
            <span />
          </div>
          <div className="dog-mouth" />
          <div className="dog-head-line" />
        </div>

        {/* near-side legs (front) */}
        <div className="dog-leg dog-leg-bn">
          <div className="dog-shin">
            <div className="dog-foot" />
          </div>
        </div>
        <div className="dog-leg dog-leg-fn">
          <div className="dog-shin">
            <div className="dog-foot" />
          </div>
        </div>

        <div className="dog-shadow" aria-hidden />
      </div>
    </div>
  );
}
