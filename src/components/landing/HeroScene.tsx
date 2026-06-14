'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Icosahedron, Sparkles, Torus, Octahedron } from '@react-three/drei';
import * as THREE from 'three';

function MorphingCore() {
  const mesh = useRef<THREE.Mesh>(null);
  const { mouse } = useThree();

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();
    mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, mouse.y * 0.4 + t * 0.05, 0.05);
    mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, mouse.x * 0.4 + t * 0.08, 0.05);
  });

  return (
    <Icosahedron ref={mesh} args={[1.7, 12]} position={[0, 0, 0]}>
      <MeshDistortMaterial
        color="#e86c2d"
        emissive="#7a2e0e"
        emissiveIntensity={0.35}
        roughness={0.18}
        metalness={0.85}
        distort={0.42}
        speed={1.6}
      />
    </Icosahedron>
  );
}

function OrbitingShape({ radius, speed, size, color, type }: { radius: number; speed: number; size: number; color: string; type: 'torus' | 'octa' | 'ico' }) {
  const group = useRef<THREE.Group>(null);
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime() * speed + offset;
    group.current.position.x = Math.cos(t) * radius;
    group.current.position.z = Math.sin(t) * radius;
    group.current.position.y = Math.sin(t * 1.3) * 0.6;
    group.current.rotation.x += 0.01;
    group.current.rotation.y += 0.012;
  });

  return (
    <group ref={group}>
      <Float speed={2} rotationIntensity={1} floatIntensity={1}>
        {type === 'torus' && (
          <Torus args={[size, size * 0.4, 16, 32]}>
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.25} emissive={color} emissiveIntensity={0.2} />
          </Torus>
        )}
        {type === 'octa' && (
          <Octahedron args={[size]}>
            <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} emissive={color} emissiveIntensity={0.25} />
          </Octahedron>
        )}
        {type === 'ico' && (
          <Icosahedron args={[size, 0]}>
            <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} emissive={color} emissiveIntensity={0.2} flatShading />
          </Icosahedron>
        )}
      </Float>
    </group>
  );
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={120} color="#ff9a5a" />
      <pointLight position={[-5, -3, -5]} intensity={80} color="#5b6cff" />
      <pointLight position={[0, 4, -6]} intensity={60} color="#a855f7" />
      <spotLight position={[0, 8, 4]} angle={0.4} penumbra={1} intensity={60} color="#ffffff" />

      <MorphingCore />

      <OrbitingShape radius={3.2} speed={0.35} size={0.32} color="#6366f1" type="torus" />
      <OrbitingShape radius={3.8} speed={-0.28} size={0.26} color="#a855f7" type="octa" />
      <OrbitingShape radius={2.9} speed={0.42} size={0.22} color="#22d3ee" type="ico" />
      <OrbitingShape radius={4.2} speed={-0.22} size={0.3} color="#e86c2d" type="octa" />

      <Sparkles count={80} scale={10} size={2.5} speed={0.4} opacity={0.6} color="#ffb380" />
      <Sparkles count={50} scale={8} size={1.5} speed={0.3} opacity={0.4} color="#8ca4c0" />
    </>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}
