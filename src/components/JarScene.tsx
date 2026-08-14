import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Props = {
  open: boolean;
  jarColor: string;
  lidColor: string;
  capsuleColor: string;
  capsuleCount: number;
  name?: string | undefined;
  dosage?: string | undefined;
  subtitle?: string | undefined;
  imageUrl?: string | undefined;
};

type LabelData = {
  texture: THREE.CanvasTexture;
  bodyColor: string | null;
  lidColor: string | null;
  aspect: number;
};

/** arco (rad) ocupado pelo rótulo na frente do frasco */
const LABEL_ARC = 2.6;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Amostra as cores reais (corpo e tampa) da foto do produto. */
function samplePhotoColors(img: HTMLImageElement): { body: string | null; lid: string | null } {
  const src = document.createElement("canvas");
  src.width = img.naturalWidth;
  src.height = img.naturalHeight;
  const ctx = src.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { body: null, lid: null };
  ctx.drawImage(img, 0, 0);

  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, src.width, src.height);
  } catch {
    return { body: null, lid: null };
  }

  let minX = src.width;
  let minY = src.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < src.height; y += 2) {
    for (let x = 0; x < src.width; x += 2) {
      const i = (y * src.width + x) * 4;
      if ((data.data[i + 3] ?? 0) > 60) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return { body: null, lid: null };

  const bw = maxX - minX;
  const bh = maxY - minY;

  const sample = (fy: number, spread: number) => {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    const y0 = Math.round(minY + bh * (fy - spread));
    const y1 = Math.round(minY + bh * (fy + spread));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = Math.round(minX + bw * 0.38); x <= Math.round(minX + bw * 0.62); x += 1) {
        const i = (y * src.width + x) * 4;
        if ((data.data[i + 3] ?? 0) < 150) continue;
        r += data.data[i] ?? 0;
        g += data.data[i + 1] ?? 0;
        b += data.data[i + 2] ?? 0;
        n += 1;
      }
    }
    if (!n) return null;
    const hex = (v: number) =>
      Math.min(255, Math.round(v / n))
        .toString(16)
        .padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  };

  return { lid: sample(0.09, 0.03), body: sample(0.32, 0.02) };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  weight: string,
  startSize: number,
) {
  let size = startSize;
  for (;;) {
    ctx.font = `${weight} ${size}px "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || size <= 20) break;
    size -= 2;
  }
  return size;
}

/** Rótulo tipográfico nítido, no mesmo layout das embalagens reais. */
function buildLabel(
  name?: string,
  dosage?: string,
  capsuleCount?: number,
  subtitle?: string,
): LabelData | null {
  const W = 2200;
  const H = 1250;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // papel do rótulo com leve gradiente (parece impresso, não chapado)
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#FFFFFF");
  grad.addColorStop(0.5, "#F7F6F1");
  grad.addColorStop(1, "#EFEDE6");
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, W, H, 46);
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 4;
  roundRect(ctx, 2, 2, W - 4, H - 4, 46);
  ctx.stroke();

  const padX = W * 0.09;
  const inner = W - padX * 2;
  ctx.fillStyle = "#0B0B0B";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const title = (name ?? "Tioxtm Natural").trim();
  const titleSize = fitText(ctx, title, inner, "700", 230);
  let y = H * 0.30;
  ctx.fillText(title, W / 2, y);

  // linhas de posologia (quebra em "e" / vírgula, como no rótulo)
  const lines = (dosage ?? "")
    .split(/\s+e\s+|,\s*/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2);

  y += H * 0.10;
  ctx.fillStyle = "#0A0A0A";
  for (const line of lines) {
    const s = fitText(ctx, line, inner, "500", 120);
    ctx.fillText(line, W / 2, y);
    y += s * 1.28;
  }

  const contains = `Contém ${capsuleCount ?? 60} cápsulas`;
  const cs = fitText(ctx, contains, inner, "500", 122);
  ctx.fillText(contains, W / 2, y + cs * 0.5);

  // gramagem no canto inferior direito
  const mg = (subtitle ?? "").match(/(\d+[.,]?\d*)\s*(mg|mcg|g)\b/i);
  if (mg) {
    ctx.textAlign = "right";
    ctx.font = `600 118px "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif`;
    ctx.fillText(`${mg[1]}${mg[2]?.toLowerCase()}`, W - padX, H * 0.90);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return { texture: tex, bodyColor: null, lidColor: null, aspect: W / H };
}

function useLabel(
  imageUrl?: string,
  name?: string,
  dosage?: string,
  capsuleCount?: number,
  subtitle?: string,
): LabelData | null {
  const [data, setData] = useState<LabelData | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: LabelData | null = null;

    const apply = (next: LabelData | null) => {
      if (cancelled) {
        next?.texture.dispose();
        return;
      }
      created = next;
      setData(next);
    };

    const base = buildLabel(name, dosage, capsuleCount, subtitle);

    if (imageUrl && base) {
      loadImage(imageUrl)
        .then((img) => {
          const colors = samplePhotoColors(img);
          apply({ ...base, bodyColor: colors.body, lidColor: colors.lid });
        })
        .catch(() => apply(base));
    } else {
      apply(base);
    }

    return () => {
      cancelled = true;
      created?.texture.dispose();
    };
  }, [imageUrl, name, dosage, capsuleCount, subtitle]);

  return data;
}




function Capsules({ color, count }: { color: string; count: number }) {
  const items = useMemo(() => {
    const rng = (seed: number) => {
      const x = Math.sin(seed * 127.1) * 43758.5453;
      return x - Math.floor(x);
    };
    const n = Math.min(Math.max(count, 14), 44);
    return Array.from({ length: n }, (_, i) => {
      const layer = Math.floor(i / 9);
      const radius = 0.05 + rng(i + 1) * 0.4;
      const angle = rng(i + 7) * Math.PI * 2;
      return {
        position: [
          Math.cos(angle) * radius,
          -0.42 + layer * 0.2 + rng(i + 13) * 0.05,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        rotation: [
          rng(i + 3) * Math.PI,
          rng(i + 5) * Math.PI,
          rng(i + 9) * Math.PI,
        ] as [number, number, number],
      };
    });
  }, [count]);

  return (
    <group>
      {items.map((c, i) => (
        <mesh key={i} position={c.position} rotation={c.rotation} castShadow>
          <capsuleGeometry args={[0.065, 0.13, 6, 16]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

/** Perfil do frasco farmacêutico: base reta, ombro arredondado e gargalo. */
function useBottleGeometry() {
  return useMemo(() => {
    const points: THREE.Vector2[] = [];
    points.push(new THREE.Vector2(0, -0.86));
    points.push(new THREE.Vector2(0.5, -0.86));
    points.push(new THREE.Vector2(0.56, -0.8));
    points.push(new THREE.Vector2(0.58, -0.7));
    points.push(new THREE.Vector2(0.58, 0.5));
    points.push(new THREE.Vector2(0.575, 0.62));
    points.push(new THREE.Vector2(0.54, 0.72));
    points.push(new THREE.Vector2(0.47, 0.79));
    points.push(new THREE.Vector2(0.41, 0.83));
    points.push(new THREE.Vector2(0.4, 1.0));
    return new THREE.LatheGeometry(points, 96);
  }, []);
}

/** Anéis verticais da tampa (canelada), como nas fotos. */
function LidRibs({ color }: { color: string }) {
  const ribs = useMemo(() => Array.from({ length: 44 }, (_, i) => (i / 44) * Math.PI * 2), []);
  return (
    <group>
      {ribs.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6]} rotation={[0, -a, 0]}>
          <boxGeometry args={[0.02, 0.34, 0.035]} />
          <meshStandardMaterial color={color} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function Jar({
  open,
  jarColor,
  lidColor,
  capsuleColor,
  capsuleCount,
  name,
  dosage,
  subtitle,
  imageUrl,
}: Props) {
  const group = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const bottle = useBottleGeometry();
  const label = useLabel(imageUrl, name, dosage, capsuleCount, subtitle);
  const bodyColor = label?.bodyColor ?? jarColor;
  const capColor = label?.lidColor ?? lidColor;

  useFrame((state, delta) => {
    if (group.current) {
      // balanço suave mantendo o rótulo sempre virado para a frente
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.45) * 0.26;
      group.current.rotation.x = THREE.MathUtils.damp(
        group.current.rotation.x,
        open ? -0.7 : 0,
        4,
        delta,
      );
      group.current.position.y = -0.25 + Math.sin(state.clock.elapsedTime * 0.8) * 0.02;
    }
    if (lid.current) {
      const targetY = open ? 1.65 : 1.05;
      const targetTilt = open ? 0.3 : 0;
      lid.current.position.y = THREE.MathUtils.damp(lid.current.position.y, targetY, 5, delta);
      lid.current.rotation.z = THREE.MathUtils.damp(lid.current.rotation.z, targetTilt, 5, delta);
    }
  });

  const labelHeight = label ? (0.592 * LABEL_ARC) / label.aspect : 0.7;

  return (
    <group ref={group} position={[0, -0.2, 0]} scale={0.95}>
      {/* corpo do frasco (HDPE fosco) */}
      <mesh geometry={bottle} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={bodyColor}
          roughness={0.58}
          metalness={0}
          clearcoat={0.35}
          clearcoatRoughness={0.6}
          sheen={0.25}
          envMapIntensity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* rótulo tipográfico curvo colado na frente */}
      {label ? (
        <mesh position={[0, -0.1, 0]} rotation={[0, -LABEL_ARC / 2, 0]}>
          <cylinderGeometry args={[0.594, 0.594, labelHeight, 128, 1, true, 0, LABEL_ARC]} />
          <meshStandardMaterial
            map={label.texture}
            roughness={0.7}
            metalness={0}
            envMapIntensity={0.35}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={-4}
          />
        </mesh>
      ) : null}

      <Capsules color={capsuleColor} count={capsuleCount} />

      {/* tampa canelada */}
      <group ref={lid} position={[0, 1.05, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.6, 0.6, 0.36, 72]} />
          <meshStandardMaterial color={capColor} roughness={0.4} metalness={0.05} />
        </mesh>
        <LidRibs color={capColor} />
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.05, 72]} />
          <meshStandardMaterial color={capColor} roughness={0.3} />
        </mesh>
        {/* saia inferior mais larga, como no frasco real */}
        <mesh position={[0, -0.21, 0]}>
          <cylinderGeometry args={[0.615, 0.6, 0.09, 72]} />
          <meshStandardMaterial color={capColor} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

function ScrollSafeOrbitControls(props: ComponentProps<typeof OrbitControls>) {
  const ref = useRef<{ enabled: boolean; domElement: HTMLElement } | null>(null);

  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    const el = controls.domElement;
    el.style.touchAction = "pan-y";

    let startX = 0;
    let startY = 0;

    const onPointerDown = (event: PointerEvent) => {
      startX = event.clientX;
      startY = event.clientY;
      if (event.pointerType === "touch") controls.enabled = false;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || controls.enabled) return;
      const dx = Math.abs(event.clientX - startX);
      const dy = Math.abs(event.clientY - startY);
      if (dx > 12 && dx > dy) controls.enabled = true;
    };

    const onPointerUp = () => {
      controls.enabled = true;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return <OrbitControls ref={ref} {...props} />;
}

export default function JarScene(props: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 1.05, 4.1], fov: 32 }}
      style={{ touchAction: "pan-y" }}
      onCreated={({ gl }) => {
        gl.domElement.style.touchAction = "pan-y";
      }}
    >
      <ambientLight intensity={0.55} />
      {/* luz principal em softbox de estúdio */}
      <directionalLight position={[3, 5, 4]} intensity={1.15} castShadow />
      <directionalLight position={[-4, 2.5, 2]} intensity={0.6} />
      <directionalLight position={[0, 2, -4]} intensity={0.5} />
      <pointLight position={[0, 1.2, 0]} intensity={2} distance={2.5} />
      <Jar {...props} />
      <ContactShadows position={[0, -1.12, 0]} opacity={0.4} scale={6} blur={2.4} far={3} />
      <Environment preset="city" />
      <ScrollSafeOrbitControls
        target={[0, 0.05, 0]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 1.95}
      />
    </Canvas>
  );
}

