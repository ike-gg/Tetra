export default function (...lines: (string | false)[]) {
  return lines.filter((text) => text).join("\n");
}
