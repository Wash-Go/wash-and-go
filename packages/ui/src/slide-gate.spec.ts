import {
  SLIDE_CONFIRM_RATIO,
  clampSlide,
  createSlideGate,
  passesThreshold,
  slideTravel,
} from './slide-gate';

describe('slide geometry', () => {
  it('travel is the track minus the thumb and its insets, never negative', () => {
    expect(slideTravel(300, 56, 8)).toBe(236);
    expect(slideTravel(0, 56, 8)).toBe(0); // not laid out yet
    expect(slideTravel(40, 56, 8)).toBe(0);
  });

  it('clamps the drag to [0, travel]', () => {
    expect(clampSlide(-20, 200)).toBe(0);
    expect(clampSlide(120, 200)).toBe(120);
    expect(clampSlide(999, 200)).toBe(200);
  });

  it('confirms only past the ratio of a real (laid-out) track', () => {
    expect(SLIDE_CONFIRM_RATIO).toBe(0.9);
    expect(passesThreshold(180, 200)).toBe(true);
    expect(passesThreshold(179, 200)).toBe(false);
    expect(passesThreshold(50, 0)).toBe(false);
  });
});

// One full slide: release past the threshold, then the commit animation finishes.
function slide(gate: ReturnType<typeof createSlideGate>, dx = 200, travel = 200) {
  if (!gate.tryCommit(dx, travel)) return false;
  gate.fire();
  return true;
}

describe('createSlideGate', () => {
  it('calls the LATEST onConfirm, not the one captured when the gesture was created', () => {
    const gate = createSlideGate();
    const first = jest.fn();
    const latest = jest.fn();
    gate.sync({ onConfirm: first, loading: false });
    gate.sync({ onConfirm: latest, loading: false }); // parent re-rendered

    expect(slide(gate)).toBe(true);
    expect(latest).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('reads the handler at fire time, after the commit animation', () => {
    const gate = createSlideGate();
    const before = jest.fn();
    const after = jest.fn();
    gate.sync({ onConfirm: before, loading: false });
    expect(gate.tryCommit(200, 200)).toBe(true);
    gate.sync({ onConfirm: after, loading: false }); // re-render mid-animation
    gate.fire();
    expect(after).toHaveBeenCalledTimes(1);
    expect(before).not.toHaveBeenCalled();
  });

  it('a short slide does not commit or fire', () => {
    const gate = createSlideGate();
    const onConfirm = jest.fn();
    gate.sync({ onConfirm, loading: false });
    expect(gate.tryCommit(100, 200)).toBe(false);
    expect(gate.isLocked()).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('is locked while the parent is loading: no drag, no commit, no fire', () => {
    const gate = createSlideGate();
    const onConfirm = jest.fn();
    gate.sync({ onConfirm, loading: true });

    expect(gate.isLocked()).toBe(true);
    expect(gate.canDrag()).toBe(false);
    expect(slide(gate)).toBe(false);
    expect(gate.activate()).toBe(false);
    gate.fire(); // even a stray fire is ignored when nothing was committed
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('a second slide before the parent settles fires nothing (no double request)', () => {
    const gate = createSlideGate();
    const onConfirm = jest.fn();
    gate.sync({ onConfirm, loading: false });

    expect(slide(gate)).toBe(true);
    // Parent has not re-rendered yet — the gate's own lock must hold.
    expect(gate.canDrag()).toBe(false);
    expect(slide(gate)).toBe(false);
    gate.fire(); // fire is one-shot per commit
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('stays held while the parent is pending, and resets once it clears (success or error)', () => {
    const gate = createSlideGate();
    const onConfirm = jest.fn();
    gate.sync({ onConfirm, loading: false });
    expect(slide(gate)).toBe(true);

    gate.sync({ onConfirm, loading: true }); // parent set pending
    expect(gate.settle()).toBe(false); // still in flight: keep the thumb at the end
    expect(gate.isLocked()).toBe(true);

    gate.sync({ onConfirm, loading: false }); // request finished (or failed)
    expect(gate.settle()).toBe(true); // → component springs the thumb back
    expect(gate.isLocked()).toBe(false);
    expect(gate.settle()).toBe(false); // idempotent

    expect(slide(gate)).toBe(true); // usable again, e.g. retry after an error
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('settles straight away when the parent never goes pending (guard declined)', () => {
    const gate = createSlideGate();
    gate.sync({ onConfirm: () => false, loading: false });
    expect(slide(gate)).toBe(true);
    expect(gate.settle()).toBe(true);
    expect(gate.canDrag()).toBe(true);
  });

  it('does not settle mid-commit (before fire), so the commit animation is not cut short', () => {
    const gate = createSlideGate();
    gate.sync({ onConfirm: jest.fn(), loading: false });
    expect(gate.tryCommit(200, 200)).toBe(true);
    expect(gate.settle()).toBe(false);
    expect(gate.isLocked()).toBe(true);
  });

  it('abort (commit animation interrupted) unlocks without firing', () => {
    const gate = createSlideGate();
    const onConfirm = jest.fn();
    gate.sync({ onConfirm, loading: false });
    expect(gate.tryCommit(200, 200)).toBe(true);
    gate.abort();
    gate.fire();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(gate.isLocked()).toBe(false);
  });

  it('screen-reader activate commits without a drag distance, and respects the lock', () => {
    const gate = createSlideGate();
    const onConfirm = jest.fn();
    gate.sync({ onConfirm, loading: false });

    expect(gate.activate()).toBe(true);
    expect(gate.activate()).toBe(false); // already committed
    gate.fire();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
