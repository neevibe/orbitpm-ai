'use client';

import { Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useApp, HEALTH_COLOR, type Domain } from '@/context/AppContext';

/* ============================================================
   Animated low-poly plane traveling a takeoff/landing loop
   ============================================================ */
function Plane({ offset, color }: { offset: number; color: string }) {
  const group = useRef<THREE.Group>(null);
  // Throttle to ~30fps for the loop math
  const last = useRef(0);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const now = state.clock.getElapsedTime();
    if (now - last.current < 1 / 30) return;
    last.current = now;

    const t = (now * 0.12 + offset) % 1;       // 0..1 along the runway
    const x = THREE.MathUtils.lerp(-7, 7, t);  // travel along runway
    // lift off in the last 35% of the run
    const lift = t > 0.65 ? (t - 0.65) / 0.35 : 0;
    const y = 0.18 + lift * lift * 3.4;
    g.position.set(x, y, 0);
    g.rotation.z = -lift * 0.34;
    g.rotation.y = Math.PI / 2;
  });

  return (
    <group ref={group}>
      {/* fuselage */}
      <mesh castShadow>
        <capsuleGeometry args={[0.16, 0.9, 6, 12]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.35} />
      </mesh>
      {/* wings */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.06, 0.04, 1.5]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.2} roughness={0.5} />
      </mesh>
      {/* tail */}
      <mesh castShadow position={[-0.5, 0.18, 0]}>
        <boxGeometry args={[0.04, 0.36, 0.4]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
    </group>
  );
}

/* ============================================================
   Instanced runway edge lights (heavy geometry → instanced mesh)
   ============================================================ */
function RunwayLights() {
  const count = 48;
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const x = THREE.MathUtils.lerp(-7.5, 7.5, Math.floor(i / 2) / (count / 2 - 1));
      dummy.position.set(x, 0.06, side * 1.15);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  // Throttled emissive pulse for the whole strip
  const last = useRef(0);
  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.getElapsedTime();
    if (t - last.current < 1 / 20) return;
    last.current = t;
    (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4 + Math.sin(t * 3) * 0.6;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.6} />
    </instancedMesh>
  );
}

/* ============================================================
   Pulsing ring that mirrors domain health
   ============================================================ */
function PulseRing({ color, position }: { color: string; position: [number, number, number] }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const m = ring.current;
    if (!m) return;
    const t = state.clock.getElapsedTime();
    const s = 1 + (Math.sin(t * 2.4) * 0.5 + 0.5) * 0.7;
    m.scale.set(s, s, s);
    (m.material as THREE.MeshBasicMaterial).opacity = 0.7 - (s - 1) / 0.7 * 0.6;
  });
  return (
    <mesh ref={ring} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.5, 0.62, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ============================================================
   A clickable structural zone (retail / duty-free / operations)
   ============================================================ */
function Zone({
  domain, position, size, color, label,
}: {
  domain: Domain;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  label: string;
}) {
  const { activeDomain, toggleDomain, getDomainHealth } = useApp();
  const [hovered, setHovered] = useState(false);
  const active = activeDomain === domain;
  const health = getDomainHealth(domain);
  const ringColor = HEALTH_COLOR[health];

  const onClick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); toggleDomain(domain); };

  return (
    <group position={position}>
      <RoundedBox
        args={size}
        radius={0.08}
        smoothness={4}
        position={[0, size[1] / 2, 0]}
        castShadow
        receiveShadow
        onClick={onClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        scale={hovered ? 1.04 : 1}
      >
        <meshStandardMaterial
          color={color}
          metalness={0.15}
          roughness={0.55}
          emissive={active ? color : '#000000'}
          emissiveIntensity={active ? 0.35 : 0}
        />
      </RoundedBox>

      {/* instanced "windows" stripe for a storefront feel */}
      <mesh position={[0, size[1] * 0.55, size[2] / 2 + 0.001]}>
        <planeGeometry args={[size[0] * 0.82, size[1] * 0.22]} />
        <meshStandardMaterial color="#ffffff" opacity={0.85} transparent emissive="#ffffff" emissiveIntensity={0.15} />
      </mesh>

      <PulseRing color={ringColor} position={[0, size[1] + 0.7, 0]} />

      {(hovered || active) && (
        <Html position={[0, size[1] + 1.1, 0]} center distanceFactor={10}>
          <div style={{
            background: 'rgba(255,255,255,0.96)', border: `1px solid ${ringColor}`, borderRadius: 8,
            padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap',
            boxShadow: '0 8px 24px -8px rgba(15,23,42,0.3)', pointerEvents: 'none',
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ============================================================
   Runway slab (also clickable → runway domain)
   ============================================================ */
function Runway() {
  const { activeDomain, toggleDomain } = useApp();
  const active = activeDomain === 'runway';
  const [hovered, setHovered] = useState(false);
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        receiveShadow
        onClick={(e) => { e.stopPropagation(); toggleDomain('runway'); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <planeGeometry args={[16, 2]} />
        <meshStandardMaterial color={active || hovered ? '#334155' : '#1e293b'} roughness={0.9} />
      </mesh>
      {/* center dashes */}
      {Array.from({ length: 11 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[THREE.MathUtils.lerp(-7, 7, i / 10), 0.03, 0]}>
          <planeGeometry args={[0.7, 0.08]} />
          <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.2} />
        </mesh>
      ))}
      <RunwayLights />
    </group>
  );
}

/* ============================================================
   Scene
   ============================================================ */
function Scene() {
  const { domains } = useApp();
  const find = (k: Domain) => domains.find(d => d.key === k)!;

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[6, 9, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />

      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#eef2f7" roughness={1} />
      </mesh>

      <Runway />

      {/* planes on the loop */}
      <Plane offset={0} color="#6366f1" />
      <Plane offset={0.45} color="#818cf8" />
      <Plane offset={0.78} color="#a5b4fc" />

      {/* structural zones */}
      <Zone domain="retail"     position={[-5, 0, -4.5]} size={[2.6, 1.4, 2]} color={find('retail').color}     label="Retail Complex" />
      <Zone domain="dutyfree"   position={[0, 0, -5]}    size={[3, 1.8, 2.2]} color={find('dutyfree').color}   label="Duty-Free Hall" />
      <Zone domain="operations" position={[5, 0, -4.5]}  size={[2.8, 1.2, 2]} color={find('operations').color} label="Ground Operations" />

      <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={30} blur={2.2} far={6} />
      <Environment preset="city" />
      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.3}
        minDistance={9}
        maxDistance={22}
        autoRotate
        autoRotateSpeed={0.4}
      />
    </>
  );
}

/* ============================================================
   Public canvas
   ============================================================ */
export default function AirportCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 7, 13], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#f8fafc']} />
      <fog attach="fog" args={['#f8fafc', 22, 40]} />
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
