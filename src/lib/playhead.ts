// The moon's rotation, in turns since the page loaded. One clock, read by the
// shader as it draws and by the scheduler that decides which record the beacon
// is over. It is derived from the wall clock rather than accumulated frame by
// frame, so the rotation keeps its place while the emblem is scrolled out of
// view and its draw loop is asleep.
//
// It turns like a platter rather than a clock hand. Every state below is the
// same exponential approach to a target speed, solved in closed form, so the
// angle stays a pure function of the moment it is asked for and the shader's
// frames can never disagree with the transport's poll. Nothing here snaps: a
// speed change, a hand laid on the moon, a flick let go of — all of them ease.

// Seconds for the speed to close the gap to its target by all but 1/e: the
// platter coasting back up to speed, and the shorter grip of a hand on it.
const SPIN_TAU = 0.8;
const GRIP_TAU = 0.18;

// How long a hand's movement counts for. Any longer and what it is let go with
// stops being the gesture and starts being the last stray pixel of it.
const FLICK_TAU = 0.06;

// A flick faster than this is a blur nobody can read, so the platter only takes
// so much of one. Turns per second.
const MAX_FLICK = 6;

let turnSeconds = 3.6;
let base = 0; // turns, at baseAt
let baseAt = 0; // ms on the performance clock
let baseVel = 1 / 3.6; // turns per second, at baseAt
let held = false; // a hand resting on the moon
let grabbed = false; // a hand turning it
let dragVel = 0;
let dragAt = 0;

const targetVel = () => (held ? 0 : 1 / turnSeconds);
const tau = () => (held ? GRIP_TAU : SPIN_TAU);

export function rotationAt(now: number) {
    if (!baseAt) baseAt = now;
    if (grabbed) return base;
    const dt = Math.max(0, (now - baseAt) / 1000);
    const v = targetVel();
    const k = tau();
    return base + v * dt + (baseVel - v) * k * (1 - Math.exp(-dt / k));
}

// What the moon is doing right now, in turns per second.
function velocityAt(now: number) {
    if (grabbed) return dragVel;
    const dt = Math.max(0, (now - baseAt) / 1000);
    const v = targetVel();
    return v + (baseVel - v) * Math.exp(-dt / tau());
}

// Every change of state comes through here: the moon keeps the angle and the
// speed it already had, and only what it is easing towards changes.
function rebase(now: number) {
    const vel = velocityAt(now);
    base = rotationAt(now);
    baseAt = now;
    baseVel = vel;
}

// Rebased on every change, so a new speed is picked up from the one the moon
// was already turning at instead of snapping to it.
export function setTurnSeconds(seconds: number, now: number) {
    rebase(now);
    turnSeconds = seconds;
}

// A hover rests a hand on the moon: it slows to a stop under the grip, and the
// motor takes it back up to speed when the hand comes off.
export function setHeld(next: boolean, now: number) {
    // A hand actually turning the moon outranks one merely resting on it, so a
    // hover crossed mid-spin cannot leave the platter stopped behind it.
    if (next === held || (next && grabbed)) return;
    rebase(now);
    held = next;
}

// A hand closing on the platter, wherever it had got to and whatever it was
// doing — at speed, coasting, or already stopped under a hover.
export function grabRotation(now: number) {
    rebase(now);
    held = false;
    grabbed = true;
    dragVel = 0;
    dragAt = now;
}

// The platter goes exactly where the hand takes it. The speed it is being taken
// at is smoothed across the last few moves, so what it is let go with is the
// gesture rather than its final twitch.
export function dragRotation(deltaTurns: number, now: number) {
    if (!grabbed) return;
    base += deltaTurns;
    const dt = (now - dragAt) / 1000;
    if (dt <= 0) return;
    const w = Math.exp(-dt / FLICK_TAU);
    dragVel = dragVel * w + (deltaTurns / dt) * (1 - w);
    dragAt = now;
}

// Let go. Whatever the hand was doing goes stale the moment it stops moving, so
// a hand that came to rest before lifting leaves the moon at rest as well, and
// the motor picks it up from there.
export function releaseRotation(now: number) {
    if (!grabbed) return;
    const stale = Math.exp(-Math.max(0, now - dragAt) / 1000 / FLICK_TAU);
    grabbed = false;
    baseAt = now;
    baseVel = Math.max(-MAX_FLICK, Math.min(MAX_FLICK, dragVel * stale));
    dragVel = 0;
}
