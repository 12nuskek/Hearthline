import { type World, type Tile, SIZE } from "./sim";
/** Orthographic voxel renderer. Small software-rendered scene avoids GPU/asset requirements. */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  zoom = 1;
  panX = 0;
  panY = 0;
  selected = -1;
  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }
  private project(x: number, y: number, z = 0) {
    const s = this.scale();
    return {
      x: this.width / 2 + (x - y) * s + this.panX,
      y:
        this.height * (this.width < 700 ? 0.35 : 0.2) +
        (x + y) * s * 0.5 -
        z * s +
        this.panY,
    };
  }
  private scale() {
    return Math.min(this.width / 43, this.height / 25) * this.zoom;
  }
  private polygon(points: { x: number; y: number }[], color: string) {
    const c = this.ctx;
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
    c.fillStyle = color;
    c.fill();
  }
  private box(
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    h: number,
    colors: string[],
  ) {
    const p = (a: number, b: number, c: number) => this.project(a, b, c);
    this.polygon(
      [
        p(x, y + d, z),
        p(x + w, y + d, z),
        p(x + w, y + d, z + h),
        p(x, y + d, z + h),
      ],
      colors[1],
    );
    this.polygon(
      [
        p(x + w, y, z),
        p(x + w, y + d, z),
        p(x + w, y + d, z + h),
        p(x + w, y, z + h),
      ],
      colors[2],
    );
    this.polygon(
      [
        p(x, y, z + h),
        p(x + w, y, z + h),
        p(x + w, y + d, z + h),
        p(x, y + d, z + h),
      ],
      colors[0],
    );
  }
  pick(clientX: number, clientY: number, w: World) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left,
      y = clientY - rect.top,
      s = this.scale();
    let best = -1;
    for (const t of w.tiles) {
      const p = this.project(t.x + 0.5, t.y + 0.5, t.height * 0.23);
      if (Math.abs(x - p.x) / s + Math.abs(y - p.y) / (s * 0.5) <= 1)
        best = t.y * SIZE + t.x;
    }
    return best;
  }
  draw(w: World) {
    const rect = this.canvas.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    if (
      this.canvas.width !== Math.round(rect.width * dpr) ||
      this.canvas.height !== Math.round(rect.height * dpr)
    ) {
      this.canvas.width = Math.round(rect.width * dpr);
      this.canvas.height = Math.round(rect.height * dpr);
    }
    const c = this.ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const night = w.tick % 240 >= 160;
    const bg = c.createLinearGradient(0, 0, 0, this.height);
    bg.addColorStop(0, night ? "#162d38" : "#b9d0c9");
    bg.addColorStop(1, night ? "#274249" : "#e2ded0");
    c.fillStyle = bg;
    c.fillRect(0, 0, this.width, this.height);
    const tiles = [...w.tiles].sort((a, b) => a.x + a.y - (b.x + b.y));
    for (const t of tiles) {
      const z = t.height * 0.23;
      const shade = (t.x * 7 + t.y * 13) % 3;
      this.box(
        t.x,
        t.y,
        -0.8,
        1,
        1,
        z + 0.8,
        t.kind === "water"
          ? ["#709faa", "#517d8a", "#416c77"]
          : [["#93a976", "#91a673", "#9db27e"][shade], "#6e7654", "#59674e"],
      );
    }
    for (const t of tiles) {
      const z = t.height * 0.23;
      this.object(t, z, w.tick);
      for (const p of w.people.filter((p) => p.x === t.x && p.y === t.y)) {
        const color =
          p.name === "Jun"
            ? "#cc8158"
            : p.name === "Mira"
              ? "#779caf"
              : "#d9b86b";
        this.box(t.x + 0.32, t.y + 0.32, z, 0.32, 0.32, 0.46, [
          color,
          color,
          "#556467",
        ]);
        this.box(t.x + 0.28, t.y + 0.28, z + 0.46, 0.4, 0.4, 0.36, [
          "#edd0a0",
          "#d6ac82",
          "#b98969",
        ]);
        this.box(t.x + 0.25, t.y + 0.25, z + 0.79, 0.46, 0.46, 0.12, [
          "#464537",
          "#464537",
          "#35382e",
        ]);
        if (p.carry)
          this.box(t.x + 0.6, t.y + 0.3, z + 0.18, 0.22, 0.3, 0.3, [
            "#d9caa2",
            "#aa8055",
            "#846144",
          ]);
        const a = this.project(t.x + 0.5, t.y + 0.5, z + 1.15);
        c.font = "600 10px system-ui";
        c.textAlign = "center";
        c.fillStyle = night ? "#fff3d2" : "#263f3a";
        c.fillText(p.name, a.x, a.y);
      }
    }
    if (this.selected >= 0) {
      const t = w.tiles[this.selected];
      const a = this.project(t.x + 0.5, t.y + 0.5, t.height * 0.23 + 0.03);
      c.strokeStyle = "#fff2b5";
      c.lineWidth = 2;
      c.beginPath();
      const s = this.scale();
      c.moveTo(a.x, a.y - s * 0.5);
      c.lineTo(a.x + s, a.y);
      c.lineTo(a.x, a.y + s * 0.5);
      c.lineTo(a.x - s, a.y);
      c.closePath();
      c.stroke();
    }
    const fire = this.project(9.5, 9.5, 0.6);
    const glow = c.createRadialGradient(
      fire.x,
      fire.y,
      0,
      fire.x,
      fire.y,
      this.scale() * 3,
    );
    glow.addColorStop(0, "#ffc16a55");
    glow.addColorStop(1, "#ffc16a00");
    c.fillStyle = glow;
    c.fillRect(fire.x - 100, fire.y - 100, 200, 200);
  }
  private object(t: Tile, z: number, tick: number) {
    const { x, y } = t;
    if (t.resource === "wood") {
      this.box(x + 0.4, y + 0.4, z, 0.2, 0.2, 0.75, [
        "#947451",
        "#765b41",
        "#604a37",
      ]);
      this.box(x + 0.12, y + 0.12, z + 0.65, 0.76, 0.76, 0.8, [
        "#548268",
        "#3d6950",
        "#315741",
      ]);
      this.box(x + 0.25, y + 0.25, z + 1.4, 0.5, 0.5, 0.45, [
        "#689176",
        "#4b775a",
        "#3b644b",
      ]);
    }
    if (t.resource === "stone")
      this.box(x + 0.2, y + 0.2, z, 0.65, 0.6, 0.45, [
        "#afb7b0",
        "#87948e",
        "#6e807b",
      ]);
    if (t.resource === "food") {
      this.box(x + 0.2, y + 0.2, z, 0.6, 0.6, 0.4, [
        "#718a56",
        "#5c7645",
        "#49683a",
      ]);
      this.box(x + 0.25, y + 0.3, z + 0.4, 0.15, 0.15, 0.1, [
        "#cb795b",
        "#aa604b",
        "#974b3c",
      ]);
      this.box(x + 0.6, y + 0.55, z + 0.4, 0.13, 0.13, 0.1, [
        "#cb795b",
        "#aa604b",
        "#974b3c",
      ]);
    }
    if (t.building) {
      const h = t.progress / 100;
      if (h < 1) {
        this.box(x + 0.05, y + 0.05, z, 0.9, 0.9, 0.1, [
          "#ecd4a1",
          "#bbaa83",
          "#8c836b",
        ]);
        this.box(x + 0.15, y + 0.15, z, 0.15, 0.15, 0.2 + h, [
          "#e3cfaa",
          "#c2a575",
          "#b99864",
        ]);
      } else if (t.building === "cabin") {
        this.box(x + 0.05, y + 0.05, z, 0.9, 0.9, 0.7, [
          "#d7b586",
          "#ba8e61",
          "#957450",
        ]);
        this.box(x - 0.06, y - 0.06, z + 0.7, 1.12, 1.12, 0.25, [
          "#a35e49",
          "#874d3e",
          "#6c4136",
        ]);
        this.box(x + 0.17, y + 0.17, z + 0.95, 0.66, 0.66, 0.2, [
          "#b76f53",
          "#995842",
          "#804934",
        ]);
        this.box(x + 0.36, y + 0.96, z, 0.3, 0.02, 0.5, [
          "#493f33",
          "#493f33",
          "#493f33",
        ]);
      } else if (t.building === "garden") {
        this.box(x + 0.04, y + 0.04, z, 0.92, 0.92, 0.12, [
          "#755440",
          "#5c4637",
          "#523c30",
        ]);
        for (let i = 0; i < 3; i++)
          this.box(x + 0.12 + i * 0.25, y + 0.15, z + 0.12, 0.1, 0.7, 0.22, [
            "#b6c879",
            "#819857",
            "#688046",
          ]);
      } else {
        this.box(x + 0.15, y + 0.15, z, 0.7, 0.7, 0.35, [
          "#b6bcb1",
          "#909c91",
          "#788780",
        ]);
        this.box(x + 0.4, y + 0.4, z + 0.35, 0.2, 0.2, 1.25, [
          "#b99464",
          "#92724f",
          "#765c3f",
        ]);
        this.box(x + 0.22, y + 0.22, z + 1.6, 0.56, 0.56, 0.4, [
          "#ffdb85",
          "#efab5e",
          "#d18045",
        ]);
      }
    }
    if (x === 9 && y === 9) {
      this.box(x + 0.2, y + 0.2, z, 0.6, 0.6, 0.2, [
        "#ab9a7d",
        "#85775f",
        "#71674f",
      ]);
      this.box(
        x + 0.35,
        y + 0.35,
        z + 0.2,
        0.3,
        0.3,
        0.3 + Math.sin(tick) * 0.04,
        ["#ffe3a2", "#eeb966", "#d68f4f"],
      );
    }
    if (t.marked) {
      const p = this.project(x + 0.5, y + 0.5, z + 1.9);
      this.ctx.fillStyle = "#ffdc8b";
      this.ctx.font = "bold 15px system-ui";
      this.ctx.textAlign = "center";
      this.ctx.fillText("↓", p.x, p.y);
    }
  }
}
