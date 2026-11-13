// Y-axis-only shake detector for continuous up/down motion.
// A full up/down cycle (two opposite threshold crossings) counts one point.
export const SHAKE_DEFAULTS = Object.freeze({
  threshold: 5.5, minIntervalMs: 65, maxGapMs: 500,
});
export class ShakeDetector {
  constructor(options = {}) { this.settings = { ...SHAKE_DEFAULTS, ...options }; this.reset(); }
  reset() {
    this.lastTime = -Infinity;
    this.lastImpulseTime = -Infinity;
    this.halfCycle = false;
    this.lastDirection = 0;
    this.gravityBaseline = null;
    this.score = 0;
  }
  sample(data) {
    const t = Number(data.time);
    if (!Number.isFinite(t) || t <= this.lastTime) return false;
    if (t - this.lastTime > this.settings.maxGapMs) {
      this.lastDirection = 0;
      this.halfCycle = false;
    }
    this.lastTime = t;

    // Ignore X and Z completely. Prefer acceleration without gravity.
    const rawY = data.y;
    if (typeof rawY !== "number" || !Number.isFinite(rawY)) return false;
    let y = rawY;
    if (data.includesGravity) {
      // Keep a fixed resting baseline for sensors that expose only gravity-inclusive Y.
      if (this.gravityBaseline === null) this.gravityBaseline = rawY;
      y -= this.gravityBaseline;
    }
    if (Math.abs(y) < this.settings.threshold) return false;
    const direction = Math.sign(y);
    if (direction === this.lastDirection) return false;
    if (t - this.lastImpulseTime < this.settings.minIntervalMs) return false;
    this.lastDirection = direction;
    this.lastImpulseTime = t;
    if (!this.halfCycle) {
      this.halfCycle = true;
      return false;
    }
    this.halfCycle = false;
    this.score++;
    return true;
  }
}
export function standings(players) {
  const sorted = [...players].sort((a,b)=>b.score-a.score);
  return sorted.map((p,i)=>({...p,rank:1+sorted.filter(other=>other.score>p.score).length}));
}
