import { useEffect, useRef } from "react";

import {
  bindFullscreenTriangle,
  CHAR_H,
  CHAR_W,
  createGlyphCanvas,
  createProgram,
  GLYPHS,
  loadAtlas,
  MAX_EMOTES,
  uploadTexture,
} from "@/lib/ascii-gl";

// A pile of emotes that fall in, collide and can be dragged and thrown, drawn through the
// same ASCII filter as the homepage background but on a flat, straight-on surface.

const MAX_BODIES = 16;
// Share of the area the emotes may cover, so small screens get fewer of them
const MAX_COVERAGE = 0.35;
const IDLE_BRIGHTNESS = 0.55;
const IDLE_SATURATION = 0.3;
const WALL = 200;
const STEP_MS = 1000 / 60;
// Steps simulated up front with reduced motion, so the pile starts settled
const SETTLE_STEPS = 900;

const emoteSize = (width: number) => Math.min(Math.max(width / 8, 72), 150);

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uAtlas;
uniform sampler2D uGlyphs;
uniform vec2 uCharSize;
uniform float uAtlasLod;
uniform float uEmoteGrid;
uniform float uPageGrid;
uniform float uFrames;
uniform float uDurations[${MAX_EMOTES}];
uniform float uTime;
uniform float uSize;
// x, y (device pixels, y up), angle (radians, clockwise on screen), emote index
uniform vec4 uBodies[${MAX_BODIES}];
uniform float uPhases[${MAX_BODIES}];
uniform int uCount;

out vec4 outColor;

const float GLYPH_COUNT = ${GLYPHS.length.toFixed(1)};

vec4 sampleBody(int i, vec2 point) {
  vec4 body = uBodies[i];
  vec2 d = point - body.xy;
  float c = cos(body.z);
  float s = sin(body.z);
  vec2 local = vec2(c * d.x - s * d.y, s * d.x + c * d.y) / uSize + 0.5;
  if (any(lessThan(local, vec2(0.0))) || any(greaterThan(local, vec2(1.0)))) return vec4(0.0);
  local.y = 1.0 - local.y;

  float index = body.w;
  vec2 atlasCell = vec2(mod(index, uEmoteGrid), floor(index / uEmoteGrid));
  float duration = uDurations[int(index)];
  float frame = floor(fract(uTime / duration + uPhases[i]) * uFrames);
  vec2 page = vec2(mod(frame, uPageGrid), floor(frame / uPageGrid));

  vec2 atlasUv = (page + (atlasCell + local) / uEmoteGrid) / uPageGrid;
  return textureLod(uAtlas, atlasUv, uAtlasLod);
}

void main() {
  vec2 charCoord = gl_FragCoord.xy / uCharSize;
  vec2 cell = floor(charCoord);
  vec2 cellCenter = (cell + 0.5) * uCharSize;

  // Topmost body with an opaque pixel here wins
  vec4 emote = vec4(0.0);
  for (int i = ${MAX_BODIES - 1}; i >= 0; i--) {
    if (i >= uCount) continue;
    vec4 sampled = sampleBody(i, cellCenter);
    if (sampled.a > 0.2) {
      emote = sampled;
      break;
    }
  }

  vec3 rgb = emote.a > 0.0 ? emote.rgb / emote.a : vec3(0.0);
  float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
  float density = mix(0.15, 1.0, luma) * smoothstep(0.2, 0.6, emote.a);

  float glyphIndex = min(floor(density * GLYPH_COUNT), GLYPH_COUNT - 1.0);
  vec2 glyphLocal = vec2(fract(charCoord.x), 1.0 - fract(charCoord.y));
  vec2 glyphUv = vec2((glyphIndex + glyphLocal.x) / GLYPH_COUNT, glyphLocal.y);
  vec2 glyphGradient = vec2(1.0 / GLYPH_COUNT, 1.0);
  float glyph = textureGrad(
    uGlyphs,
    glyphUv,
    dFdx(charCoord) * glyphGradient,
    dFdy(charCoord) * glyphGradient
  ).r;

  vec3 tone = mix(vec3(luma), rgb, ${IDLE_SATURATION.toFixed(2)});
  vec3 color = mix(vec3(0.35), vec3(1.0), tone) * ${IDLE_BRIGHTNESS.toFixed(2)};

  outColor = vec4(vec3(0.039) + color * glyph, 1.0);
}
`;

const shuffled = (count: number) => {
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
};

export function EmotePile({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl2", { antialias: false });
    if (!canvas || !gl) return;

    let disposed = false;
    let frame = 0;
    let cleanupInput: (() => void) | undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const start = async () => {
      // Physics is loaded only here, so it never lands in other pages' bundles
      const [{ atlas, layout }, { default: Matter }] = await Promise.all([
        loadAtlas(),
        import("matter-js"),
      ]);
      if (disposed) return;
      const { Bodies, Body, Composite, Constraint, Engine, Query } = Matter;

      const program = createProgram(gl, FRAGMENT_SHADER);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL call, not a React hook
      gl.useProgram(program);
      bindFullscreenTriangle(gl, program);
      uploadTexture(gl, 0, atlas, true);
      uploadTexture(gl, 1, createGlyphCanvas(), true);

      const uniform = (name: string) => gl.getUniformLocation(program, name);
      gl.uniform1i(uniform("uAtlas"), 0);
      gl.uniform1i(uniform("uGlyphs"), 1);
      gl.uniform1f(uniform("uEmoteGrid"), layout.emoteGrid);
      gl.uniform1f(uniform("uPageGrid"), layout.pageGrid);
      gl.uniform1f(uniform("uFrames"), layout.frames);
      gl.uniform1fv(uniform("uDurations"), layout.durations.slice(0, MAX_EMOTES));
      const uCharSize = uniform("uCharSize");
      const uAtlasLod = uniform("uAtlasLod");
      const uTime = uniform("uTime");
      const uSize = uniform("uSize");
      const uBodies = uniform("uBodies");
      const uCount = uniform("uCount");
      const uPhases = uniform("uPhases");

      // Physics runs in CSS pixels of the canvas, y down
      let width = canvas.clientWidth;
      let height = canvas.clientHeight;
      const size = emoteSize(width);
      const count = Math.min(
        MAX_BODIES,
        Math.max(6, Math.floor((MAX_COVERAGE * width * height) / (size * size)))
      );

      const engine = Engine.create();
      const floor = Bodies.rectangle(width / 2, height + WALL / 2, 1e4, WALL, {
        isStatic: true,
      });
      // Tall walls, so emotes thrown upwards come back down inside
      const left = Bodies.rectangle(-WALL / 2, 0, WALL, 1e4, { isStatic: true });
      const right = Bodies.rectangle(width + WALL / 2, 0, WALL, 1e4, { isStatic: true });

      const emotes = shuffled(Math.min(layout.durations.length, MAX_EMOTES));
      const bodies = Array.from({ length: count }, (_, i) =>
        Bodies.rectangle(
          size + Math.random() * Math.max(width - size * 2, 1),
          -size * (1 + i * 0.9),
          size,
          size,
          {
            angle: (Math.random() - 0.5) * 1.2,
            restitution: 0.15,
            friction: 0.5,
            frictionAir: 0.01,
            plugin: { emote: emotes[i % emotes.length], phase: Math.random() },
          }
        )
      );
      Composite.add(engine.world, [floor, left, right, ...bodies]);

      if (reducedMotion) {
        for (let i = 0; i < SETTLE_STEPS; i++) Engine.update(engine, STEP_MS);
      }

      // Draw order: the dragged emote moves to the top
      const order = [...bodies];
      let drag: Matter.Constraint | null = null;

      const toLocal = (event: { clientX: number; clientY: number }) => {
        const rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
      };
      const hit = (point: { x: number; y: number }) => {
        const found = Query.point(order, point);
        return found.length > 0
          ? order.filter((body) => found.includes(body)).at(-1)
          : undefined;
      };

      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        const point = toLocal(event);
        const body = hit(point);
        if (!body) return;

        order.splice(order.indexOf(body), 1);
        order.push(body);
        drag = Constraint.create({
          pointA: point,
          bodyB: body,
          pointB: { x: point.x - body.position.x, y: point.y - body.position.y },
          stiffness: 0.2,
          damping: 0.05,
          length: 0,
        });
        Composite.add(engine.world, drag);
        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = "grabbing";
      };
      const onPointerMove = (event: PointerEvent) => {
        const point = toLocal(event);
        if (drag) {
          drag.pointA = point;
          return;
        }
        canvas.style.cursor = hit(point) ? "grab" : "";
      };
      const onPointerUp = () => {
        if (!drag) return;
        Composite.remove(engine.world, drag);
        drag = null;
        canvas.style.cursor = "";
      };
      // A press on an emote must neither select text nor scroll the page on touch
      const onMouseDown = (event: MouseEvent) => {
        if (hit(toLocal(event))) event.preventDefault();
      };
      const onTouchStart = (event: TouchEvent) => {
        const touch = event.touches[0];
        if (touch && hit(toLocal(touch))) event.preventDefault();
      };

      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      canvas.addEventListener("lostpointercapture", onPointerUp);
      canvas.addEventListener("mousedown", onMouseDown);
      canvas.addEventListener("touchstart", onTouchStart, { passive: false });
      cleanupInput = () => {
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerUp);
        canvas.removeEventListener("lostpointercapture", onPointerUp);
        canvas.removeEventListener("mousedown", onMouseDown);
        canvas.removeEventListener("touchstart", onTouchStart);
      };

      const resize = () => {
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        Body.setPosition(floor, { x: width / 2, y: height + WALL / 2 });
        Body.setPosition(right, { x: width + WALL / 2, y: 0 });
        for (const body of bodies) {
          const x = Math.min(Math.max(body.position.x, size / 2), width - size / 2);
          const y = Math.min(body.position.y, height - size / 2);
          if (x !== body.position.x || y !== body.position.y)
            Body.setPosition(body, { x, y });
        }
      };

      const bodyData = new Float32Array(MAX_BODIES * 4);
      const phaseData = new Float32Array(MAX_BODIES);
      let last: number | null = null;
      let pending = 0;

      const render = (time: number) => {
        const dpr = Math.min(window.devicePixelRatio, 2);
        const pixelWidth = Math.floor(canvas.clientWidth * dpr);
        const pixelHeight = Math.floor(canvas.clientHeight * dpr);
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
          gl.viewport(0, 0, pixelWidth, pixelHeight);
          resize();
        }

        // Fixed steps keep the simulation the same on 60 and 120 Hz displays
        pending += Math.min(time - (last ?? time), 100);
        last = time;
        while (pending >= STEP_MS) {
          Engine.update(engine, STEP_MS);
          pending -= STEP_MS;
        }

        order.forEach((body, i) => {
          bodyData[i * 4] = body.position.x * dpr;
          bodyData[i * 4 + 1] = pixelHeight - body.position.y * dpr;
          bodyData[i * 4 + 2] = body.angle;
          bodyData[i * 4 + 3] = body.plugin.emote;
          phaseData[i] = body.plugin.phase;
        });

        gl.uniform2f(uCharSize, CHAR_W * dpr, CHAR_H * dpr);
        gl.uniform1f(uAtlasLod, Math.log2((CHAR_H * layout.cell) / size));
        gl.uniform1f(uSize, size * dpr);
        gl.uniform4fv(uBodies, bodyData);
        gl.uniform1fv(uPhases, phaseData);
        gl.uniform1i(uCount, order.length);
        gl.uniform1f(uTime, reducedMotion ? 0 : time / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        frame = requestAnimationFrame(render);
      };

      frame = requestAnimationFrame(render);
    };

    start().catch((error) => console.error("Emote pile failed", error));

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanupInput?.();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className ?? "absolute inset-0 -z-10 h-full w-full bg-neutral-950"}
    />
  );
}
