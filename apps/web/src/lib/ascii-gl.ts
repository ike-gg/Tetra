// WebGL helpers shared by the ASCII emote fields (homepage background, 404 page): the
// emote atlas, the glyph texture and the shader plumbing.

export const ATLAS_URL = "/emote-atlas.webp";
export const ATLAS_LAYOUT_URL = "/emote-atlas.json";
export const MAX_EMOTES = 64;

export type AtlasLayout = {
  emoteGrid: number;
  pageGrid: number;
  frames: number;
  cell: number;
  durations: number[];
};

export const GLYPHS = " .:-=+*#%@";
const GLYPH_TEXTURE_W = 32;
const GLYPH_TEXTURE_H = 48;
export const GLYPH_FONT = `bold ${GLYPH_TEXTURE_H * 0.8}px "Geist Mono", ui-monospace, Menlo, monospace`;

// Character cell in CSS pixels
export const CHAR_W = 7;
export const CHAR_H = 11;

export const FULLSCREEN_VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const createGlyphCanvas = () => {
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

export const createProgram = (gl: WebGL2RenderingContext, fragmentShader: string) => {
  const program = gl.createProgram();

  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, FULLSCREEN_VERTEX_SHADER));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Program linking failed");
  }

  return program;
};

// One triangle that covers the whole viewport
export const bindFullscreenTriangle = (
  gl: WebGL2RenderingContext,
  program: WebGLProgram
) => {
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
};

export const uploadTexture = (
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

// The atlas image, its layout, and the brand font (the glyph canvas is drawn once, so the
// font has to be ready before that)
export const loadAtlas = async () => {
  const [atlas, layout] = await Promise.all([
    loadImage(ATLAS_URL),
    fetch(ATLAS_LAYOUT_URL).then((response) => response.json() as Promise<AtlasLayout>),
    document.fonts.load(GLYPH_FONT).catch(() => undefined),
  ]);
  return { atlas, layout };
};
