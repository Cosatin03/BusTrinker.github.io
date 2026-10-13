import { WHEEL } from "./roulette-core.js";
const TAU = Math.PI * 2;
const STEP = TAU / WHEEL.length;
const clamp = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
export function restingAngle(number = 0) {
  return -Math.PI / 2 + WHEEL.indexOf(number) * STEP;
}
// Reproducible motion keeps a restored spin and its recorded winning pocket aligned.
// The ball follows a rail/drop/bounce trajectory, then couples to the moving pocket.
// This is an animated trajectory, not a rigid-body physics engine.
export function roulettePose(number, elapsed, duration, previousNumber = 0) {
  const t = clamp(elapsed / (duration * 1000));
  const start = restingAngle(previousNumber);
  const target = restingAngle(number);
  const delta = (((target - start) % TAU) + TAU) % TAU;
  const end = start + TAU * 4 + delta;
  const wheelAngle = start + (end - start) * (1 - (1 - t) ** 1.7);
  const freeAngle = (u) => start + TAU * 7.5 * Math.exp(-3.1 * u);
  const drop = smooth((t - 0.52) / 0.44);
  const capture = smooth((t - 0.74) / 0.24);
  const pocket = -WHEEL.indexOf(number) * STEP;
  const wheelAtCapture = start + (end - start) * (1 - (1 - 0.74) ** 1.7);
  const offset =
    TAU * Math.round((pocket + wheelAtCapture - freeAngle(0.74)) / TAU);
  const pocketAngle = pocket + wheelAngle - offset;
  const ballAngle = freeAngle(t) * (1 - capture) + pocketAngle * capture;
  const radius =
    2.54 - 0.69 * drop + 0.07 * Math.sin(drop * Math.PI * 8) * (1 - drop);
  const height =
    0.29 +
    0.13 * (1 - drop) +
    0.2 * Math.abs(Math.sin(drop * Math.PI * 5)) * (1 - drop);
  return {
    wheelAngle,
    ballAngle,
    radius,
    height,
    progress: t,
    stage:
      t < 0.52
        ? "Kugel in der Laufbahn"
        : t < 0.74
          ? "Die Kugel fällt"
          : t < 0.98
            ? "Abpraller an den Fächern"
            : "Kugel im Gewinnfach",
  };
}
