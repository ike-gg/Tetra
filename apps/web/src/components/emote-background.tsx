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

// All sizes in CSS pixels
const CHAR_W = 7;
const CHAR_H = 11;
const EMOTE_SIZE = 220;
const REVEAL_RADIUS = 220;
const SCROLL_SPEED = 45;

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
uniform vec2 uMouse;
uniform float uReveal;
uniform float uRevealRadius;

out vec4 outColor;

const float GLYPH_COUNT = ${GLYPHS.length.toFixed(1)};
const vec3 WAVE_COLOR = vec3(0.965, 0.31, 0.008);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  // Screen space with y pointing up, projected onto a plane that recedes towards a
  // horizon above the viewport. At the bottom edge one plane unit equals one pixel.
  vec2 screen = gl_FragCoord.xy;
  float horizon = uResolution.y * uHorizon;
  float depth = horizon / (horizon - screen.y);
  vec2 plane = vec2((screen.x - uResolution.x * 0.5) * depth, horizon * (depth - 1.0));
  vec2 world = plane - vec2(0.0, uScroll);

  vec2 charCoord = world / uCharSize;
  vec2 cell = floor(charCoord);
  vec2 cellCenter = (cell + 0.5) * uCharSize;

  vec2 tileCoord = cellCenter / uEmoteSize;
  tileCoord.x += mod(floor(tileCoord.y), 2.0) * 0.5;
  vec2 tile = floor(tileCoord);
  vec2 local = vec2(fract(tileCoord.x), 1.0 - fract(tileCoord.y));

  float index = floor(hash(tile) * uEmoteGrid * uEmoteGrid);
  vec2 atlasCell = vec2(mod(index, uEmoteGrid), floor(index / uEmoteGrid));

  float duration = uDurations[int(index)];
  float frame = floor(fract(uTime / duration + hash(tile + 3.1)) * uFrames);
  vec2 page = vec2(mod(frame, uPageGrid), floor(frame / uPageGrid));

  vec2 atlasUv = (page + (atlasCell + local) / uEmoteGrid) / uPageGrid;
  vec4 emote = textureLod(uAtlas, atlasUv, uAtlasLod);

  vec3 rgb = emote.a > 0.0 ? emote.rgb / emote.a : vec3(0.0);
  float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
  // Dark but opaque pixels still get a glyph, so outlines keep the emote's silhouette
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

  float distanceToMouse = length(screen - uMouse);
  float reveal = uReveal * (1.0 - smoothstep(uRevealRadius * 0.25, uRevealRadius, distanceToMouse));

  vec3 tone = mix(vec3(luma), rgb, uIdleSaturation);
  vec3 gray = mix(vec3(0.35), vec3(1.0), tone) * uIdleBrightness;
  vec3 colored = rgb * 1.15;
  vec3 color = mix(gray, colored, reveal);

  float fade = 1.0 - smoothstep(0.35, 1.0, screen.y / uResolution.y) * 0.9;

  vec3 background = vec3(0.039);
  // Intro: cells pop in as a ring expanding from the bottom center, trailed by a band of the brand color
  vec2 origin = vec2(uResolution.x * 0.5, 0.0);
  float maxDistance = length(vec2(uResolution.x * 0.5, uResolution.y));
  float threshold = (length(screen - origin) / maxDistance) * 0.75 + hash(cell + 17.0) * 0.25;
  float shown = smoothstep(threshold, threshold + 0.04, uIntro * 1.15);
  float flash = shown * (1.0 - smoothstep(threshold + 0.04, threshold + 0.3, uIntro * 1.15));
  color = mix(color, WAVE_COLOR * mix(0.8, 1.4, luma), flash);

  outColor = vec4(background + color * glyph * fade * shown, 1.0);
}
`;

const createGlyphCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.width = GLYPH_TEXTURE_W * GLYPHS.length;
  canvas.height = GLYPH_TEXTURE_H;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas is not available");

  context.fillStyle = "#fff";
  context.font = `bold ${GLYPH_TEXTURE_H * 0.8}px ui-monospace, Menlo, monospace`;
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

    const mouse = { x: -1e4, y: -1e4, targetX: -1e4, targetY: -1e4 };
    let reveal = 0;
    let revealTarget = 0;

    const onPointerMove = (event: PointerEvent) => {
      if (mouse.x < -1e3) {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
      }
      mouse.targetX = event.clientX;
      mouse.targetY = event.clientY;
      revealTarget = 1;
    };
    const onPointerLeave = () => {
      revealTarget = 0;
    };

    const start = async () => {
      const [atlas, layout] = await Promise.all([
        loadImage(ATLAS_URL),
        fetch(ATLAS_LAYOUT_URL).then(
          (response) => response.json() as Promise<AtlasLayout>
        ),
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
      const uMouse = uniform("uMouse");
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

      const render = (time: number) => {
        const dpr = Math.min(window.devicePixelRatio, 2);
        const width = Math.floor(canvas.clientWidth * dpr);
        const height = Math.floor(canvas.clientHeight * dpr);

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }

        mouse.x += (mouse.targetX - mouse.x) * 0.15;
        mouse.y += (mouse.targetY - mouse.y) * 0.15;
        reveal += (revealTarget - reveal) * 0.08;

        const scroll = reducedMotion ? 0 : (time / 1000) * SCROLL_SPEED;
        introStart ??= time;
        const intro = reducedMotion
          ? 1
          : Math.min((time - introStart) / INTRO_DURATION_MS, 1);

        gl.uniform2f(uResolution, width, height);
        gl.uniform2f(uCharSize, CHAR_W * dpr, CHAR_H * dpr);
        gl.uniform1f(uEmoteSize, EMOTE_SIZE * dpr);
        gl.uniform1f(uScroll, scroll * dpr);
        gl.uniform2f(uMouse, mouse.x * dpr, height - mouse.y * dpr);
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
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    start().catch((error) => console.error("Emote background failed", error));

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
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
