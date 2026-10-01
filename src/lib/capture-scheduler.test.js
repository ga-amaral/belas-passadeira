/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const { canAutoCapture, toCaptureIntervalMs } = require("./capture-scheduler");

test("allows an automatic capture only when the camera is ready and no piece is being processed", () => {
  assert.equal(canAutoCapture({ automatic: true, ready: true, processing: false }), true);
  assert.equal(canAutoCapture({ automatic: true, ready: true, processing: true }), false);
});

test("does not capture automatically without a garment in front of the camera", () => {
  assert.equal(canAutoCapture({ automatic: true, ready: true, processing: false, garmentPresent: false }), false);
});

test("waits for the garment to be removed after a capture before counting again", () => {
  assert.equal(canAutoCapture({ automatic: true, ready: true, processing: false, garmentPresent: true, awaitingRemoval: true }), false);
});

test("converts the selected capture interval from seconds to milliseconds", () => {
  assert.equal(toCaptureIntervalMs(5), 5000);
  assert.equal(toCaptureIntervalMs(15), 15000);
});

test("uses the minimum interval for an invalid selection", () => {
  assert.equal(toCaptureIntervalMs(0), 1000);
});
