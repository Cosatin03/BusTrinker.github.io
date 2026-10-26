// Pure shake detector: no DOM or network dependencies.
export const SHAKE_DEFAULTS = Object.freeze({ threshold: 8.5, releaseThreshold: 3.0, minIntervalMs: 180, maxGapMs: 420, gravityAlpha: 0.86, minAlternation: 1.8 });
export class ShakeDetector {
  constructor(options = {}) { this.settings = { ...SHAKE_DEFAULTS, ...options }; this.reset(); }
  reset() { this.gravity = [0, 0, 0]; this.lastTime = -Infinity; this.lastShake = -Infinity; this.armed = true; this.lastDirection = 0; this.lastImpulse = 0; this.score = 0; }
  sample(data) {
    const t = Number(data.time);
    if (!Number.isFinite(t) || t <= this.lastTime) return false;
    const dt = t - this.lastTime;
    if (dt > this.settings.maxGapMs) { this.armed = true; this.lastDirection = 0; this.lastImpulse = 0; }
    this.lastTime = t;
    const coords = [data.x, data.y, data.z].map(Number);
    if (coords.some(v => !Number.isFinite(v))) return false;
    let values = coords;
    if (data.includesGravity) {
      const alpha = Math.pow(this.settings.gravityAlpha, Math.max(1, Math.min(dt || 16.7, 100) / 16.7));
      this.gravity = this.gravity.map((v,i) => alpha*v+(1-alpha)*coords[i]);
      values = coords.map((v,i) => v-this.gravity[i]);
    }
    const magnitude = Math.hypot(...values);
    const dominant = values.reduce((best,v,i) => Math.abs(v)>Math.abs(values[best])?i:best,0);
    const sign = Math.sign(values[dominant]);
    if (magnitude < this.settings.releaseThreshold) { this.armed = true; return false; }
    if (magnitude < this.settings.threshold || !this.armed || t-this.lastShake < this.settings.minIntervalMs) return false;
    // An impulse after a released low-acceleration valley; no callback-based points.
    // A direction change is extra evidence, not required after a fully released valley.
    this.armed = false;
    this.lastDirection = sign;
    this.lastImpulse = magnitude;
    this.lastShake = t;
    this.score++;
    return true;
  }
}
export function standings(players) {
  const sorted = [...players].sort((a,b)=>b.score-a.score);
  return sorted.map((p,i)=>({...p,rank:1+sorted.filter(other=>other.score>p.score).length}));
}
