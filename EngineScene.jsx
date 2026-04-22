import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, PerspectiveCamera, ContactShadows } from "@react-three/drei";
import { ReciprocatingAssembly } from "./ReciprocatingAssembly";

function Rig({ rpm, load, exploded, filmStress, failure }) {
  const tone = failure ? "#fecaca" : "#e2e8f0";
  return (
    <>
      <color attach="background" args={["#070b12"]} />
      <ambientLight intensity={0.35} />
      <spotLight
        position={[6, 9, 5]}
        angle={0.45}
        penumbra={0.6}
        intensity={failure ? 2.2 : 1.65}
        color={tone}
        castShadow
      />
      <pointLight position={[-4, 3, -3]} intensity={0.55} color="#38bdf8" />
      <PerspectiveCamera makeDefault position={[3.8, 2.9, 4.6]} fov={42} near={0.1} far={80} />
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>
      <group position={[0, 0.2, 0]}>
        <ReciprocatingAssembly
          rpm={rpm}
          load={load}
          exploded={exploded}
          stress={filmStress}
        />
      </group>
      <ContactShadows
        position={[0, -2.35, 0]}
        opacity={0.55}
        scale={12}
        blur={2.4}
        far={5}
        color="#000000"
      />
      <OrbitControls
        enablePan
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2}
        maxDistance={14}
        minDistance={2.5}
      />
    </>
  );
}

export function EngineScene({
  rpm,
  load,
  exploded,
  filmStress,
  failure,
  qualityMode,
}) {
  const dprMax =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const dpr =
    qualityMode === "cinematic"
      ? Math.min(dprMax, 2.25)
      : Math.min(dprMax, 1.25);
  return (
    <Canvas
      shadows
      dpr={dpr}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", borderRadius: 12 }}
    >
      <Rig
        rpm={rpm}
        load={load}
        exploded={exploded}
        filmStress={filmStress}
        failure={failure}
      />
    </Canvas>
  );
}
