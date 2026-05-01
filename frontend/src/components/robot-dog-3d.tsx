"use client";

import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
} from "three";

import type {
  DogAction,
  DogComm,
  DogPose,
} from "@/components/robot-dog";

// Unitree Go2 EDU palette
const BODY = "#9aa0a8";
const BODY_LIT = "#bcc1c8";
const SILVER = "#cdd1d8";
const SILVER_HI = "#e6e9ee";
const ACCENT = "#3a3d44";
const DARK = "#1a1c20";
const DEEP = "#08090c";

const EYE: Record<DogComm, { color: string; emissive: string; intensity: number }> = {
  idle: { color: "#bbf7d0", emissive: "#22c55e", intensity: 1.4 },
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
      camera={{ position: [-3.4, 1.6, 4.0], fov: 36 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#dbeafe", "#0f172a", 0.4]} />
      <directionalLight
        position={[5, 8, 4]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-5, 4, -3]} intensity={0.4} color="#a78bfa" />
      <pointLight position={[0, 4, -3]} intensity={0.5} color="#38bdf8" />

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
        minDistance={3}
        maxDistance={9}
        minPolarAngle={Math.PI * 0.16}
        maxPolarAngle={Math.PI * 0.5}
        target={[0, 0.85, 0]}
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
      if (prevAction.current === "spin" && root.current) root.current.rotation.y = 0;
      if (prevAction.current === "dance" && root.current) root.current.rotation.z = 0;
      actionStart.current = t;
      prevAction.current = action;
    }
    const elapsed = t - actionStart.current;

    let bodyTiltZ = 0;
    let bodyY = 1.08;
    let rootY = 0;
    let rootRotZ = 0;
    let useExactSpin = false;

    // default leg angles to match Go2 ready stance
    let aFL = -0.08, aFR = -0.08, aBL = 0.1, aBR = 0.1;
    let sFL = 0.18, sFR = 0.18, sBL = -0.22, sBR = -0.22;

    let headRotZ = 0;
    let headRotX = 0;

    // poses
    if (pose === "sit") {
      bodyTiltZ = -0.22;
      bodyY = 1.13;
      // rear: thigh rotates back/up, shin folds forward+down (under body)
      aBL = 0.7; aBR = 0.7;
      sBL = -1.7; sBR = -1.7;
      headRotZ = -0.08;
    } else if (pose === "lay") {
      rootY = -0.6;
      aFL = 1.0; aFR = 1.0; aBL = -0.7; aBR = -0.7;
      sFL = -0.7; sFR = -0.7; sBL = 0.7; sBR = 0.7;
    }

    // breathing
    bodyY += Math.sin(t * 1.4) * 0.012;

    // actions
    if (action === "walk") {
      const ω = 8;
      const swing = 0.5;
      aFL += Math.sin(t * ω) * swing;
      aBR += Math.sin(t * ω) * swing;
      aFR += Math.sin(t * ω + Math.PI) * swing;
      aBL += Math.sin(t * ω + Math.PI) * swing;
      const liftA = Math.max(0, Math.sin(t * ω));
      const liftB = Math.max(0, Math.sin(t * ω + Math.PI));
      sFL += liftA * 0.3;
      sBR -= liftA * 0.3;
      sFR += liftB * 0.3;
      sBL -= liftB * 0.3;
      bodyY += Math.abs(Math.sin(t * ω * 2)) * 0.04;
    } else if (action === "dance") {
      rootRotZ = Math.sin(t * 7) * 0.15;
      headRotZ += Math.sin(t * 7 + 1) * 0.22;
      bodyY += Math.sin(t * 14) * 0.025;
    } else if (action === "spin") {
      useExactSpin = true;
      const dur = 1.4;
      const p = MathUtils.clamp(elapsed / dur, 0, 1);
      if (root.current) root.current.rotation.y = easeInOutCubic(p) * Math.PI * 2;
    } else if (action === "jump") {
      const dur = 0.85;
      const p = MathUtils.clamp(elapsed / dur, 0, 1);
      const lift = Math.sin(p * Math.PI) * 0.7;
      rootY += lift;
      const tuck = lift / 0.7;
      sFL += 0.55 * tuck; sFR += 0.55 * tuck;
      sBL -= 0.55 * tuck; sBR -= 0.55 * tuck;
      aFL -= 0.25 * tuck; aFR -= 0.25 * tuck;
      aBL += 0.25 * tuck; aBR += 0.25 * tuck;
    } else if (action === "shake") {
      const dur = 1.0;
      const p = MathUtils.clamp(elapsed / dur, 0, 1);
      const lift =
        MathUtils.smoothstep(p, 0.05, 0.25) -
        MathUtils.smoothstep(p, 0.75, 0.95);
      const wave = Math.sin(p * Math.PI * 8);
      aFL = lift * -1.5 + (1 - lift) * -0.08;
      sFL = 0.18 + lift * (0.6 + wave * 0.3);
      bodyTiltZ -= lift * 0.06;
    } else if (action === "bark") {
      const dur = 1.4;
      const p = MathUtils.clamp(elapsed / dur, 0, 1);
      const phase = Math.sin(p * Math.PI * 5);
      headRotZ += phase * 0.32;
      bodyY += Math.abs(phase) * 0.04;
    }

    // comm overlays
    if (comm === "thinking") headRotZ += Math.sin(t * 2.5) * 0.1;
    if (comm === "listening") headRotX += Math.sin(t * 1.5) * 0.06;
    if (comm === "speaking") headRotZ += Math.sin(t * 12) * 0.04;

    const k = 8;
    if (root.current) {
      root.current.position.y = MathUtils.damp(root.current.position.y, rootY, k, dt);
      root.current.rotation.z = MathUtils.damp(root.current.rotation.z, rootRotZ, k, dt);
      if (!useExactSpin) {
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
  });

  return (
    <group ref={root}>
      {/* ============= BODY ============= */}
      <group ref={body} position={[0, 1.08, 0]}>
        {/* main capsule body */}
        <RoundedBox
          args={[2.0, 0.55, 0.78]}
          radius={0.27}
          smoothness={6}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={BODY} metalness={0.42} roughness={0.42} />
        </RoundedBox>
        {/* slight dorsal highlight strip (lighter) */}
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[1.5, 0.04, 0.5]} />
          <meshStandardMaterial color={BODY_LIT} metalness={0.4} roughness={0.4} />
        </mesh>
        {/* underbelly access panel (dark) */}
        <mesh position={[0, -0.31, 0]}>
          <boxGeometry args={[1.5, 0.02, 0.55]} />
          <meshStandardMaterial color={DARK} roughness={0.7} />
        </mesh>

        {/* ===== PAYLOAD PACK (top) ===== */}
        <group position={[-0.05, 0.34, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.95, 0.18, 0.62]} />
            <meshStandardMaterial color={BODY_LIT} metalness={0.4} roughness={0.42} />
          </mesh>
          {/* heat fins / handle ridges */}
          {[-0.35, -0.22, -0.09, 0.04, 0.16].map((x, i) => (
            <mesh key={i} position={[x, 0.13, 0]} castShadow>
              <boxGeometry args={[0.04, 0.06, 0.45]} />
              <meshStandardMaterial color={ACCENT} metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
          {/* clear acrylic top */}
          <mesh position={[0.32, 0.115, 0]}>
            <boxGeometry args={[0.28, 0.04, 0.52]} />
            <meshStandardMaterial
              color="#cbd5e1"
              roughness={0.05}
              metalness={0.9}
              transparent
              opacity={0.5}
            />
          </mesh>
        </group>

        {/* ===== HIP MOTOR HOUSINGS at 4 corners ===== */}
        <ShoulderHousing position={[-0.78, -0.05, 0.42]} />
        <ShoulderHousing position={[-0.78, -0.05, -0.42]} mirrored />
        <ShoulderHousing position={[0.78, -0.05, 0.42]} />
        <ShoulderHousing position={[0.78, -0.05, -0.42]} mirrored />

        {/* side ports & status LEDs (on +Z side facing camera) */}
        <mesh position={[0.15, -0.02, 0.4]}>
          <boxGeometry args={[0.18, 0.18, 0.005]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0.05 + i * 0.05, -0.02, 0.404]}>
            <boxGeometry args={[0.035, 0.025, 0.01]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#22c55e"
              emissiveIntensity={1.6}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* ============= HEAD MODULE (child of body) ============= */}
        <group ref={head} position={[-0.95, -0.02, 0]}>
          {/* main head shell */}
          <RoundedBox
            args={[0.55, 0.5, 0.62]}
            radius={0.16}
            smoothness={6}
            castShadow
          >
            <meshStandardMaterial color={BODY} metalness={0.42} roughness={0.42} />
          </RoundedBox>
          {/* highlight band */}
          <mesh position={[0.05, 0.12, 0]}>
            <boxGeometry args={[0.4, 0.04, 0.42]} />
            <meshStandardMaterial color={BODY_LIT} metalness={0.4} roughness={0.4} />
          </mesh>

          {/* black face plate (front) */}
          <RoundedBox
            args={[0.1, 0.42, 0.5]}
            radius={0.07}
            smoothness={4}
            position={[-0.27, -0.04, 0]}
            castShadow
          >
            <meshStandardMaterial color={DEEP} metalness={0.3} roughness={0.5} />
          </RoundedBox>

          {/* upper black sensor band (depth/thermal) */}
          <mesh position={[-0.31, 0.12, 0]}>
            <boxGeometry args={[0.04, 0.08, 0.42]} />
            <meshStandardMaterial color={DEEP} roughness={0.95} />
          </mesh>

          {/* main camera housing — silver cylinder */}
          <mesh
            position={[-0.3, -0.02, 0]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.11, 0.11, 0.08, 32]} />
            <meshStandardMaterial color={SILVER} metalness={0.55} roughness={0.3} />
          </mesh>
          {/* camera bezel (darker) */}
          <mesh position={[-0.34, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.085, 0.085, 0.04, 32]} />
            <meshStandardMaterial color={ACCENT} metalness={0.7} roughness={0.3} />
          </mesh>
          {/* camera lens (eye) */}
          <mesh position={[-0.36, -0.02, 0]} ref={eye}>
            <sphereGeometry args={[0.062, 32, 32]} />
            <meshStandardMaterial
              color={EYE[comm].color}
              emissive={EYE[comm].emissive}
              emissiveIntensity={EYE[comm].intensity}
              toneMapped={false}
              roughness={0.1}
              metalness={0.2}
            />
          </mesh>

          {/* lower stereo / mic grille slot */}
          <mesh position={[-0.31, -0.18, 0]}>
            <boxGeometry args={[0.04, 0.1, 0.46]} />
            <meshStandardMaterial color={DEEP} roughness={0.95} />
          </mesh>
          {/* twin stereo dots */}
          <mesh position={[-0.34, -0.18, -0.13]}>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.3} />
          </mesh>
          <mesh position={[-0.34, -0.18, 0.13]}>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.3} />
          </mesh>

          {/* ear vents on sides */}
          <mesh position={[0.08, 0.0, 0.32]}>
            <boxGeometry args={[0.18, 0.16, 0.005]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          <mesh position={[0.08, 0.0, -0.32]}>
            <boxGeometry args={[0.18, 0.16, 0.005]} />
            <meshStandardMaterial color={DARK} />
          </mesh>

          {/* small "Unitree" decal hint (light strip) */}
          <mesh position={[-0.18, -0.05, 0.32]}>
            <boxGeometry args={[0.16, 0.025, 0.005]} />
            <meshStandardMaterial color="#e8ebf0" roughness={0.6} />
          </mesh>
        </group>
      </group>

      {/* ============= LEGS (root level for stable pivots) ============= */}
      {/* front-left */}
      <CurvedLeg
        legRef={legFL}
        shinRef={shinFL}
        position={[-0.78, 1.03, 0.42]}
        front
      />
      {/* front-right */}
      <CurvedLeg
        legRef={legFR}
        shinRef={shinFR}
        position={[-0.78, 1.03, -0.42]}
        front
        mirrored
      />
      {/* back-left */}
      <CurvedLeg
        legRef={legBL}
        shinRef={shinBL}
        position={[0.78, 1.03, 0.42]}
      />
      {/* back-right */}
      <CurvedLeg
        legRef={legBR}
        shinRef={shinBR}
        position={[0.78, 1.03, -0.42]}
        mirrored
      />
    </group>
  );
}

function ShoulderHousing({
  position,
  mirrored,
}: {
  position: [number, number, number];
  mirrored?: boolean;
}) {
  const sign = mirrored ? -1 : 1;
  return (
    <group position={position}>
      {/* outer silver disc */}
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.16, 36]} />
        <meshStandardMaterial color={SILVER} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* recessed inner ring (dark) */}
      <mesh position={[0, 0, sign * 0.085]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 36]} />
        <meshStandardMaterial color={ACCENT} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* rim highlight */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.215, 0.012, 12, 36]} />
        <meshStandardMaterial color={SILVER_HI} metalness={0.7} roughness={0.2} />
      </mesh>
      {/* center bolt */}
      <mesh position={[0, 0, sign * 0.095]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.015, 16]} />
        <meshStandardMaterial color={DARK} metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

/**
 * Curved Unitree-style leg.
 * - front: front legs vs rear legs use slightly different curve directions
 * - mirrored: flip lateral side (Z axis) for matching leg pairs
 */
function CurvedLeg({
  legRef,
  shinRef,
  position,
  front = false,
  mirrored = false,
}: {
  legRef: React.RefObject<Group | null>;
  shinRef: React.RefObject<Group | null>;
  position: [number, number, number];
  front?: boolean;
  mirrored?: boolean;
}) {
  // dir: thigh curves slightly toward this X direction
  // front leg: knee tilts forward (-X), rear leg: knee tilts backward (+X)
  const thighDir = front ? -1 : 1;

  // build curved tube geometries
  const thighGeo = useMemo(() => {
    const curve = new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      new Vector3(thighDir * 0.04, -0.18, 0),
      new Vector3(thighDir * 0.1, -0.4, 0),
    ]);
    return new TubeGeometry(curve, 28, 0.07, 14, false);
  }, [thighDir]);

  const shinGeo = useMemo(() => {
    // shin curves opposite (s-curve): from knee → out → back to vertical foot
    const sd = -thighDir;
    const curve = new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      new Vector3(sd * 0.07, -0.22, 0),
      new Vector3(sd * 0.04, -0.45, 0),
      new Vector3(0, -0.6, 0),
    ]);
    return new TubeGeometry(curve, 32, 0.045, 14, false);
  }, [thighDir]);

  const kneeOffset: [number, number, number] = [thighDir * 0.1, -0.4, 0];

  return (
    <group position={position}>
      {/* upper leg pivot at hip */}
      <group ref={legRef}>
        {/* hip-side decorative collar (where leg meets shoulder housing) */}
        <mesh position={[0, -0.04, mirrored ? -0.08 : 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.06, 24]} />
          <meshStandardMaterial color={ACCENT} metalness={0.7} roughness={0.3} />
        </mesh>

        {/* curved thigh */}
        <mesh castShadow geometry={thighGeo}>
          <meshStandardMaterial color={BODY} metalness={0.42} roughness={0.42} />
        </mesh>

        {/* knee + shin, pivots at end of thigh */}
        <group position={kneeOffset}>
          {/* knee joint (silver puck oriented laterally) */}
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.085, 0.085, 0.11, 24]} />
            <meshStandardMaterial color={SILVER} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.082, 0.008, 10, 24]} />
            <meshStandardMaterial color={SILVER_HI} metalness={0.7} roughness={0.2} />
          </mesh>

          {/* shin pivots at knee */}
          <group ref={shinRef}>
            <mesh castShadow geometry={shinGeo}>
              <meshStandardMaterial color={BODY_LIT} metalness={0.42} roughness={0.42} />
            </mesh>
            {/* foot at end of shin */}
            <group position={[0, -0.6, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.07, 20, 20]} />
                <meshStandardMaterial color={DARK} metalness={0.2} roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.04, 0]}>
                <cylinderGeometry args={[0.075, 0.06, 0.04, 16]} />
                <meshStandardMaterial color={DEEP} roughness={0.95} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
