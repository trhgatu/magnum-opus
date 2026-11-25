"use client";

import { grow, type GrownTree } from "@repo/garden-sim";
import type {
  GardenLanternResponse,
  GardenTreeResponse,
} from "@repo/contracts";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { gardenPath, HIT_RADIUS } from "@/features/garden/lib/garden-layout";
import { lanternDate, lanternLit } from "@/features/garden/lib/garden-story";

/**
 * Cảnh 3D của vườn, theo bản phác "Khu vườn của Tú 3D", chỉ phần P1: cây, bụi
 * gai, mắt gỗ, sẹo, cỏ, lối đá, đèn lồng. Màu phẳng, không đổ bóng; nền trong
 * suốt để lấy màu nền của trang. Mùa, giờ, thời tiết là P2+.
 */

interface GardenSceneProps {
  trees: readonly GardenTreeResponse[];
  /** Mỗi ký ức một đèn bên lối đá (BA §7.5). */
  lanterns: readonly GardenLanternResponse[];
  /** Hôm nay theo múi giờ tài khoản, để biết đèn được thắp bao lâu rồi. */
  today: string;
  /** Sáng tỏ 0..1 (BA §7.4): chỉ đổi sương và nắng, không đổi cây. */
  light: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const PALETTE = {
  light: {
    ground: "#d9d2bd",
    stone: "#b9b09c",
    mount: "#cfc6b0",
    mount2: "#bdb39b",
    bark: "#5a4636",
    ink: "#2a2620",
    ember: "#b5532a",
    grass: "#8f8a5e",
    soil: "#a8977a",
    stake: "#c9a86a",
    fade: "#b8b19f",
    leaf: "#c08a3a",
    leaf2: "#9c4f2b",
    paper: "#e6b866",
    paperLit: "#fbe7a6",
    halo: "#e3d9bf",
  },
  dark: {
    ground: "#34302a",
    stone: "#4a453c",
    mount: "#2a2722",
    mount2: "#25221d",
    bark: "#a88c70",
    ink: "#100e0b",
    ember: "#e07a4a",
    grass: "#6f6b48",
    soil: "#4d4436",
    stake: "#a88a52",
    fade: "#5d584d",
    leaf: "#c08a3a",
    leaf2: "#9c4f2b",
    paper: "#d9a24f",
    paperLit: "#ffd987",
    halo: "#3d372e",
  },
} as const;

type Tone = keyof (typeof PALETTE)["light"];

/** Màu sương dự phòng khi không đọc được --background của trang. */
const MIST = { light: "#f6f1e7", dark: "#1d1a16" } as const;

/**
 * Màu nền thật của trang (token --background, dạng oklch) đổi sang RGB qua
 * canvas 2D, vì three.js không đọc được oklch. Sương mang đúng màu này để hoà
 * vào trang thay vì phủ một lớp xám.
 */
function pageBackground(fallback: string): THREE.Color {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--background")
    .trim();
  const context = document.createElement("canvas").getContext("2d");
  if (!value || !context) return new THREE.Color(fallback);
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return new THREE.Color(`rgb(${r}, ${g}, ${b})`);
}

/** Lối đá trước-trái ra sau-phải; cây đứng hai bên theo thứ tự gieo. */
const PATH = [
  [-620, 0, 420],
  [-380, 0, 180],
  [-60, 0, 300],
  [220, 0, 80],
  [60, 0, -200],
  [380, 0, -300],
  [640, 0, -120],
] as const;

export default function GardenScene({
  trees,
  lanterns,
  today,
  light,
  selectedId,
  onSelect,
}: GardenSceneProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onSelectRef = useRef(onSelect);
  const highlightRef = useRef<(id: string | null) => void>(() => {});

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    highlightRef.current(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const disposables: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    const renderer = keep(
      new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }),
    );
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 5, 9000);
    const controls = keep(new OrbitControls(camera, canvas));
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minDistance = 180;
    controls.maxDistance = 2600;
    controls.enablePan = false;

    const materials = Object.fromEntries(
      (Object.keys(PALETTE.light) as Tone[]).map((tone) => [
        tone,
        keep(new THREE.MeshLambertMaterial({ flatShading: true })),
      ]),
    ) as Record<Tone, THREE.MeshLambertMaterial>;

    // Sáng tỏ thấp: nắng mềm hơn và sương sớm nhẹ mang màu nền trang, để
    // vườn vẫn đủ màu, yên tĩnh, không u ám (BR-GDN-LT-002).
    scene.add(new THREE.HemisphereLight(0xffffff, 0x888070, 0.6 + 0.1 * light));
    const sun = new THREE.DirectionalLight(0xffffff, 0.6 + 0.3 * light);
    sun.position.set(-900, 700, -500);
    scene.add(sun);

    // Đất gợn nhẹ, low-poly.
    const groundGeometry = keep(new THREE.PlaneGeometry(2600, 2000, 46, 36));
    groundGeometry.rotateX(-Math.PI / 2);
    {
      const position = groundGeometry.attributes.position!;
      const random = seeded(11);
      for (let i = 0; i < position.count; i += 1) {
        const x = position.getX(i);
        const z = position.getZ(i);
        const radius = Math.hypot(x, z);
        position.setY(
          i,
          (random() - 0.5) * 6 + Math.max(0, radius - 900) * 0.12,
        );
      }
      groundGeometry.computeVertexNormals();
    }
    scene.add(new THREE.Mesh(groundGeometry, materials.ground));

    // Núi xa.
    {
      const random = seeded(5);
      for (let i = 0; i < 14; i += 1) {
        const angle = -Math.PI * 0.95 + i * ((Math.PI * 0.9) / 13);
        const radius = 1700 + random() * 400;
        const height = 260 + random() * 420;
        const mountain = new THREE.Mesh(
          keep(
            new THREE.ConeGeometry(
              220 + random() * 200,
              height,
              5 + Math.floor(random() * 3),
            ),
          ),
          i % 2 ? materials.mount : materials.mount2,
        );
        mountain.position.set(
          Math.cos(angle) * radius,
          height / 2 - 20,
          Math.sin(angle) * radius,
        );
        mountain.rotation.y = random() * 3;
        scene.add(mountain);
      }
    }

    const curve = new THREE.CatmullRomCurve3(
      PATH.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    );

    // Lối đá.
    {
      const random = seeded(3);
      const count = 110;
      const stones = new THREE.InstancedMesh(
        keep(new THREE.DodecahedronGeometry(1, 0)),
        materials.stone,
        count,
      );
      const matrix = new THREE.Matrix4();
      const rotation = new THREE.Quaternion();
      for (let i = 0; i < count; i += 1) {
        const point = curve.getPointAt(i / (count - 1));
        rotation.setFromEuler(new THREE.Euler(0, random() * 3, 0));
        const size = 11 + random() * 6;
        matrix.compose(
          new THREE.Vector3(
            point.x + (random() - 0.5) * 14,
            1,
            point.z + (random() - 0.5) * 14,
          ),
          rotation,
          new THREE.Vector3(size, 2.2, size * 0.8),
        );
        stones.setMatrixAt(i, matrix);
      }
      scene.add(stones);
    }

    // Cỏ thấp rải rác, và cỏ cao quanh cây bị bỏ quên.
    const bladeGeometry = keep(new THREE.ConeGeometry(1, 1, 3));
    bladeGeometry.translate(0, 0.5, 0);
    const grassField = (
      cx: number,
      cz: number,
      count: number,
      radius: number,
      minHeight: number,
      maxHeight: number,
      seed: number,
    ) => {
      const random = seeded(seed);
      const blades = new THREE.InstancedMesh(
        bladeGeometry,
        materials.grass,
        count,
      );
      const matrix = new THREE.Matrix4();
      const rotation = new THREE.Quaternion();
      for (let i = 0; i < count; i += 1) {
        const angle = random() * 6.28;
        const distance = Math.sqrt(random()) * radius;
        const height =
          minHeight +
          random() * (maxHeight - minHeight) * (1 - (distance / radius) * 0.6);
        rotation.setFromEuler(
          new THREE.Euler(
            (random() - 0.5) * 0.5,
            random() * 3,
            (random() - 0.5) * 0.5,
          ),
        );
        matrix.compose(
          new THREE.Vector3(
            cx + Math.cos(angle) * distance,
            0,
            cz + Math.sin(angle) * distance,
          ),
          rotation,
          new THREE.Vector3(1.6 + random(), height, 1.6 + random()),
        );
        blades.setMatrixAt(i, matrix);
      }
      scene.add(blades);
    };
    grassField(0, 0, 900, 1150, 4, 12, 21);

    const branchGeometry = keep(new THREE.CylinderGeometry(0.8, 1, 1, 6));
    branchGeometry.translate(0, 0.5, 0);
    const leafGeometry = keep(new THREE.IcosahedronGeometry(1, 0));
    const knotGeometry = keep(new THREE.DodecahedronGeometry(1, 0));
    const scarGeometry = keep(new THREE.TorusGeometry(1, 0.18, 4, 10));
    scarGeometry.rotateX(Math.PI / 2);
    const moundGeometry = keep(
      new THREE.SphereGeometry(26, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
    );
    const stakeGeometry = keep(new THREE.BoxGeometry(3, 60, 3));
    const hitMaterial = keep(new THREE.MeshBasicMaterial({ visible: false }));
    const ringMaterial = keep(new THREE.MeshBasicMaterial());
    const ringGeometry = keep(new THREE.RingGeometry(120, 128, 40));
    ringGeometry.rotateX(-Math.PI / 2);

    const UP = new THREE.Vector3(0, 1, 0);
    const hits: THREE.Mesh[] = [];
    const rings = new Map<string, THREE.Mesh>();
    // Chỉ hiện tên cây đang chọn: vườn đông thì nhãn chồng lên nhau; tên mọi
    // cây đã có trong danh sách bên dưới cảnh.
    const tags: {
      id: string;
      element: HTMLSpanElement;
      point: THREE.Vector3;
      /** Tên luống luôn hiện; tên cây chỉ hiện khi được chọn. */
      always?: boolean;
    }[] = [];
    const addTag = (
      id: string,
      text: string,
      point: THREE.Vector3,
      always = false,
    ) => {
      const element = document.createElement("span");
      // Tên đã có trong danh sách bên dưới cảnh: không đọc lặp lại.
      element.setAttribute("aria-hidden", "true");
      element.className = always
        ? "pointer-events-none absolute left-0 top-0 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.14em] text-foreground"
        : "pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded border bg-background px-1.5 text-xs text-foreground";
      element.textContent = text;
      stage.appendChild(element);
      tags.push({ id, element, point, always });
    };
    const bedGeometry = keep(new THREE.BoxGeometry(1, 2, 1));
    let selected: string | null = null;

    // Luống (BR-GDN-008): cây cùng Routine đứng chung một cụm trên nền đất
    // riêng; cây chưa vào Routine nào đứng dọc lối đá.
    const placed: { tree: GardenTreeResponse; position: THREE.Vector3 }[] = [];
    const path = gardenPath(trees, lanterns);
    for (const slot of path.slots) {
      const point = curve.getPointAt(slot.t);
      const tangent = curve.getTangentAt(slot.t);
      const extent = Math.max(
        0,
        ...slot.trees.map(({ dx, dz }) => Math.max(Math.abs(dx), Math.abs(dz))),
      );
      const center = point
        .clone()
        .add(
          new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(
            slot.side * (95 + (slot.bed ? extent + 40 : 0)),
          ),
        );
      if (slot.bed) {
        const bed = new THREE.Mesh(bedGeometry, materials.soil);
        bed.position.set(center.x, 0.5, center.z);
        bed.scale.set(extent * 2 + 120, 1, extent * 2 + 120);
        scene.add(bed);
        addTag(
          `bed:${slot.bed.id}`,
          slot.bed.name,
          new THREE.Vector3(center.x, -14, center.z + extent + 75),
          true,
        );
      }
      for (const { tree, dx, dz } of slot.trees) {
        placed.push({
          tree,
          position: center.clone().add(new THREE.Vector3(dx, 0, dz)),
        });
      }
    }

    placed.forEach(({ tree, position }) => {
      const group = new THREE.Group();
      group.position.copy(position);
      scene.add(group);

      // shortcut: mọi cây mọc lại trên main thread mỗi lần mở trang; ổn với vài
      // chục cây trong một hai năm. Chuyển sang Web Worker hoặc cache theo
      // (id, số tuần) khi vườn đủ lớn để thấy giật.
      const grown = grow(tree.simVersion, {
        seed: tree.id,
        species: tree.variant === "QUIT" ? "thorn-bush" : "tree",
        weeks: tree.weeks,
      });
      const height =
        grown.nodes.length > 1
          ? addTree(group, grown, tree, {
              materials,
              branchGeometry,
              leafGeometry,
              knotGeometry,
              scarGeometry,
              bladeGeometry,
              UP,
            })
          : addSeed(group, materials, moundGeometry, stakeGeometry);

      if (tree.weeds > 0) {
        // Cỏ cao dần theo bậc (BA §7.2); cây không bao giờ nhỏ đi.
        grassField(
          position.x,
          position.z,
          140 + tree.weeds * 80,
          95,
          10 + tree.weeds * 6,
          30 + tree.weeds * 9,
          hashSeed(tree.id),
        );
      }

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.set(position.x, 1.5, position.z);
      ring.visible = false;
      scene.add(ring);
      rings.set(tree.id, ring);

      const hitHeight = Math.max(80, height);
      const hit = new THREE.Mesh(
        keep(
          new THREE.CylinderGeometry(
            grown.nodes.length > 1 ? HIT_RADIUS : 40,
            grown.nodes.length > 1 ? HIT_RADIUS : 40,
            hitHeight,
            8,
          ),
        ),
        hitMaterial,
      );
      hit.position.set(position.x, hitHeight / 2, position.z);
      hit.userData.id = tree.id;
      scene.add(hit);
      hits.push(hit);

      addTag(
        tree.id,
        tree.name,
        new THREE.Vector3(position.x, -14, position.z + 30),
      );
    });

    // Đèn lồng (BA §7.5): cột gỗ, thân giấy, mái nhỏ, đứng sát lối đá. Ngày
    // ước chừng (tháng, năm) thì có quầng đất nhạt rộng dưới chân, không phát
    // sáng: vườn không dùng glow.
    const postGeometry = keep(new THREE.BoxGeometry(3, 62, 3));
    postGeometry.translate(0, 31, 0);
    const paperGeometry = keep(new THREE.BoxGeometry(14, 18, 14));
    const capGeometry = keep(new THREE.ConeGeometry(12, 8, 4));
    const haloGeometry = keep(new THREE.CircleGeometry(1, 20));
    haloGeometry.rotateX(-Math.PI / 2);
    const lanternHitGeometry = keep(new THREE.CylinderGeometry(24, 24, 96, 8));
    const lanternRingGeometry = keep(new THREE.RingGeometry(30, 35, 32));
    // Đèn vừa được thắp (BR-GDN-LN-007): giấy sáng màu hơn rồi nhạt dần.
    // Chỉ đổi màu giấy, không phát sáng.
    const litPapers: { material: THREE.MeshLambertMaterial; lit: number }[] =
      [];
    lanternRingGeometry.rotateX(-Math.PI / 2);
    for (const spot of path.lanterns) {
      const point = curve.getPointAt(spot.t);
      const tangent = curve.getTangentAt(spot.t);
      const center = point
        .clone()
        .add(
          new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(
            spot.side * (spot.lanterns.length > 1 ? 70 : 40),
          ),
        );
      for (const { lantern, dx, dz } of spot.lanterns) {
        const position = center.clone().add(new THREE.Vector3(dx, 0, dz));
        const group = new THREE.Group();
        group.position.copy(position);
        group.add(new THREE.Mesh(postGeometry, materials.bark));
        const lit = lanternLit(lantern, today);
        let paperMaterial = materials.paper;
        if (lit > 0) {
          paperMaterial = keep(
            new THREE.MeshLambertMaterial({ flatShading: true }),
          );
          litPapers.push({ material: paperMaterial, lit });
        }
        const paper = new THREE.Mesh(paperGeometry, paperMaterial);
        paper.position.y = 56;
        group.add(paper);
        const cap = new THREE.Mesh(capGeometry, materials.ink);
        cap.position.y = 69;
        cap.rotation.y = Math.PI / 4;
        group.add(cap);
        if (lantern.precision === "MONTH" || lantern.precision === "YEAR") {
          const halo = new THREE.Mesh(haloGeometry, materials.halo);
          const radius = lantern.precision === "YEAR" ? 52 : 34;
          halo.scale.set(radius, 1, radius);
          halo.position.y = 0.8;
          group.add(halo);
        }
        scene.add(group);

        const ring = new THREE.Mesh(lanternRingGeometry, ringMaterial);
        ring.position.set(position.x, 1.5, position.z);
        ring.visible = false;
        scene.add(ring);
        rings.set(lantern.id, ring);

        const hit = new THREE.Mesh(lanternHitGeometry, hitMaterial);
        hit.position.set(position.x, 48, position.z);
        hit.userData.id = lantern.id;
        scene.add(hit);
        hits.push(hit);

        addTag(
          lantern.id,
          lanternDate(lantern),
          new THREE.Vector3(position.x, -14, position.z + 24),
        );
      }
    }

    // Chỉ vẽ khi có thay đổi: kéo, cuộn, đổi cỡ, đổi theme, chọn cây. Damping
    // của OrbitControls tự phát "change" cho tới khi dừng hẳn.
    let frame = 0;
    const requestRender = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        controls.update();
        renderer.render(scene, camera);
        placeTags();
      });
    };
    const isDark = () => document.documentElement.classList.contains("dark");
    const applyTheme = () => {
      const palette = isDark() ? PALETTE.dark : PALETTE.light;
      for (const tone of Object.keys(palette) as Tone[]) {
        materials[tone].color.set(palette[tone]);
      }
      ringMaterial.color.set(palette.ember);
      for (const { material, lit } of litPapers) {
        material.color
          .set(palette.paper)
          .lerp(new THREE.Color(palette.paperLit), lit);
      }
      scene.fog =
        light >= 0.99
          ? null
          : new THREE.Fog(
              pageBackground(isDark() ? MIST.dark : MIST.light),
              900 + light * 1800,
              3200 + light * 3000,
            );
      requestRender();
    };
    highlightRef.current = (id) => {
      selected = id;
      for (const [ringId, ring] of rings) ring.visible = ringId === id;
      requestRender();
    };
    highlightRef.current(selectedId);

    const home = () => {
      camera.position.set(-150, 620, 1350);
      controls.target.set(40, 60, 0);
      controls.update();
      requestRender();
    };
    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      requestRender();
    };
    const projected = new THREE.Vector3();
    const placeTags = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      for (const tag of tags) {
        projected.copy(tag.point).project(camera);
        tag.element.hidden =
          projected.z > 1 ||
          // Ngoài khung hình thì ẩn, để nhãn không tràn ra khỏi cảnh.
          Math.abs(projected.x) > 1 ||
          Math.abs(projected.y) > 1 ||
          (!tag.always && tag.id !== selected);
        tag.element.style.transform = `translate(${(projected.x * 0.5 + 0.5) * width}px,${(-projected.y * 0.5 + 0.5) * height}px) translate(-50%,0)`;
      }
    };

    controls.addEventListener("change", requestRender);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down: [number, number] | null = null;
    const onPointerDown = (event: PointerEvent) => {
      down = [event.clientX, event.clientY];
    };
    const onPointerUp = (event: PointerEvent) => {
      // Kéo để xoay thì không tính là chạm.
      if (
        !down ||
        Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5
      ) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(hits)[0];
      if (hit) onSelectRef.current(hit.object.userData.id as string);
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);

    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    applyTheme();
    resize();
    home();

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      for (const tag of tags) tag.element.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.InstancedMesh) object.dispose();
      });
      for (const item of disposables) item.dispose();
      highlightRef.current = () => {};
    };
    // Dựng lại cảnh khi dữ liệu vườn đổi; chọn cây chỉ đổi vòng sáng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trees, lanterns, today, light]);

  return (
    <div ref={stageRef} className="relative overflow-hidden">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block h-[clamp(360px,62vw,620px)] w-full cursor-grab touch-none active:cursor-grabbing"
      />
    </div>
  );
}

interface TreeKit {
  materials: Record<Tone, THREE.MeshLambertMaterial>;
  branchGeometry: THREE.BufferGeometry;
  leafGeometry: THREE.BufferGeometry;
  knotGeometry: THREE.BufferGeometry;
  scarGeometry: THREE.BufferGeometry;
  bladeGeometry: THREE.BufferGeometry;
  UP: THREE.Vector3;
}

/** Dựng cành, lá, mắt gỗ, sẹo (và gai cho bụi); trả về chiều cao đã thu nhỏ. */
function addTree(
  group: THREE.Group,
  grown: GrownTree,
  tree: GardenTreeResponse,
  kit: TreeKit,
): number {
  const { nodes, scale } = grown;
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const direction = new THREE.Vector3();
  const random = seeded(hashSeed(`${tree.id}:leaves`));
  let height = 60;

  const branches = new THREE.InstancedMesh(
    kit.branchGeometry,
    kit.materials.bark,
    nodes.length - 1,
  );
  const tips: number[] = [];
  nodes.forEach((node, i) => {
    if (i === 0) return;
    const parent = nodes[node.parent]!;
    direction.set(node.x - parent.x, node.y - parent.y, node.z - parent.z);
    const length = direction.length();
    rotation.setFromUnitVectors(kit.UP, direction.normalize());
    matrix.compose(
      new THREE.Vector3(parent.x, parent.y, parent.z),
      rotation,
      new THREE.Vector3(node.radius, length + 0.4, node.radius),
    );
    branches.setMatrixAt(i - 1, matrix);
    if (node.tip) tips.push(i);
    height = Math.max(height, node.y);
  });
  branches.scale.setScalar(scale);
  group.add(branches);

  // Lá nhạt đi khi cỏ đã mọc (cây bị bỏ quên), nhưng không rụng.
  const faded = tree.weeds > 0;
  const leaves = [
    new THREE.InstancedMesh(
      kit.leafGeometry,
      faded ? kit.materials.fade : kit.materials.leaf,
      tips.length,
    ),
    new THREE.InstancedMesh(
      kit.leafGeometry,
      faded ? kit.materials.fade : kit.materials.leaf2,
      tips.length,
    ),
  ] as const;
  const counts = [0, 0];
  const euler = new THREE.Euler();
  const leafSize = grown.species === "thorn-bush" ? 5 : 6.5;
  tips.forEach((tipIndex, i) => {
    const node = nodes[tipIndex]!;
    const which = i % 2;
    euler.set(random() * 3, random() * 3, random() * 3);
    rotation.setFromEuler(euler);
    const size = leafSize + random() * 3.5;
    matrix.compose(
      new THREE.Vector3(node.x, node.y, node.z),
      rotation,
      new THREE.Vector3(size, size * 0.7, size),
    );
    leaves[which].setMatrixAt(counts[which]!, matrix);
    counts[which]! += 1;
  });
  leaves.forEach((mesh, which) => {
    mesh.count = counts[which]!;
    mesh.scale.setScalar(scale);
    group.add(mesh);
  });

  if (grown.knots.length > 0) {
    const knots = new THREE.InstancedMesh(
      kit.knotGeometry,
      kit.materials.ink,
      grown.knots.length,
    );
    grown.knots.forEach((nodeIndex, i) => {
      const node = nodes[nodeIndex]!;
      const size = node.radius * 1.25 + 2;
      matrix.compose(
        new THREE.Vector3(node.x, node.y, node.z),
        new THREE.Quaternion(),
        new THREE.Vector3(size, size * 1.3, size),
      );
      knots.setMatrixAt(i, matrix);
    });
    knots.scale.setScalar(scale);
    group.add(knots);
  }

  if (grown.scars.length > 0) {
    const scars = new THREE.InstancedMesh(
      kit.scarGeometry,
      kit.materials.ember,
      grown.scars.length,
    );
    grown.scars.forEach((nodeIndex, i) => {
      const node = nodes[nodeIndex]!;
      const parent = nodes[node.parent]!;
      direction
        .set(node.x - parent.x, node.y - parent.y, node.z - parent.z)
        .normalize();
      rotation.setFromUnitVectors(kit.UP, direction);
      const size = node.radius * 1.1 + 1.5;
      matrix.compose(
        new THREE.Vector3(node.x, node.y, node.z),
        rotation,
        new THREE.Vector3(size, size, size),
      );
      scars.setMatrixAt(i, matrix);
    });
    scars.scale.setScalar(scale);
    group.add(scars);
  }

  if (grown.species === "thorn-bush") {
    const thorns = new THREE.InstancedMesh(
      kit.bladeGeometry,
      kit.materials.bark,
      Math.max(1, Math.floor(nodes.length / 3)),
    );
    let count = 0;
    for (let i = 3; i < nodes.length && count < thorns.count; i += 3) {
      const node = nodes[i]!;
      euler.set(random() * 3, random() * 3, random() * 3);
      rotation.setFromEuler(euler);
      matrix.compose(
        new THREE.Vector3(node.x, node.y, node.z),
        rotation,
        new THREE.Vector3(0.7, 5, 0.7),
      );
      thorns.setMatrixAt(count, matrix);
      count += 1;
    }
    thorns.count = count;
    thorns.scale.setScalar(scale);
    group.add(thorns);
  }

  return height * scale;
}

/** Hạt mới gieo, chưa mọc: ụ đất có que tre. */
function addSeed(
  group: THREE.Group,
  materials: Record<Tone, THREE.MeshLambertMaterial>,
  moundGeometry: THREE.BufferGeometry,
  stakeGeometry: THREE.BufferGeometry,
): number {
  const mound = new THREE.Mesh(moundGeometry, materials.soil);
  mound.scale.y = 0.35;
  group.add(mound);
  const stake = new THREE.Mesh(stakeGeometry, materials.stake);
  stake.position.set(16, 30, 0);
  stake.rotation.z = -0.08;
  group.add(stake);
  return 60;
}

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
