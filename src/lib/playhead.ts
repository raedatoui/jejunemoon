// The moon's rotation, in turns since the page loaded. One clock, read by the
// shader as it draws and by the scheduler that decides which record the beacon
// is over. It is derived from the wall clock rather than accumulated frame by
// frame, so the rotation keeps its place while the emblem is scrolled out of
// view and its draw loop is asleep.
let turnSeconds = 3.6;
let base = 0;
let baseAt = 0;

export function rotationAt(now: number) {
    if (!baseAt) baseAt = now;
    return base + (now - baseAt) / 1000 / turnSeconds;
}

// Rebased on every change, so a new speed carries on from the angle the moon
// had reached instead of snapping to a different one.
export function setTurnSeconds(seconds: number, now: number) {
    base = rotationAt(now);
    baseAt = now;
    turnSeconds = seconds;
}
