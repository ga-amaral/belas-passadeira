function canAutoCapture({ automatic, ready, processing }) {
  return automatic && ready && !processing;
}

function toCaptureIntervalMs(seconds) {
  return Math.max(1, Number(seconds) || 1) * 1000;
}

module.exports = { canAutoCapture, toCaptureIntervalMs };
