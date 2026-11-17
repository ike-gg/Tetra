import { useEffect, useRef, useState } from "react";

import type { Crop } from "@/lib/media/edit";
import type { MediaInfo } from "@/lib/media/media-file";

// A critically damped spring (no overshoot) with a 0.3 s response: it reads as done in
// about 300 ms. A spring rather than a fixed curve, so a new target mid-flight carries the
// current velocity instead of restarting.
const OMEGA = (2 * Math.PI) / 0.3;
// In image pixels: below this the selection is where it's going
const REST = 0.05;
const KEYS = ["x", "y", "width", "height"] as const;

const ZERO: Crop = { x: 0, y: 0, width: 0, height: 0 };

type Motion = {
  value: Crop;
  velocity: Crop;
  target: Crop;
  // What the draft becomes once settled: null keeps "no crop" as null
  result: Crop | null;
  last: number;
};

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The crop as shown, ahead of the committed one: it follows a drag live, and animates
// between shapes, while the edit (and so the render) only changes on commit
export function useCropDraft(info: MediaInfo, committed: Crop | null) {
  const [draft, setDraft] = useState<Crop | null>(committed);
  const [animating, setAnimating] = useState(false);
  const motion = useRef<Motion | null>(null);
  const frame = useRef<number | null>(null);
  const shown = useRef(draft);
  shown.current = draft;

  const stop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    motion.current = null;
    setAnimating(false);
  };

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    []
  );

  // Reset or a restored edit replace the crop from outside; an animation already
  // heads to the committed crop
  useEffect(() => {
    if (!motion.current) setDraft(committed);
  }, [committed]);

  const step = (now: number) => {
    const current = motion.current;
    if (!current) return;
    const dt = Math.max(0, Math.min(0.064, (now - current.last) / 1000));
    current.last = now;
    const decay = Math.exp(-OMEGA * dt);
    const value = { ...current.value };
    const velocity = { ...current.velocity };
    let settled = true;
    for (const key of KEYS) {
      const offset = current.value[key] - current.target[key];
      const speed = current.velocity[key];
      const c = speed + OMEGA * offset;
      const nextOffset = (offset + c * dt) * decay;
      velocity[key] = (speed - OMEGA * c * dt) * decay;
      value[key] = current.target[key] + nextOffset;
      if (Math.abs(nextOffset) > REST || Math.abs(velocity[key]) > REST * OMEGA) {
        settled = false;
      }
    }
    if (settled) {
      frame.current = null;
      motion.current = null;
      setAnimating(false);
      setDraft(current.result);
      return;
    }
    current.value = value;
    current.velocity = velocity;
    setDraft(value);
    frame.current = requestAnimationFrame(step);
  };

  // From what's on screen now, keeping the velocity of an animation it interrupts
  const animateTo = (target: Crop | null) => {
    if (reducedMotion()) {
      stop();
      setDraft(target);
      return;
    }
    const full = { x: 0, y: 0, width: info.width, height: info.height };
    motion.current = {
      value: motion.current?.value ?? shown.current ?? full,
      velocity: motion.current?.velocity ?? ZERO,
      target: target ?? full,
      result: target,
      last: performance.now(),
    };
    setAnimating(true);
    if (frame.current === null) frame.current = requestAnimationFrame(step);
  };

  // A grab or a key press takes over from wherever an animation is
  const set = (crop: Crop | null) => {
    if (motion.current) stop();
    setDraft(crop);
  };

  return { draft, animating, set, animateTo, stop };
}
