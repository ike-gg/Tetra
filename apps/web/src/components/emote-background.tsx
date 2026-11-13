import { useEffect, useRef } from "react";

const ATLAS_URL = "/emote-atlas.webp";
const ATLAS_LAYOUT_URL = "/emote-atlas.json";
const MAX_EMOTES = 64;

type AtlasLayout = {
  emoteGrid: number;
  pageGrid: number;
  frames: number;
  cell: number;
  durations: number[];
};

const GLYPHS = " .:-=+*#%@";
const GLYPH_TEXTURE_W = 32;
const GLYPH_TEXTURE_H = 48;
const GLYPH_FONT = `bold ${GLYPH_TEXTURE_H * 0.8}px "Geist Mono", ui-monospace, Menlo, monospace`;

// All sizes in CSS pixels
const CHAR_W = 7;
const CHAR_H = 11;
const EMOTE_SIZE = 220;
const REVEAL_RADIUS = 510;
// Cursor movement leaves a trail where the ASCII filter scrambles and melts into the
// emote image underneath, then settles back
const TRAIL_POINTS = 48;
const TRAIL_RADIUS = 55;
const TRAIL_SPACING = 14;
// Cursor speed (px per 60 Hz frame) that disturbs the field fully
const TRAIL_FULL_SPEED = 24;
const TRAIL_DECAY = 0.9;
// Clicking the background drops a pebble: a water ripple runs across the plane, lifting
// and bending the glyphs, with emote images glinting through on the crests
const CLICK_WAVES = 4;
const CLICK_WAVE_SPEED = 520;
const CLICK_WAVE_LIFE_MS = 1900;
// Width of the ripple packet and the distance between its rings
const CLICK_WAVE_WIDTH = 150;
const CLICK_WAVE_LENGTH = 64;
// How far the surface bends and lifts at a crest
const CLICK_WAVE_AMPLITUDE = 8;
const CLICK_IGNORE = "a, button, input, textarea, select, label, [role], [data-slot]";
const SCROLL_SPEED = 45;
// Page scroll moves the background this much slower, so it feels very far away
const PAGE_PARALLAX = 0.12;
// Brightness left after scrolling one viewport down, so sections below stay readable
const SCROLLED_DIM = 0.3;

// Horizon height as a multiple of the viewport height; lower = stronger tilt
const HORIZON = 1.9;
const IDLE_BRIGHTNESS = 0.5;
// How much of the original color leaks into the idle state (0 = grayscale)
const IDLE_SATURATION = 0.3;
const INTRO_DURATION_MS = 2200;

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uAtlas;
uniform sampler2D uGlyphs;
uniform vec2 uResolution;
uniform vec2 uCharSize;
uniform float uEmoteSize;
uniform float uAtlasLod;
uniform float uEmoteGrid;
uniform float uPageGrid;
uniform float uFrames;
uniform float uDurations[${MAX_EMOTES}];
uniform float uTime;
uniform float uScroll;
uniform float uHorizon;
uniform float uIdleBrightness;
uniform float uIdleSaturation;
uniform float uIntro;
uniform float uDim;
uniform vec2 uMouse;
uniform vec3 uTrail[${TRAIL_POINTS}];
uniform int uTrailCount;
uniform float uTrailRadius;
uniform float uAtlasCell;
uniform vec4 uClickWaves[${CLICK_WAVES}];
uniform int uClickWaveCount;
uniform float uClickWaveSpeed;
uniform float uClickWaveWidth;
uniform float uClickWaveLife;
uniform float uClickWaveLength;
uniform float uClickWaveAmplitude;
uniform float uReveal;
uniform float uRevealRadius;

out vec4 outColor;

const float GLYPH_COUNT = ${GLYPHS.length.toFixed(1)};
const vec3 WAVE_COLOR = vec3(0.965, 0.31, 0.008);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Screen space with y pointing up, projected onto a plane that recedes towards a
// horizon above the viewport. At the bottom edge one plane unit equals one pixel.
vec2 toPlane(vec2 screen) {
  float horizon = uResolution.y * uHorizon;
  float depth = horizon / (horizon - screen.y);
  return vec2((screen.x - uResolution.x * 0.5) * depth, horizon * (depth - 1.0));
}

// Premultiplied color of the emote frame at a point of the scrolling plane
vec4 sampleEmote(vec2 world, float lod) {
  vec2 tileCoord = world / uEmoteSize;
  tileCoord.x += mod(floor(tileCoord.y), 2.0) * 0.5;
  vec2 tile = floor(tileCoord);
  vec2 local = vec2(fract(tileCoord.x), 1.0 - fract(tileCoord.y));

  float index = floor(hash(tile) * uEmoteGrid * uEmoteGrid);
  vec2 atlasCell = vec2(mod(index, uEmoteGrid), floor(index / uEmoteGrid));

  float duration = uDurations[int(index)];
  float frame = floor(fract(uTime / duration + hash(tile + 3.1)) * uFrames);
  vec2 page = vec2(mod(frame, uPageGrid), floor(frame / uPageGrid));

  vec2 atlasUv = (page + (atlasCell + local) / uEmoteGrid) / uPageGrid;
  return textureLod(uAtlas, atlasUv, lod);
}

void main() {
  vec2 screen = gl_FragCoord.xy;
  vec2 plane = toPlane(screen);
  vec2 world = plane - vec2(0.0, uScroll);

  // Cursor effects are measured on the plane, so they follow its perspective
  vec2 mouse = vec2(uMouse.x, clamp(uMouse.y, 0.0, uResolution.y));
  float mouseDistance = length(plane - toPlane(mouse));

  float disturb = 0.0;
  for (int i = 0; i < ${TRAIL_POINTS}; i++) {
    if (i >= uTrailCount) break;
    vec3 point = uTrail[i];
    float d = length(plane - point.xy) / uTrailRadius;
    disturb = max(disturb, point.z * exp(-d * d));
  }

  // Water ripples: a packet of rings around each expanding front. The surface height
  // lifts the content and its slope bends it outwards, like refraction through water.
  float waterHeight = 0.0;
  vec2 waterOffset = vec2(0.0);
  for (int i = 0; i < ${CLICK_WAVES}; i++) {
    if (i >= uClickWaveCount) break;
    vec4 wave = uClickWaves[i];
    vec2 fromCenter = plane - wave.xy;
    float d = length(fromCenter);
    float x = d - wave.z * uClickWaveSpeed;
    // Short lead in front of the ring, a longer tail of smaller rings behind it
    float spread = uClickWaveWidth * (x < 0.0 ? 0.9 : 0.35);
    float life = 1.0 - wave.z / uClickWaveLife;
    float envelope = exp(-(x * x) / (spread * spread)) * life * life;
    float phase = x / uClickWaveLength * 6.2832;

    waterHeight += sin(phase) * envelope;
    waterOffset += (d > 0.0 ? fromCenter / d : vec2(0.0)) * cos(phase) * envelope;
  }
  world -= waterOffset * uClickWaveAmplitude + vec2(0.0, waterHeight * uClickWaveAmplitude);
  float crest = clamp(waterHeight, 0.0, 1.0);
  disturb = max(disturb, crest * crest * 0.5);
  float waveEdge = crest * crest * 0.25;
  float waterLight = 1.0 + waterHeight * 0.25;

  vec2 charCoord = world / uCharSize;
  vec2 cell = floor(charCoord);
  vec2 cellCenter = (cell + 0.5) * uCharSize;
  vec4 emote = sampleEmote(cellCenter, uAtlasLod);

  vec3 rgb = emote.a > 0.0 ? emote.rgb / emote.a : vec3(0.0);
  float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
  // Dark but opaque pixels still get a glyph, so outlines keep the emote's silhouette
  float density = mix(0.15, 1.0, luma) * smoothstep(0.2, 0.6, emote.a);

  float glyphIndex = min(floor(density * GLYPH_COUNT), GLYPH_COUNT - 1.0);
  float tick = floor(uTime * 24.0);
  if (hash(cell + tick) < disturb * 0.8) {
    glyphIndex = floor(hash(cell * 1.7 + tick) * GLYPH_COUNT);
  }
  vec2 glyphLocal = vec2(fract(charCoord.x), 1.0 - fract(charCoord.y));
  vec2 glyphUv = vec2((glyphIndex + glyphLocal.x) / GLYPH_COUNT, glyphLocal.y);
  vec2 glyphGradient = vec2(1.0 / GLYPH_COUNT, 1.0);
  float glyph = textureGrad(
    uGlyphs,
    glyphUv,
    dFdx(charCoord) * glyphGradient,
    dFdy(charCoord) * glyphGradient
  ).r;

  float reveal = uReveal * (1.0 - smoothstep(uRevealRadius * 0.25, uRevealRadius, mouseDistance));

  vec3 tone = mix(vec3(luma), rgb, uIdleSaturation);
  vec3 gray = mix(vec3(0.35), vec3(1.0), tone) * uIdleBrightness;
  vec3 colored = rgb * 1.15;
  vec3 color = mix(gray, colored, reveal);
  color = mix(color, WAVE_COLOR * mix(0.9, 1.5, luma), waveEdge);

  float fade = 1.0 - smoothstep(0.35, 1.0, screen.y / uResolution.y) * 0.9;

  vec3 background = vec3(0.039);
  // Intro: cells pop in as a ring expanding from the bottom center, trailed by a band of the brand color
  vec2 origin = vec2(uResolution.x * 0.5, 0.0);
  float maxDistance = length(vec2(uResolution.x * 0.5, uResolution.y));
  float threshold = (length(screen - origin) / maxDistance) * 0.75 + hash(cell + 17.0) * 0.25;
  float shown = smoothstep(threshold, threshold + 0.04, uIntro * 1.15);
  float flash = shown * (1.0 - smoothstep(threshold + 0.04, threshold + 0.3, uIntro * 1.15));
  color = mix(color, WAVE_COLOR * mix(0.8, 1.4, luma), flash);

  vec3 ascii = color * glyph;

  // Where the trail is strong the filter melts into the slightly blurred emote image
  float depth = 1.0 / (1.0 - screen.y / (uResolution.y * uHorizon));
  float pixelLod = log2(max(uAtlasCell / uEmoteSize * depth, 0.0001)) + 0.8;
  vec4 image = sampleEmote(world, pixelLod);
  vec3 melted = image.rgb - background * image.a;
  float melt = smoothstep(0.2, 0.95, disturb) * 0.85;

  vec3 layer = mix(ascii, melted, melt);
  outColor = vec4(background + layer * waterLight * fade * shown * uDim, 1.0);
}
`;

const createGlyphCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.width = GLYPH_TEXTURE_W * GLYPHS.length;
  canvas.height = GLYPH_TEXTURE_H;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas is not available");

  context.fillStyle = "#fff";
  context.font = GLYPH_FONT;
  context.textAlign = "center";
  context.textBaseline = "middle";

  [...GLYPHS].forEach((glyph, index) => {
    context.fillText(glyph, (index + 0.5) * GLYPH_TEXTURE_W, GLYPH_TEXTURE_H / 2);
  });

  return canvas;
};

const compileShader = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Cannot create shader");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compilation failed");
  }

  return shader;
};

const createProgram = (gl: WebGL2RenderingContext) => {
  const program = gl.createProgram();

  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Program linking failed");
  }

  return program;
};

const uploadTexture = (
  gl: WebGL2RenderingContext,
  unit: number,
  source: TexImageSource,
  mipmaps: boolean
) => {
  const texture = gl.createTexture();

  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  if (mipmaps) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
};

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });

export function EmoteBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl2", { antialias: false });
    if (!canvas || !gl) return;

    let disposed = false;
    let frame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const mouse = { x: -1e4, y: -1e4 };
    const trail: { x: number; y: number; strength: number }[] = [];
    const lastPointer = { x: 0, y: 0, time: 0, tracking: false };
    let reveal = 0;
    let revealTarget = 0;

    const onPointerMove = (event: PointerEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      revealTarget = 1;
    };
    const clickWaves: { x: number; y: number; start: number }[] = [];

    const onPointerDown = (event: PointerEvent) => {
      if (reducedMotion || event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest(CLICK_IGNORE)) return;

      clickWaves.push({ x: event.clientX, y: event.clientY, start: performance.now() });
      if (clickWaves.length > CLICK_WAVES) clickWaves.shift();
    };
    // Rapid clicks fire waves; without this, double and triple clicks select page text.
    // Dragging to select still works, since that starts with a single click.
    const onMouseDown = (event: MouseEvent) => {
      if (event.detail < 2) return;
      if (event.target instanceof Element && event.target.closest(CLICK_IGNORE)) return;
      event.preventDefault();
    };
    const onPointerLeave = () => {
      revealTarget = 0;
      lastPointer.tracking = false;
    };

    const start = async () => {
      const [atlas, layout] = await Promise.all([
        loadImage(ATLAS_URL),
        fetch(ATLAS_LAYOUT_URL).then(
          (response) => response.json() as Promise<AtlasLayout>
        ),
        // The glyph canvas is drawn once, so the brand font has to be ready before that
        document.fonts.load(GLYPH_FONT).catch(() => undefined),
      ]);
      if (disposed) return;

      const program = createProgram(gl);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL call, not a React hook
      gl.useProgram(program);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW
      );
      const position = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      uploadTexture(gl, 0, atlas, true);
      uploadTexture(gl, 1, createGlyphCanvas(), true);

      const uniform = (name: string) => gl.getUniformLocation(program, name);
      gl.uniform1i(uniform("uAtlas"), 0);
      gl.uniform1i(uniform("uGlyphs"), 1);

      const uResolution = uniform("uResolution");
      const uCharSize = uniform("uCharSize");
      const uEmoteSize = uniform("uEmoteSize");
      const uAtlasLod = uniform("uAtlasLod");
      const uScroll = uniform("uScroll");
      const uDim = uniform("uDim");
      const uMouse = uniform("uMouse");
      const uTrail = uniform("uTrail");
      const uTrailCount = uniform("uTrailCount");
      const uTrailRadius = uniform("uTrailRadius");
      gl.uniform1f(uniform("uAtlasCell"), layout.cell);
      const trailData = new Float32Array(TRAIL_POINTS * 3);
      const uReveal = uniform("uReveal");
      const uRevealRadius = uniform("uRevealRadius");

      gl.uniform1f(uniform("uHorizon"), HORIZON);
      gl.uniform1f(uniform("uIdleBrightness"), IDLE_BRIGHTNESS);
      gl.uniform1f(uniform("uIdleSaturation"), IDLE_SATURATION);
      const uIntro = uniform("uIntro");
      let introStart: number | null = null;

      // One sample per character cell: pick the mip level whose texel matches the cell height
      gl.uniform1f(uAtlasLod, Math.log2((CHAR_H * layout.cell) / EMOTE_SIZE));
      gl.uniform1f(uniform("uEmoteGrid"), layout.emoteGrid);
      gl.uniform1f(uniform("uPageGrid"), layout.pageGrid);
      gl.uniform1f(uniform("uFrames"), layout.frames);
      gl.uniform1fv(uniform("uDurations"), layout.durations.slice(0, MAX_EMOTES));
      const uTime = uniform("uTime");

      // Speeds and decay are per 60 Hz frame, so the trail feels the same on fast displays
      const updateTrail = (time: number) => {
        const frames = Math.max((time - lastPointer.time) / (1000 / 60), 0.25);
        const decay = TRAIL_DECAY ** frames;

        for (const point of trail) point.strength *= decay;
        while (trail.length > 0 && trail[0].strength < 0.02) trail.shift();

        const pointerActive = !reducedMotion && mouse.x > -1e3;
        if (pointerActive && lastPointer.tracking) {
          const dx = mouse.x - lastPointer.x;
          const dy = mouse.y - lastPointer.y;
          const distance = Math.hypot(dx, dy);
          const strength = Math.min(distance / frames / TRAIL_FULL_SPEED, 1);
          const steps = Math.min(Math.ceil(distance / TRAIL_SPACING), TRAIL_POINTS);

          for (let step = 1; step <= steps && distance > 1; step++) {
            trail.push({
              x: lastPointer.x + (dx * step) / steps,
              y: lastPointer.y + (dy * step) / steps,
              strength,
            });
          }
          if (trail.length > TRAIL_POINTS) trail.splice(0, trail.length - TRAIL_POINTS);
        }

        lastPointer.x = mouse.x;
        lastPointer.y = mouse.y;
        lastPointer.time = time;
        lastPointer.tracking = pointerActive;
      };

      const uploadTrail = (width: number, height: number, dpr: number) => {
        const horizon = height * HORIZON;

        trail.forEach((point, i) => {
          const y = Math.min(height - point.y * dpr, height);
          const depth = horizon / (horizon - y);
          trailData[i * 3] = (point.x * dpr - width / 2) * depth;
          trailData[i * 3 + 1] = horizon * (depth - 1);
          trailData[i * 3 + 2] = point.strength;
        });

        gl.uniform3fv(uTrail, trailData);
        gl.uniform1i(uTrailCount, trail.length);
        gl.uniform1f(uTrailRadius, TRAIL_RADIUS * dpr);
      };

      const uClickWaves = uniform("uClickWaves");
      const uClickWaveCount = uniform("uClickWaveCount");
      gl.uniform1f(uniform("uClickWaveLife"), CLICK_WAVE_LIFE_MS / 1000);
      const uClickWaveSpeed = uniform("uClickWaveSpeed");
      const uClickWaveWidth = uniform("uClickWaveWidth");
      const uClickWaveLength = uniform("uClickWaveLength");
      const uClickWaveAmplitude = uniform("uClickWaveAmplitude");
      const clickWaveData = new Float32Array(CLICK_WAVES * 4);

      const uploadClickWaves = (
        time: number,
        width: number,
        height: number,
        dpr: number
      ) => {
        while (clickWaves.length > 0 && time - clickWaves[0].start > CLICK_WAVE_LIFE_MS) {
          clickWaves.shift();
        }

        const horizon = height * HORIZON;
        clickWaves.forEach((wave, i) => {
          const y = Math.min(height - wave.y * dpr, height);
          const depth = horizon / (horizon - y);
          clickWaveData[i * 4] = (wave.x * dpr - width / 2) * depth;
          clickWaveData[i * 4 + 1] = horizon * (depth - 1);
          clickWaveData[i * 4 + 2] = Math.max(time - wave.start, 0) / 1000;
        });

        gl.uniform4fv(uClickWaves, clickWaveData);
        gl.uniform1i(uClickWaveCount, clickWaves.length);
        gl.uniform1f(uClickWaveSpeed, CLICK_WAVE_SPEED * dpr);
        gl.uniform1f(uClickWaveWidth, CLICK_WAVE_WIDTH * dpr);
        gl.uniform1f(uClickWaveLength, CLICK_WAVE_LENGTH * dpr);
        gl.uniform1f(uClickWaveAmplitude, CLICK_WAVE_AMPLITUDE * dpr);
      };

      const render = (time: number) => {
        const dpr = Math.min(window.devicePixelRatio, 2);
        const width = Math.floor(canvas.clientWidth * dpr);
        const height = Math.floor(canvas.clientHeight * dpr);

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }

        reveal += (revealTarget - reveal) * 0.08;
        updateTrail(time);

        const pageScroll = window.scrollY;
        const autoScroll = reducedMotion ? 0 : (time / 1000) * SCROLL_SPEED;
        const scroll = autoScroll + pageScroll * PAGE_PARALLAX;
        const scrolled = Math.min(pageScroll / window.innerHeight, 1);
        introStart ??= time;
        const intro = reducedMotion
          ? 1
          : Math.min((time - introStart) / INTRO_DURATION_MS, 1);

        gl.uniform2f(uResolution, width, height);
        gl.uniform2f(uCharSize, CHAR_W * dpr, CHAR_H * dpr);
        gl.uniform1f(uEmoteSize, EMOTE_SIZE * dpr);
        gl.uniform1f(uScroll, scroll * dpr);
        gl.uniform1f(uDim, 1 - (1 - SCROLLED_DIM) * scrolled);
        gl.uniform2f(uMouse, mouse.x * dpr, height - mouse.y * dpr);
        uploadTrail(width, height, dpr);
        uploadClickWaves(time, width, height, dpr);
        gl.uniform1f(uReveal, reveal);
        gl.uniform1f(uIntro, 1 - (1 - intro) ** 3);
        gl.uniform1f(uTime, reducedMotion ? 0 : time / 1000);
        gl.uniform1f(uRevealRadius, REVEAL_RADIUS * dpr);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        frame = requestAnimationFrame(render);
      };

      frame = requestAnimationFrame(render);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("mousedown", onMouseDown);
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    start().catch((error) => console.error("Emote background failed", error));

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("mousedown", onMouseDown);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full bg-neutral-950"
    />
  );
}
