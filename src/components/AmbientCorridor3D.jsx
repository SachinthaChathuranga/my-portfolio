import React, { Suspense, lazy, useEffect, useState } from "react";

// three.js + R3F are loaded in their own chunk so the first paint stays fast
const Scene3D = lazy(() => import("./Scene3D"));

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

/**
 * Fixed atmospheric backdrop: soft portrait-palette light pools, a real-time
 * WebGL glass & neon corridor scene, and a cinematic vignette + grain.
 * Pass `enabled={false}` to unmount the WebGL scene (e.g. while a game runs).
 */
export default function AmbientCorridor3D({ enabled = true }) {
  const [webgl, setWebgl] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ok = supportsWebGL();
    setWebgl(ok);
    // warm the 3D chunk while the preloader is still on screen
    if (ok) import("./Scene3D");
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Ambient light pools */}
      <div
        className="absolute -left-[18%] top-[-12%] h-[70vh] w-[52vw] rounded-full opacity-[0.22] blur-[150px] animate-pulse-glow"
        style={{ background: "radial-gradient(circle, #F012A8 0%, transparent 70%)" }}
      />
      <div
        className="absolute -right-[16%] top-[10%] h-[64vh] w-[48vw] rounded-full opacity-[0.2] blur-[150px] animate-pulse-glow"
        style={{
          background: "radial-gradient(circle, #00A3FF 0%, transparent 70%)",
          animationDelay: "1.4s",
        }}
      />
      <div
        className="absolute bottom-[-20%] left-[28%] h-[48vh] w-[44vw] rounded-full opacity-[0.14] blur-[150px]"
        style={{ background: "radial-gradient(circle, #FF8A1F 0%, transparent 72%)" }}
      />

      {enabled && webgl && (
        <div
          className="absolute inset-0 transition-opacity duration-[1600ms] ease-out"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <Suspense fallback={null}>
            <SceneMount onReady={() => setVisible(true)} />
          </Suspense>
        </div>
      )}

      {/* Cinematic vignette keeps text crisp over the 3D scene */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 85% at 50% 45%, transparent 35%, rgba(6,4,13,0.55) 75%, rgba(6,4,13,0.9) 100%)",
        }}
      />
      <div className="noise-overlay absolute inset-0 opacity-20" />
    </div>
  );
}

function SceneMount({ onReady }) {
  useEffect(() => {
    // fade in one frame after the chunk mounts so the first WebGL frame is drawn
    const id = requestAnimationFrame(() => requestAnimationFrame(onReady));
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return <Scene3D />;
}
