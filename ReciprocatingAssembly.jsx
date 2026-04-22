import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const rCrank = 0.45;
const rodLen = 1.65;
const crankCenterY = -rodLen - rCrank;

const up = new THREE.Vector3(0, 1, 0);

function pistonHeight(theta) {
  return (
    rCrank * Math.cos(theta) +
    Math.sqrt(Math.max(rodLen * rodLen - (rCrank * Math.sin(theta)) ** 2, 0))
  );
}

export function ReciprocatingAssembly({
  rpm,
  load = 0.5,
  colorCrank = "#9ca3af",
  colorPiston = "#ef4444",
  colorRod = "#78716c",
  colorCyl = "#1e3a5f",
  exploded = false,
  stress = 0,
}) {
  const crank = useRef();
  const piston = useRef();
  const rod = useRef();
  const thetaRef = useRef(0);
  const q = useMemo(() => new THREE.Quaternion(), []);

  const matCyl = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: colorCyl,
        metalness: 0.35,
        roughness: 0.45,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      }),
    [colorCyl]
  );

  useFrame((_, delta) => {
    const omega = (rpm / 60) * Math.PI * 2;
    thetaRef.current += omega * delta;
    const th = thetaRef.current;
    const ex = exploded ? 0.65 : 0;

    const ph = pistonHeight(th);
    const pistonY = ph - rodLen - rCrank + ex * 1.25;
    const wristY = pistonY - 0.06;

    const pinX = rCrank * Math.cos(th);
    const pinY = crankCenterY - rCrank * Math.sin(th);

    if (crank.current) crank.current.rotation.z = -th;
    if (piston.current) {
      piston.current.position.set(0, pistonY, 0);
    }

    if (rod.current) {
      const dx = -pinX;
      const dy = wristY - pinY;
      const len = Math.hypot(dx, dy);
      if (len > 1e-4) {
        const dir = new THREE.Vector3(dx / len, dy / len, 0);
        q.setFromUnitVectors(up, dir);
        rod.current.quaternion.copy(q);
        rod.current.scale.set(1, len, 1);
        rod.current.position.set((pinX + 0) / 2, (pinY + wristY) / 2, 0);
      }
    }
  });

  const emissive = 0.12 + stress * 0.55 + load * 0.1;

  return (
    <group>
      <mesh position={[0, crankCenterY - 0.2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 2.2, 16]} />
        <meshStandardMaterial color={colorCrank} metalness={0.6} roughness={0.35} />
      </mesh>

      <group ref={crank} position={[0, crankCenterY, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 1.25, 24]} />
          <meshStandardMaterial color={colorCrank} metalness={0.7} roughness={0.28} />
        </mesh>
        <mesh position={[rCrank, 0, 0]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#64748b" metalness={0.55} roughness={0.32} />
        </mesh>
      </group>

      <mesh ref={rod}>
        <boxGeometry args={[0.1, 1, 0.1]} />
        <meshStandardMaterial color={colorRod} metalness={0.45} roughness={0.38} />
      </mesh>

      <mesh ref={piston} position={[0, 0, 0]}>
        <boxGeometry args={[0.85, 0.35, 0.85]} />
        <meshStandardMaterial
          color={colorPiston}
          metalness={0.25}
          roughness={0.45}
          emissive="#450a0a"
          emissiveIntensity={emissive}
        />
      </mesh>

      <mesh position={[0, 0.2, 0]} material={matCyl}>
        <cylinderGeometry args={[0.95, 0.95, 2.8, 48, 1, true]} />
      </mesh>
    </group>
  );
}
