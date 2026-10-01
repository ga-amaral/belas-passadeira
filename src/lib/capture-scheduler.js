function canAutoCapture({ automatic, ready, processing, garmentPresent = true, awaitingRemoval = false }) {
  return automatic && ready && !processing && garmentPresent && !awaitingRemoval;
}

function toCaptureIntervalMs(seconds) {
  return Math.max(1, Number(seconds) || 1) * 1000;
}

module.exports = { canAutoCapture, toCaptureIntervalMs };
