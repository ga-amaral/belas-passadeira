export function canAutoCapture(state: {
  automatic: boolean;
  ready: boolean;
  processing: boolean;
  garmentPresent?: boolean;
  awaitingRemoval?: boolean;
}): boolean;
export function toCaptureIntervalMs(seconds: number): number;
