import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

type Drifter = {
  radius: number;
  angle: number;
  speed: number;
  height: number;
  color: string;
  scale: number;
};

type ThemeMode = 'dark' | 'light';

type ScenePalette = {
  background: string;
  fog: string;
  shell: string;
  shellEmissive: string;
  wireframe: string;
  atmosphere: string;
  ringOuter: string;
  ringInner: string;
  lightPrimary: string;
  lightSecondary: string;
  lightTertiary: string;
};

const globePoint = (lat: number, lon: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
};

const Atmosphere = ({ color }: { color: string }) => (
  <mesh scale={1.16}>
    <sphereGeometry args={[2.2, 28, 28]} />
    <meshBasicMaterial color={color} transparent opacity={0.06} side={THREE.BackSide} />
  </mesh>
);

const GlobeShell = ({ palette }: { palette: ScenePalette }) => {
  const meshRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.14;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.22) * 0.08;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <sphereGeometry args={[2.2, 36, 36]} />
        <meshPhysicalMaterial
          color={palette.shell}
          transparent
          opacity={0.5}
          roughness={0.28}
          metalness={0.18}
          clearcoat={1}
          emissive={palette.shellEmissive}
          emissiveIntensity={0.45}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.24, 24, 24]} />
        <meshBasicMaterial color={palette.wireframe} wireframe transparent opacity={0.16} />
      </mesh>

      <Atmosphere color={palette.atmosphere} />
    </group>
  );
};



const GlobeArc = ({
  start,
  end,
  color,
  opacity,
}: {
  start: [number, number];
  end: [number, number];
  color: string;
  opacity: number;
}) => {
  const lineRef = useRef<THREE.Line>(null!);
  const points = useMemo(() => {
    const startVec = globePoint(start[0], start[1], 2.28);
    const endVec = globePoint(end[0], end[1], 2.28);
    const mid = startVec.clone().add(endVec).multiplyScalar(0.5).normalize().multiplyScalar(3.2);
    const curve = new THREE.CatmullRomCurve3([startVec, mid, endVec]);
    return curve.getPoints(64);
  }, [start, end]);

  const lineObject = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    return new THREE.Line(geometry, material);
  }, [points, color, opacity]);

  useFrame((state) => {
    if (lineRef.current) {
      lineRef.current.rotation.y = state.clock.elapsedTime * 0.14;
      lineRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.22) * 0.08;
    }
  });

  return <primitive ref={lineRef} object={lineObject} />;
};

const GlobeArcs = () => {
  const arcs: Array<{
    start: [number, number];
    end: [number, number];
    color: string;
    opacity: number;
  }> = [
      {
        start: [40.7, -74.0],
        end: [51.5, -0.1],
        color: '#22c55e',
        opacity: 0.65,
      },
      {
        start: [28.6, 77.2],
        end: [35.6, 139.7],
        color: '#ef4444',
        opacity: 0.62,
      },
      {
        start: [37.7, -122.4],
        end: [1.3, 103.8],
        color: '#10b981',
        opacity: 0.52,
      },
      {
        start: [48.8, 2.3],
        end: [25.2, 55.3],
        color: '#fb7185',
        opacity: 0.52,
      },
      {
        start: [19.0, 72.8],
        end: [-33.9, 151.2],
        color: '#86efac',
        opacity: 0.48,
      },
      {
        start: [43.7, -79.4],
        end: [31.2, 121.5],
        color: '#f87171',
        opacity: 0.45,
      },
    ];

  return (
    <group>
      {arcs.map((arc, index) => (
        <GlobeArc key={index} {...arc} />
      ))}
    </group>
  );
};

const generateStarPositions = (count: number) => {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    arr[i3] = (Math.random() - 0.5) * 30;
    arr[i3 + 1] = (Math.random() - 0.5) * 18;
    arr[i3 + 2] = (Math.random() - 0.5) * 30;
  }
  return arr;
};

const StarField = ({ theme }: { theme: ThemeMode }) => {
  const pointsRef = useRef<THREE.Points>(null!);
  const materialRef = useRef<THREE.PointsMaterial>(null!);

  const positions = useMemo(() => {
    const count = theme === 'light' ? 800 : 1100;
    return generateStarPositions(count);
  }, [theme]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.04) * 0.04;
    }

    if (materialRef.current) {
      materialRef.current.opacity = 0.45 + Math.sin(state.clock.elapsedTime * 0.9) * 0.08;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={theme === 'light' ? '#60a5fa' : '#bae6fd'}
        size={theme === 'light' ? 0.022 : 0.03}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </points>
  );
};

const generateWireGeometry = (lineCount: number) => {
  const vertices = new Float32Array(lineCount * 2 * 3);

  for (let i = 0; i < lineCount; i++) {
    const i6 = i * 6;
    const a = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 10,
    );
    const b = a.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 1.7,
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.7,
      ),
    );

    vertices[i6] = a.x;
    vertices[i6 + 1] = a.y;
    vertices[i6 + 2] = a.z;
    vertices[i6 + 3] = b.x;
    vertices[i6 + 4] = b.y;
    vertices[i6 + 5] = b.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  return geometry;
};

const SignalWireCloud = ({ theme }: { theme: ThemeMode }) => {
  const linesRef = useRef<THREE.LineSegments>(null!);
  const materialRef = useRef<THREE.LineBasicMaterial>(null!);

  const lineGeometry = useMemo(() => generateWireGeometry(40), []);

  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y = -state.clock.elapsedTime * 0.03;
      linesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.08;
    }

    if (materialRef.current) {
      materialRef.current.opacity = 0.24 + Math.sin(state.clock.elapsedTime * 1.6) * 0.06;
    }
  });

  return (
    <lineSegments ref={linesRef} geometry={lineGeometry}>
      <lineBasicMaterial
        ref={materialRef}
        color={theme === 'light' ? '#2563eb' : '#38bdf8'}
        transparent
        opacity={0.28}
      />
    </lineSegments>
  );
};

const OrbitRings = ({ palette }: { palette: ScenePalette }) => {
  const outerRef = useRef<THREE.Mesh>(null!);
  const innerRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (outerRef.current) {
      outerRef.current.rotation.z = state.clock.elapsedTime * 0.1;
      outerRef.current.rotation.x = Math.PI / 2.4 + Math.sin(state.clock.elapsedTime * 0.18) * 0.05;
    }

    if (innerRef.current) {
      innerRef.current.rotation.z = -state.clock.elapsedTime * 0.14;
      innerRef.current.rotation.y = Math.PI / 4;
    }
  });

  return (
    <group>
      <mesh ref={outerRef}>
        <torusGeometry args={[3.3, 0.022, 12, 120]} />
        <meshBasicMaterial color={palette.ringOuter} transparent opacity={0.28} />
      </mesh>
      <mesh ref={innerRef} rotation={[Math.PI / 2.8, 0, 0]}>
        <torusGeometry args={[2.75, 0.016, 12, 100]} />
        <meshBasicMaterial color={palette.ringInner} transparent opacity={0.16} />
      </mesh>
    </group>
  );
};


const generateDrifterData = (count: number) => {
  const palette = ['#7dd3fc', '#38bdf8', '#f472b6', '#facc15', '#34d399'];
  return Array.from({ length: count }, (_, index) => ({
    radius: 4.2 + Math.random() * 2.8,
    angle: (index / count) * Math.PI * 2,
    speed: 0.08 + Math.random() * 0.12,
    height: (Math.random() - 0.5) * 5.5,
    color: palette[index % palette.length],
    scale: 0.03 + Math.random() * 0.04,
  }));
};

const DriftingSignals = ({ count = 90 }) => {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  const particles = useMemo<Drifter[]>(() => generateDrifterData(count), [count]);

  React.useEffect(() => {
    if (!mesh.current) return;

    particles.forEach((particle, index) => {
      colorObj.set(particle.color);
      mesh.current.setColorAt(index, colorObj);
    });

    if (mesh.current.instanceColor) {
      mesh.current.instanceColor.needsUpdate = true;
    }
  }, [particles, colorObj]);

  useFrame((state) => {
    particles.forEach((particle, index) => {
      const time = state.clock.elapsedTime * particle.speed + particle.angle;
      const x = Math.cos(time) * particle.radius;
      const z = Math.sin(time) * particle.radius;
      const y = particle.height + Math.sin(time * 1.8) * 0.24;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(particle.scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(index, dummy.matrix);
    });

    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial transparent opacity={0.9} />
    </instancedMesh>
  );
};

const RotatingCore = ({ palette }: { palette: ScenePalette }) => {
  const coreRef = useRef<THREE.Mesh>(null!);
  const shellRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (coreRef.current) {
      coreRef.current.rotation.x = t * 0.6;
      coreRef.current.rotation.y = t * 0.9;
      coreRef.current.position.y = Math.sin(t * 0.9) * 0.18;
    }

    if (shellRef.current) {
      shellRef.current.rotation.x = -t * 0.25;
      shellRef.current.rotation.y = t * 0.35;
      shellRef.current.scale.setScalar(1.04 + Math.sin(t * 1.2) * 0.03);
    }
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.4, 1]} />
        <meshStandardMaterial
          color={palette.lightPrimary}
          emissive={palette.lightPrimary}
          emissiveIntensity={0.75}
          metalness={0.72}
          roughness={0.18}
        />
      </mesh>
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[0.65, 1]} />
        <meshBasicMaterial color={palette.lightSecondary} wireframe transparent opacity={0.32} />
      </mesh>
    </group>
  );
};

const CameraRig = () => {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const x = Math.sin(t * 0.22) * 0.2;
    const y = Math.cos(t * 0.28) * 0.15;

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, x, 0.02);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, y, 0.02);
    state.camera.lookAt(0, 0, 0);
  });

  return null;
};

const CrystalRibbon = ({ color, opacity }: { color: string; opacity: number }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const curve = useMemo(() => {
    const points = [];
    for (let i = 0; i < 20; i++) {
      points.push(
        new THREE.Vector3(
          Math.sin(i * 0.5) * 4,
          (i - 10) * 0.8,
          Math.cos(i * 0.3) * 4
        )
      );
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 1.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <tubeGeometry args={[curve, 64, 0.015, 8, false]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
};

const LightRibbons = ({ theme }: { theme: ThemeMode }) => {
  if (theme !== 'light') return null;
  return (
    <group>
      <CrystalRibbon color="#60a5fa" opacity={0.3} />
      <CrystalRibbon color="#f472b6" opacity={0.25} />
      <CrystalRibbon color="#34d399" opacity={0.2} />
    </group>
  );
};

const GlobeScene = ({
  palette,
  theme,
}: {
  palette: ScenePalette;
  theme: ThemeMode;
}) => (
  <Float speed={1.2} rotationIntensity={0.12} floatIntensity={0.25}>
    <group position={[0, 0.2, 0]}>
      <GlobeShell palette={palette} />
      <GlobeArcs />
      <OrbitRings palette={palette} />
      <RotatingCore palette={palette} />
      <LightRibbons theme={theme} />
    </group>
  </Float>
);

export const ThreeCanvas: React.FC<{ theme: ThemeMode }> = ({ theme }) => {
  const palette: ScenePalette =
    theme === 'light'
      ? {
        background: '#dbeafe',
        fog: '#bfdbfe',
        shell: '#f8fbff',
        shellEmissive: '#1d4ed8',
        wireframe: '#1e40af',
        atmosphere: '#93c5fd',
        ringOuter: '#1d4ed8',
        ringInner: '#be185d',
        lightPrimary: '#1e40af',
        lightSecondary: '#be185d',
        lightTertiary: '#059669',
      }
      : {
        background: '#020617',
        fog: '#020617',
        shell: '#071225',
        shellEmissive: '#0f3b66',
        wireframe: '#7dd3fc',
        atmosphere: '#38bdf8',
        ringOuter: '#38bdf8',
        ringInner: '#f472b6',
        lightPrimary: '#60a5fa',
        lightSecondary: '#f472b6',
        lightTertiary: '#34d399',
      };

  return (
    <div className="fixed inset-0 -z-10 h-full w-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 9], fov: 42 }}
        dpr={[1, 1.2]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[palette.background]} />
        <fog attach="fog" args={[palette.fog, 7, 18]} />

        <ambientLight intensity={0.62} />
        <pointLight position={[0, 2, 7]} intensity={1.45} color={palette.lightPrimary} />
        <pointLight position={[-6, -1, 2]} intensity={0.8} color={palette.lightSecondary} />
        <pointLight position={[5, 1, 4]} intensity={0.8} color={palette.lightTertiary} />
        <directionalLight position={[2, 4, 5]} intensity={0.25} color={palette.lightPrimary} />

        <StarField theme={theme} />
        <SignalWireCloud theme={theme} />
        <GlobeScene palette={palette} theme={theme} />
        <DriftingSignals count={theme === 'light' ? 90 : 70} />
        <CameraRig />
      </Canvas>
    </div>
  );
};
