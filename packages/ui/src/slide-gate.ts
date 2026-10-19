// Pure decision logic behind <SlideToConfirm>. Kept free of React Native so it
// can be unit-tested in node; the component wires it to PanResponder/Animated.
//
// Why a gate object rather than closures: the PanResponder is created once per
// mount, so anything its callbacks close over is frozen at the first render.
// The gate is that single long-lived object, and the component re-syncs it with
// the latest props on every render — callbacks always see the current
// `onConfirm` and `loading`.

/** Fraction of the available travel the thumb must cross to count as a confirm. */
export const SLIDE_CONFIRM_RATIO = 0.9;

/** Horizontal distance the thumb can move on a track of `trackWidth`. */
export function slideTravel(trackWidth: number, thumb: number, inset: number): number {
  return Math.max(0, trackWidth - thumb - inset);
}

export function clampSlide(dx: number, travel: number): number {
  return Math.min(Math.max(0, dx), travel);
}

/** A zero travel means the track hasn't been laid out — never confirm then. */
export function passesThreshold(dx: number, travel: number): boolean {
  return travel > 0 && dx >= travel * SLIDE_CONFIRM_RATIO;
}

// idle       → free to drag.
// committing → released past the threshold (or screen-reader activate); the
//              thumb is animating to the end. Locked, handler not yet called.
// fired      → handler called; the thumb is held at the end until the parent
//              is no longer loading, then `settle()` releases it.
type Phase = 'idle' | 'committing' | 'fired';

export interface SlideGateProps {
  onConfirm: () => unknown;
  loading: boolean;
}

export interface SlideGate {
  /** Call on every render with the current props. */
  sync(props: SlideGateProps): void;
  /** True while the parent is loading or a slide is in progress. */
  isLocked(): boolean;
  /** Whether a new gesture may take the thumb. */
  canDrag(): boolean;
  /** On release: returns true (and locks) if the slide should commit. */
  tryCommit(dx: number, travel: number): boolean;
  /** Screen-reader "activate": commit without a drag, if not locked. */
  activate(): boolean;
  /** Commit animation finished: invoke the LATEST onConfirm, once. */
  fire(): void;
  /** Commit animation was interrupted: unlock without firing. */
  abort(): void;
  /**
   * After a fire, release the lock once the parent isn't loading (request
   * finished or failed, or it never went pending). Returns true when the
   * thumb should spring back.
   */
  settle(): boolean;
}

export function createSlideGate(): SlideGate {
  let onConfirm: () => unknown = () => undefined;
  let loading = false;
  let phase: Phase = 'idle';

  const isLocked = () => loading || phase !== 'idle';
  const commit = () => {
    if (isLocked()) return false;
    phase = 'committing';
    return true;
  };

  return {
    sync(props) {
      onConfirm = props.onConfirm;
      loading = props.loading;
    },
    isLocked,
    canDrag: () => !isLocked(),
    tryCommit(dx, travel) {
      return passesThreshold(dx, travel) && commit();
    },
    activate: commit,
    fire() {
      if (phase !== 'committing') return;
      phase = 'fired';
      onConfirm();
    },
    abort() {
      if (phase === 'committing') phase = 'idle';
    },
    settle() {
      if (phase !== 'fired' || loading) return false;
      phase = 'idle';
      return true;
    },
  };
}
