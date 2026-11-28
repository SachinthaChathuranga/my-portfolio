import React, { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Float,
  Lightformer,
  Line,
  RoundedBox,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";

/**
 * Real-time WebGL backdrop: a neon corridor of floating frames you glide
 * through as you scroll, with iridescent glass sculptures lit by the
 * portrait palette (magenta left, cyan right, warm amber below).
 */

const MAGENTA = new THREE.Color("#F012A8");
const AMBER = new THREE.Color("#FF8A1F");
const CYAN = new THREE.Color("#00D4FF");

const FRAME_COUNT = 11;
const FRAME_SPACING = 3.6;
const FRAME_W = 13;
const FRAME_H = 7.4;

// Shared scroll state (written by a passive listener, read inside useFrame)
const scrollState = { y: 0, smooth: 0, velocity: 0 };

function roundedRectPoints(w, h, r, segments = 10) {
  const pts = [];
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const corners = [
    [hw, hh, 0],
    [-hw, hh, Math.PI / 2],
    [-hw, -hh, Math.PI],
    [hw, -hh, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= segments; i++) {
      const a = start + (i / segments) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0]);
    }
  }
  pts.push(pts[0]);
  return pts;
}

function NeonCorridor({ reduced }) {
  const groupRef = useRef();
  const frameRefs = useRef([]);

  const { points, colors } = useMemo(() => {
    const pts = roundedRectPoints(FRAME_W, FRAME_H, 0.9);
    const tmp = new THREE.Color();
    const cols = pts.map(([x, y]) => {
      const t = (x + FRAME_W / 2) / FRAME_W;
      if (t < 0.5) tmp.copy(MAGENTA).lerp(AMBER, (t / 0.5) * 0.55);
      else tmp.copy(AMBER).lerp(CYAN, 0.45 + ((t - 0.5) / 0.5) * 0.55);
      // lift the top edge slightly toward white for a soft specular feel
      tmp.lerp(new THREE.Color("#ffffff"), Math.max(0, y / FRAME_H) * 0.25);
      return [tmp.r, tmp.g, tmp.b];
    });
    return { points: pts, colors: cols };
  }, []);

  useFrame((state) => {
    const t = reduced ? 0 : state.clock.elapsedTime;
    const travel = t * 0.55 + scrollState.smooth * 0.0045;
    const depth = FRAME_COUNT * FRAME_SPACING;

    frameRefs.current.forEach((line, i) => {
      if (!line) return;
      const z = 3 - (((i * FRAME_SPACING - travel) % depth) + depth) % depth;
      line.position.z = z;
      // fade in from the far end, fade out right before passing the camera
      const far = THREE.MathUtils.smoothstep(z, -depth + 3, -depth * 0.55);
      const near = 1 - THREE.MathUtils.smoothstep(z, -1.5, 3);
      line.material.opacity = far * near * 0.42;
      line.rotation.z = Math.sin(t * 0.15 + i * 0.4) * 0.025;
    });

    if (groupRef.current) {
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        scrollState.velocity * -0.0009,
        0.06
      );
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: FRAME_COUNT }, (_, i) => (
        <Line
          key={i}
          ref={(el) => (frameRefs.current[i] = el)}
          points={points}
          vertexColors={colors}
          lineWidth={1.4}
          transparent
          opacity={0.4}
          depthWrite={false}
          toneMapped={false}
        />
      ))}
    </group>
  );
}

function GlassMaterial({ tint = "#ffffff" }) {
  return (
    <meshPhysicalMaterial
      color={tint}
      transmission={1}
      thickness={1.4}
      roughness={0.06}
      ior={1.45}
      iridescence={1}
      iridescenceIOR={1.3}
      iridescenceThicknessRange={[120, 480]}
      clearcoat={1}
      clearcoatRoughness={0.05}
      envMapIntensity={0.95}
      attenuationColor="#d9c8ff"
      attenuationDistance={2.5}
    />
  );
}

function GlassSculptures({ reduced }) {
  const groupRef = useRef();
  const { viewport } = useThree();
  // Squeeze sculptures toward center on narrow screens so they stay in frame
  const spread = Math.max(0.55, Math.min(1, viewport.aspect / 1.55));
  const sizeScale = Math.max(0.55, Math.min(1, viewport.aspect / 1.4));

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const vh = window.innerHeight || 1;
    const progress = scrollState.smooth / vh;
    const g = groupRef.current;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, Math.sin(progress * 0.5) * 0.22, 3, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, Math.sin(progress * 0.6) * 0.8, 3, delta);
    if (!reduced) g.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
  });

  const floatProps = reduced
    ? { speed: 0, rotationIntensity: 0, floatIntensity: 0 }
    : { speed: 1.2, rotationIntensity: 0.9, floatIntensity: 1.1 };

  return (
    <group ref={groupRef} scale={sizeScale}>
      <Float {...floatProps} position={[-5.4 * spread, 1.9, -5]}>
        <mesh rotation={[0.4, 0.6, 0]}>
          <torusKnotGeometry args={[0.85, 0.27, 220, 36]} />
          <GlassMaterial tint="#ffe6f6" />
        </mesh>
      </Float>

      <Float {...floatProps} speed={floatProps.speed * 0.8} position={[5.6 * spread, -2.1, -4.6]}>
        <mesh rotation={[0.2, 0.3, 0.5]}>
          <icosahedronGeometry args={[1.05, 0]} />
          <GlassMaterial tint="#e3f8ff" />
        </mesh>
      </Float>

      <Float {...floatProps} speed={floatProps.speed * 0.6} position={[4.8 * spread, 3.1, -8.5]}>
        <mesh rotation={[1.1, 0.2, 0]}>
          <torusGeometry args={[0.9, 0.22, 48, 120]} />
          <GlassMaterial tint="#fff1df" />
        </mesh>
      </Float>

      <Float {...floatProps} speed={floatProps.speed * 0.9} position={[-4.6 * spread, -2.9, -7.5]}>
        <mesh>
          <octahedronGeometry args={[0.85, 0]} />
          <GlassMaterial tint="#f3e8ff" />
        </mesh>
      </Float>

      <Float {...floatProps} speed={floatProps.speed * 0.7} position={[1.2 * spread, -4, -11.5]}>
        <RoundedBox args={[1.3, 1.3, 1.3]} radius={0.22} smoothness={5} rotation={[0.6, 0.8, 0]}>
          <GlassMaterial tint="#e8f4ff" />
        </RoundedBox>
      </Float>

      <Float {...floatProps} speed={floatProps.speed * 1.1} position={[-2.2 * spread, 3.8, -12.5]}>
        <mesh>
          <sphereGeometry args={[0.55, 48, 48]} />
          <GlassMaterial tint="#ffffff" />
        </mesh>
      </Float>
    </group>
  );
}

function CameraRig({ reduced }) {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return undefined;
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced]);

  useFrame((state, delta) => {
    // ease the shared scroll value and track velocity for subtle banking
    const prev = scrollState.smooth;
    scrollState.smooth = THREE.MathUtils.damp(scrollState.smooth, scrollState.y, 4, delta);
    scrollState.velocity = (scrollState.smooth - prev) / Math.max(delta, 0.001) / 60;

    const cam = state.camera;
    cam.position.x = THREE.MathUtils.damp(cam.position.x, pointer.current.x * 0.7, 2.5, delta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, -pointer.current.y * 0.45, 2.5, delta);
    cam.lookAt(0, 0, -6);
  });

  return null;
}

function StudioLights() {
  return (
    <Environment resolution={256} frames={1}>
      {/* magenta wall, left */}
      <Lightformer form="rect" intensity={3.2} color="#F012A8" position={[-6, 0, 2]} rotation-y={Math.PI / 2} scale={[10, 6, 1]} />
      {/* cyan rim, right */}
      <Lightformer form="rect" intensity={3.2} color="#00D4FF" position={[6, 1, 1]} rotation-y={-Math.PI / 2} scale={[10, 5, 1]} />
      {/* warm amber floor bounce */}
      <Lightformer form="rect" intensity={2} color="#FF8A1F" position={[0, -5, 0]} rotation-x={-Math.PI / 2} scale={[12, 4, 1]} />
      {/* soft key ring from above */}
      <Lightformer form="ring" intensity={1.6} color="#ffffff" position={[0, 5, 3]} rotation-x={Math.PI / 2} scale={3} />
      <Lightformer form="rect" intensity={1.2} color="#9E1EFF" position={[0, 0, -8]} scale={[14, 8, 1]} />
    </Environment>
  );
}

export default function Scene3D() {
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const isSmall = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    const onScroll = () => {
      scrollState.y = window.scrollY;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Canvas
      dpr={[1, isSmall ? 1.3 : 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 6], fov: 48, near: 0.1, far: 60 }}
      frameloop={reduced ? "demand" : "always"}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <fog attach="fog" args={["#06040D", 7, 34]} />
      <StudioLights />
      <CameraRig reduced={reduced} />
      <NeonCorridor reduced={reduced} />
      <GlassSculptures reduced={reduced} />
      <Sparkles
        count={isSmall ? 50 : 110}
        scale={[18, 11, 22]}
        position={[0, 0, -7]}
        size={2.4}
        speed={reduced ? 0 : 0.35}
        opacity={0.7}
        color="#FF8DE0"
      />
      <Sparkles
        count={isSmall ? 40 : 90}
        scale={[18, 11, 22]}
        position={[0, 0, -7]}
        size={2}
        speed={reduced ? 0 : 0.3}
        opacity={0.6}
        color="#7EE8FF"
      />
    </Canvas>
  );
}
