"use client";

import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group, MathUtils, Mesh, MeshStandardMaterial } from "three";

import type {
  DogAction,
  DogComm,
  DogPose,
} from "@/components/robot-dog";

const BODY_COLOR = "#aab0b8";
const BODY_DARK = "#7e848d";
const SILVER = "#d6dade";
const ACCENT = "#34373d";
const DARK = "#1a1c20";

const EYE: Record<DogComm, { color: string; emissive: string; intensity: number }> = {
  idle: { color: "#bbf7d0", emissive: "#22c55e", intensity: 1.6 },
  listening: { color: "#fecaca", emissive: "#ef4444", intensity: 2.6 },
  thinking: { color: "#fde68a", emissive: "#f59e0b", intensity: 2.0 },
  speaking: { color: "#bae6fd", emissive: "#3b82f6", intensity: 2.2 },
};

interface Props {
  pose: DogPose;
  action: DogAction;
  comm: DogComm;
}

export function RobotDog3D({ pose, action, comm }: Props) {
  return (
    <Canvas
      shadows
      camera={{ position: [-3.6, 1.9, 4.4], fov: 36 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#dbeafe", "#0f172a", 0.4]} />
      <directionalLight
        position={[5, 7, 4]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-5, 4, -3]} intensity={0.45} color="#a78bfa" />
      <pointLight position={[0, 4, -3]} intensity={0.6} color="#38bdf8" />

      <Dog pose={pose} action={action} comm={comm} />

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.5}
        scale={9}
        blur={2.4}
        far={5}
        resolution={512}
      />

      <OrbitControls
        enablePan={false}
        minDistance={3.5}
        maxDistance={9}
        minPolarAngle={Math.PI * 0.18}
        maxPolarAngle={Math.PI * 0.5}
        target={[0, 0.9, 0]}
        enableDamping
      />
    </Canvas>
  );
}

function Dog({ pose, action, comm }: Props) {
  const root = useRef<Group>(null!);
  const body = useRef<Group>(null!);
  const head = useRef<Group>(null!);
  const eye = useRef<Mesh>(null!);
  const antennaTip = useRef<Mesh>(null!);

  const legFL = useRef<Group>(null!);
  const legFR = useRef<Group>(null!);
  const legBL = useRef<Group>(null!);
  const legBR = useRef<Group>(null!);
  const shinFL = useRef<Group>(null!);
  const shinFR = useRef<Group>(null!);
  const shinBL = useRef<Group>(null!);
  const shinBR = useRef<Group>(null!);

  const actionStart = useRef(0);
  const prevAction = useRef<DogAction>(action);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;

    if (prevAction.current !== action) {
      if (prevAction.current === "spin" && root.current) {
        root.current.rotation.y = 0;
      }
      if (prevAction.current === "dance" && root.current) {
        root.current.rotation.z = 0;
      }
      actionStart.current = t;
      prevAction.current = action;
    }
    const elapsed = t - actionStart.current;

    let bodyTiltZ = 0;
    let bodyY = 1.18;
    let rootY = 0;
    let rootRotY = root.current?.rotation.y ?? 0;
    let rootRotZ = 0;

    let aFL = -0.12, aFR = -0.12, aBL = -0.12, aBR = -0.12;
    let sFL = 0.45, sFR = 0.45, sBL = 0.45, sBR = 0.45;

    let headRotZ = 0;
    let headRotX = 0;

    // poses
    if (pose === "sit") {
      bodyTiltZ = -0.28;
      bodyY = 1.22;
      aBL = 1.0;
      aBR = 1.0;
      sBL = 1.6;
      sBR = 1.6;
      headRotZ = -0.1;
    } else if (pose === "lay") {
      rootY = -0.55;
      aFL = 1.35;
      aFR = 1.35;
      aBL = 1.35;
      aBR = 1.35;
      sFL = 0.2;
      sFR = 0.2;
      sBL = 0.2;
      sBR = 0.2;
    }

    // breathing
    bodyY += Math.sin(t * 1.4) * 0.012;

    // actions
    let useExactSpin = false;
    if (action === "walk") {
      const ω = 8;
      const swing = 0.5;
      aFL += Math.sin(t * ω) * swing;
      aBR += Math.sin(t * ω) * swing;
      aFR += Math.sin(t * ω + Math.PI) * swing;
      aBL += Math.sin(t * ω + Math.PI) * swing;
      const liftFL = Math.max(0, Math.sin(t * ω));
      const liftFR = Math.max(0, Math.sin(t * ω + Math.PI));
      sFL = 0.45 + liftFL * 0.3;
      sBR = 0.45 + liftFL * 0.3;
      sFR = 0.45 + liftFR * 0.3;
      sBL = 0.45 + liftFR * 0.3;
      bodyY += Math.abs(Math.sin(t * ω * 2)) * 0.04;
    } else if (action === "dance") {
      rootRotZ = Math.sin(t * 7) * 0.18;
      headRotZ += Math.sin(t * 7 + 1) * 0.25;
      bodyY += Math.sin(t * 14) * 0.03;
    } else if (action === "spin") {
      useExactSpin = true;
      const dur = 1.4;
      const p = MathUtils.clamp(elapsed / dur, 0, 1);
      rootRotY = easeInOutCubic(p) * Math.PI * 2;
    } else if (action === "jump") {
      const dur = 0.85;
      const p = MathUtils.clamp(elapsed / dur, 0, 1);
      const lift = Math.sin(p * Math.PI) * 0.7;
      rootY += lift;
      const tuck = lift / 0.7;
      aFL -= 0.35 * tuck;
      aFR -= 0.35 * tuck;
      aBL += 0.25 * tuck;
      aBR += 0.25 * tuck;
      sFL += 0.2 * tuck;
      sFR += 0.2 * tuck;
      sBL += 0.2 * tuck;
      sBR += 0.2 * tuck;
    } else if (action === "shake") {
      const dur = 1.0;
      const p = MathUtils.clamp(elapsed / dur, 0, 1);
      const lift =
        MathUtils.smoothstep(p, 0.05, 0.25) -
        MathUtils.smoothstep(p, 0.75, 0.95);
      const wave = Math.sin(p * Math.PI * 8);
      aFL = lift * -1.5 + (1 - lift) * -0.12;
      sFL = 0.45 + lift * (0.4 + wave * 0.35);
      bodyTiltZ -= lift * 0.05;
    } else if (action === "bark") {
      const dur = 1.4;
      const p = MathUtils.clamp(elapsed / dur, 0, 1);
      const phase = Math.sin(p * Math.PI * 5);
      headRotZ += phase * 0.35;
      bodyY += Math.abs(phase) * 0.04;
    }

    // comm overlays
    if (comm === "thinking") headRotZ += Math.sin(t * 2.5) * 0.12;
    if (comm === "listening") headRotX += Math.sin(t * 1.5) * 0.06;
    if (comm === "speaking") headRotZ += Math.sin(t * 14) * 0.04;

    // damp
    const k = 8;
    if (root.current) {
      root.current.position.y = MathUtils.damp(root.current.position.y, rootY, k, dt);
      root.current.rotation.z = MathUtils.damp(root.current.rotation.z, rootRotZ, k, dt);
      if (useExactSpin) {
        root.current.rotation.y = rootRotY;
      } else {
        root.current.rotation.y = MathUtils.damp(root.current.rotation.y, 0, k, dt);
      }
    }
    if (body.current) {
      body.current.position.y = MathUtils.damp(body.current.position.y, bodyY, k, dt);
      body.current.rotation.z = MathUtils.damp(body.current.rotation.z, bodyTiltZ, k, dt);
    }
    if (head.current) {
      head.current.rotation.z = MathUtils.damp(head.current.rotation.z, headRotZ, k, dt);
      head.current.rotation.x = MathUtils.damp(head.current.rotation.x, headRotX, k, dt);
    }

    const lk = 12;
    legFL.current && (legFL.current.rotation.z = MathUtils.damp(legFL.current.rotation.z, aFL, lk, dt));
    legFR.current && (legFR.current.rotation.z = MathUtils.damp(legFR.current.rotation.z, aFR, lk, dt));
    legBL.current && (legBL.current.rotation.z = MathUtils.damp(legBL.current.rotation.z, aBL, lk, dt));
    legBR.current && (legBR.current.rotation.z = MathUtils.damp(legBR.current.rotation.z, aBR, lk, dt));
    shinFL.current && (shinFL.current.rotation.z = MathUtils.damp(shinFL.current.rotation.z, sFL, lk, dt));
    shinFR.current && (shinFR.current.rotation.z = MathUtils.damp(shinFR.current.rotation.z, sFR, lk, dt));
    shinBL.current && (shinBL.current.rotation.z = MathUtils.damp(shinBL.current.rotation.z, sBL, lk, dt));
    shinBR.current && (shinBR.current.rotation.z = MathUtils.damp(shinBR.current.rotation.z, sBR, lk, dt));

    // eye material live update
    if (eye.current) {
      const m = eye.current.material as MeshStandardMaterial;
      const target = EYE[comm];
      m.color.set(target.color);
      m.emissive.set(target.emissive);
      const pulse =
        comm === "listening"
          ? 1 + Math.sin(t * 8) * 0.4
          : comm === "thinking"
            ? 1 + Math.sin(t * 4) * 0.25
            : 1;
      m.emissiveIntensity = MathUtils.damp(
        m.emissiveIntensity,
        target.intensity * pulse,
        10,
        dt,
      );
    }
    if (antennaTip.current) {
      const m = antennaTip.current.material as MeshStandardMaterial;
      const pulse = comm === "listening" ? 1 + Math.sin(t * 8) * 0.5 : 1;
      m.emissiveIntensity = 1.4 * pulse;
    }
  });

  return (
    <group ref={root}>
      {/* ---------- BODY ---------- */}
      <group ref={body} position={[0, 1.18, 0]}>
        <RoundedBox
          args={[2.2, 0.7, 1.0]}
          radius={0.18}
          smoothness={4}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={BODY_COLOR} metalness={0.5} roughness={0.42} />
        </RoundedBox>

        {/* battery / payload pack */}
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[1.1, 0.22, 0.78]} />
          <meshStandardMaterial color={SILVER} metalness={0.6} roughness={0.32} />
        </mesh>
        {/* heat sink fins */}
        {[-0.32, -0.18, -0.04, 0.10, 0.24].map((x) => (
          <mesh key={x} position={[x, 0.6, 0]} castShadow>
            <boxGeometry args={[0.03, 0.06, 0.5]} />
            <meshStandardMaterial color={ACCENT} metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        {/* clear top window */}
        <mesh position={[0.36, 0.575, 0]}>
          <boxGeometry args={[0.32, 0.04, 0.55]} />
          <meshStandardMaterial
            color="#dbeafe"
            metalness={0.7}
            roughness={0.05}
            transparent
            opacity={0.55}
          />
        </mesh>

        {/* shoulder housings — front */}
        <mesh position={[-0.85, -0.1, 0.45]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.18, 32]} />
          <meshStandardMaterial color={SILVER} metalness={0.55} roughness={0.32} />
        </mesh>
        <mesh position={[-0.85, -0.1, -0.45]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.18, 32]} />
          <meshStandardMaterial color={SILVER} metalness={0.55} roughness={0.32} />
        </mesh>
        {/* shoulder housings — rear */}
        <mesh position={[0.85, -0.1, 0.45]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.18, 32]} />
          <meshStandardMaterial color={SILVER} metalness={0.55} roughness={0.32} />
        </mesh>
        <mesh position={[0.85, -0.1, -0.45]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.18, 32]} />
          <meshStandardMaterial color={SILVER} metalness={0.55} roughness={0.32} />
        </mesh>

        {/* side battery indicators (status LEDs) */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0.55 + i * 0.07, -0.05, 0.51]}>
            <boxGeometry args={[0.045, 0.045, 0.02]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#22c55e"
              emissiveIntensity={1.6}
              toneMapped={false}
            />
          </mesh>
        ))}
        {/* side ports */}
        <mesh position={[0.78, -0.07, 0.515]}>
          <boxGeometry args={[0.08, 0.14, 0.02]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
        <mesh position={[0.92, -0.07, 0.515]}>
          <boxGeometry args={[0.08, 0.14, 0.02]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
        {/* underbelly */}
        <mesh position={[0, -0.36, 0]}>
          <boxGeometry args={[1.7, 0.03, 0.85]} />
          <meshStandardMaterial color={DARK} metalness={0.6} roughness={0.5} />
        </mesh>
      </group>

      {/* ---------- HEAD ---------- */}
      <group ref={head} position={[-1.32, 1.18, 0]}>
        <RoundedBox
          args={[0.85, 0.62, 0.85]}
          radius={0.13}
          smoothness={4}
          castShadow
        >
          <meshStandardMaterial color={BODY_COLOR} metalness={0.5} roughness={0.4} />
        </RoundedBox>
        {/* lidar dome on top */}
        <mesh position={[0.05, 0.36, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.15, 0.12, 32]} />
          <meshStandardMaterial color={ACCENT} metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0.05, 0.45, 0]}>
          <sphereGeometry
            args={[0.13, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshStandardMaterial
            color="#cbd5e1"
            metalness={0.3}
            roughness={0.05}
            transparent
            opacity={0.6}
          />
        </mesh>
        {/* camera lens (front) */}
        <mesh position={[-0.41, -0.04, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.12, 32]} />
          <meshStandardMaterial color={ACCENT} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[-0.48, -0.04, 0]} ref={eye}>
          <sphereGeometry args={[0.085, 32, 32]} />
          <meshStandardMaterial
            color={EYE[comm].color}
            emissive={EYE[comm].emissive}
            emissiveIntensity={EYE[comm].intensity}
            toneMapped={false}
            roughness={0.15}
          />
        </mesh>
        {/* depth-cam bracket below */}
        <mesh position={[-0.4, -0.22, 0]} castShadow>
          <boxGeometry args={[0.14, 0.1, 0.5]} />
          <meshStandardMaterial color={DARK} metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[-0.42, -0.22, -0.13]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.2} />
        </mesh>
        <mesh position={[-0.42, -0.22, 0.13]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.2} />
        </mesh>
        {/* side vents */}
        <mesh position={[0.2, 0, 0.43]}>
          <boxGeometry args={[0.18, 0.18, 0.005]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
        <mesh position={[0.2, 0, -0.43]}>
          <boxGeometry args={[0.18, 0.18, 0.005]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
      </group>

      {/* ---------- LEGS ---------- */}
      <Leg
        legRef={legFL}
        shinRef={shinFL}
        position={[-0.85, 1.05, -0.55]}
        mirrorZ={false}
      />
      <Leg
        legRef={legFR}
        shinRef={shinFR}
        position={[-0.85, 1.05, 0.55]}
        mirrorZ
      />
      <Leg
        legRef={legBL}
        shinRef={shinBL}
        position={[0.85, 1.05, -0.55]}
        mirrorZ={false}
      />
      <Leg
        legRef={legBR}
        shinRef={shinBR}
        position={[0.85, 1.05, 0.55]}
        mirrorZ
      />

      {/* antenna with red blinker — separate from head so it doesn't tilt as much */}
      <group position={[-1.05, 1.55, 0.3]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.22, 12]} />
          <meshStandardMaterial color={ACCENT} />
        </mesh>
        <mesh ref={antennaTip} position={[0, 0.14, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial
            color="#fca5a5"
            emissive="#ef4444"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

function Leg({
  legRef,
  shinRef,
  position,
  mirrorZ,
}: {
  legRef: React.RefObject<Group | null>;
  shinRef: React.RefObject<Group | null>;
  position: [number, number, number];
  mirrorZ: boolean;
}) {
  const sign = mirrorZ ? -1 : 1;
  return (
    <group position={position}>
      {/* hip cap */}
      <mesh castShadow>
        <sphereGeometry args={[0.18, 28, 28]} />
        <meshStandardMaterial color={SILVER} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* upper leg group */}
      <group ref={legRef}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <cylinderGeometry args={[0.085, 0.075, 0.6, 18]} />
          <meshStandardMaterial color={BODY_COLOR} metalness={0.45} roughness={0.42} />
        </mesh>
        {/* hip-side decorative ring */}
        <mesh position={[0, -0.05, sign * 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.04, 24]} />
          <meshStandardMaterial color={ACCENT} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* knee */}
        <mesh position={[0, -0.6, 0]} castShadow>
          <sphereGeometry args={[0.095, 24, 24]} />
          <meshStandardMaterial color={SILVER} metalness={0.55} roughness={0.3} />
        </mesh>
        {/* shin group — pivots at knee */}
        <group ref={shinRef} position={[0, -0.6, 0]}>
          <mesh position={[0, -0.32, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.045, 0.65, 16]} />
            <meshStandardMaterial color={BODY_DARK} metalness={0.4} roughness={0.45} />
          </mesh>
          {/* foot */}
          <mesh position={[0, -0.66, 0]} castShadow>
            <sphereGeometry args={[0.085, 20, 20]} />
            <meshStandardMaterial color={DARK} metalness={0.3} roughness={0.6} />
          </mesh>
          {/* foot pad */}
          <mesh position={[0, -0.71, 0]}>
            <cylinderGeometry args={[0.08, 0.06, 0.04, 16]} />
            <meshStandardMaterial color="#0a0c10" roughness={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
