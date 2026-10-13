import test from "node:test";
import assert from "node:assert/strict";
import { roulettePose, restingAngle } from "../roulette-motion.js";
const TAU = 2 * Math.PI;
const angularDistance = (a, b) =>
  Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
test("every winning pocket aligns with the ball after every supported spin duration", () => {
  for (const duration of [3, 8, 12])
    for (let number = 0; number <= 36; number++)
      for (const previous of [0, 1, 16, 36]) {
        const pose = roulettePose(number, duration * 1000, duration, previous);
        const pocket =
          (-[
            0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
            10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3,
            26,
          ].indexOf(number) *
            TAU) /
          37;
        assert.ok(
          angularDistance(pose.ballAngle, pose.wheelAngle + pocket) < 1e-9,
        );
        assert.ok(
          angularDistance(pose.wheelAngle, restingAngle(number)) < 1e-9,
        );
        assert.equal(pose.radius, 1.85);
        assert.equal(pose.height, 0.29);
      }
});
test("rad and ball counter-rotate, motion continues late in the spin and restoration is reproducible", () => {
  const a = roulettePose(16, 400, 8, 1),
    b = roulettePose(16, 900, 8, 1);
  assert.ok(b.wheelAngle > a.wheelAngle);
  assert.ok(b.ballAngle < a.ballAngle);
  assert.ok(
    roulettePose(16, 7800, 8, 1).wheelAngle -
      roulettePose(16, 7400, 8, 1).wheelAngle >
      0.1,
  );
  for (let time = 0; time <= 8000; time += 20) {
    const pose = roulettePose(16, time, 8, 1);
    assert.deepEqual(pose, roulettePose(16, time, 8, 1));
    assert.ok(pose.radius >= 1.75 && pose.radius <= 2.6);
    assert.ok(pose.height >= 0.29 && pose.height <= 0.7);
  }
});
