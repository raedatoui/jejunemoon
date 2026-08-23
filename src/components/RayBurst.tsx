'use client';

import { type RefObject, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { rotationAt } from '@/lib/playhead';
import { playSnippet, pauseSnippet } from '@/lib/snippets';
import { cn } from '@/lib/utils';

/**
 * The label's emblem, in WebGL2. The moon turns, and the beacon fixed on its
 * limb strikes each bar as it passes: one arc of bars per record, newest at
 * twelve o'clock. Every pass re-deals a bar's length, weight and dash, so no
 * two revolutions read the same. Hover or focus an arc to light its release.
 *
 * Press the wordmark and the beacon stops being decoration: the arc it is
 * crossing is the record you hear, and it hands over as it passes into the
 * next. How fast it turns is set from the page, one record at a time.
 *
 * The canvas is decorative. The links live in the transparent SVG above it,
 * so the catalog stays reachable by keyboard and screen reader either way.
 */

// The angle a frozen emblem sits at, for readers who asked for less motion.
const STILL_ROT = 0.25;

// How much of the .jm-burst box the emblem spans. Raise it to grow the moon
// and its bars; the wordmark is sized off --burst, so it does not follow.
const FIT = 1.58;

const VERT = `#version 300 es
void main() {
    vec2 v = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(v * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform sampler2D iChannel0; // the artwork disc
uniform float iScale;        // burst diameter in device pixels
uniform float iSectors;      // one arc per release
uniform float iActive;       // hovered/focused arc, -1 for none
uniform float iPulse;        // 1 = kick pulse + wavefront rings, 0 = calm
uniform float iRot;          // moon rotation, in turns — the playhead itself

out vec4 fragColor;

const float PI = 3.14159265359;

// Palette sampled from the .jm scope in globals.css
const vec3 LIFT    = vec3(0.969, 0.945, 0.886); // #f7f1e2
const vec3 INK     = vec3(0.063, 0.059, 0.051); // #100f0d
const vec3 INKSOFT = vec3(0.420, 0.388, 0.325); // #6b6353
const vec3 RULE    = vec3(0.776, 0.722, 0.600); // #c6b899
const vec3 OCHRE   = vec3(0.722, 0.475, 0.165); // #b8792a

const float RAYS   = 7.0;      // bars per arc
const float GAP    = 0.0667;   // 4deg of a 60deg sector
const float R_DISC = 0.295;
const float R_IN   = 0.34;

// Where the disc sits inside the PNG: centre in uv (v from bottom) and the
// visible disc radius as a fraction of the image width. Measured from the file.
const vec2  IMG_C  = vec2(0.498, 0.485);
const float IMG_R  = 0.41;


// The design's own scale. The canvas is full-bleed, so its size no longer sets
// how big the burst is — iScale does, and FIT is what the burst spans of it.
const float FIT    = ${FIT.toFixed(2)};

float hash(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453123); }

// A kick drum at ~84bpm: sharp attack, exponential decay, velocity varies.
float kick(float t) {
    float bt = t * 1.4;
    return exp(-5.0 * fract(bt)) * (0.55 + 0.45 * hash(floor(bt)));
}

// Fake per-bar audio level, spectrum-analyser style: each bar follows its own
// slow melody of sines plus a shared kick it responds to unevenly.
float level(float idx, float seed, float t, float k) {
    float s = 0.5 + 0.5 * sin(t * 1.9 + idx * 1.7 + sin(t * 0.6 + idx * 0.35));
    float swell = 0.7 + 0.3 * sin(t * 0.23 + idx * 0.5);
    return clamp((0.18 + 0.5 * s) * swell + k * (0.35 + 0.5 * hash(seed + 11.0)), 0.0, 1.0);
}

// One generation's dash pattern for a bar; xr is distance along the bar.
float dashMask(float xr, float sd, float px) {
    float hd = hash(sd + 7.0);
    if (hd <= 0.28) return 1.0;   // solid bar
    float freq = mix(22.0, 70.0, hash(sd + 5.0));
    float duty = mix(0.45, 0.78, hash(sd + 9.0));
    float f = fract(xr * freq);
    float aaF = px * freq * 1.5;
    return smoothstep(duty + aaF, duty - aaF, f);
}

// One bar's contribution at this pixel: x = stroke alpha, y = ochre mix, z = halo.
vec3 drawRay(float sector, float i, float r, float ang01, float t, float k, float px) {
    float total = iSectors * RAYS;
    float seed = sector * 17.0 + i;
    float idx = sector * RAYS + i;

    // Centreline angle in revolutions from twelve o'clock
    float rayA = (sector + GAP + i * (1.0 - 2.0 * GAP) / (RAYS - 1.0)) / iSectors;
    float dA = ang01 - rayA;
    dA -= floor(dA + 0.5);
    float dPerp = abs(sin(dA * 2.0 * PI)) * r;

    float L = level(idx, seed, t, k);

    float sweepT = iRot - idx / total;
    float phN = fract(sweepT) * total;                 // bars behind the beacon
    float sb = phN < total * 0.5 ? phN : phN - total;  // signed: < 0 = approaching

    // A wave, not a tick: the bar swells as the beacon nears, peaks as it
    // passes, rings down behind it. Several bars are always partly alight,
    // so the sweep glides instead of stepping.
    float pulse = sb < 0.0 ? exp(-sb * sb / 1.8) : exp(-sb / 3.5);
    float act = (sector == iActive) ? 1.0 : 0.0;

    // Each pass of the beacon re-deals this bar — but the new deal morphs in
    // during the ring-down rather than snapping at the strike: the bar grows
    // in its old shape and shrinks back into its new one.
    float genN = floor(sweepT);
    float gen = genN * 101.7;
    float genP = (genN - 1.0) * 101.7;
    float xf = smoothstep(0.5, 4.0, phN);

    float start = R_IN + mix(hash(seed + genP + 3.0), hash(seed + gen + 3.0), xf) * 0.03;
    float len = (0.15 + mix(hash(seed + genP), hash(seed + gen), xf) * 0.20) * (0.45 + 0.30 * pulse + 0.35 * L + 0.15 * act);
    float rEnd = start + len;

    float dRad = max(start - r, r - rEnd);
    float d = length(vec2(dPerp, max(dRad, 0.0)));

    float w = 0.0032 * (0.8 + 0.5 * mix(hash(seed + genP + 13.0), hash(seed + gen + 13.0), xf)) * (1.0 + 2.1 * pulse + 1.1 * L + 0.9 * act);
    float m = smoothstep(w + px, w - px, d);

    // Dashes: both generations' patterns, crossfaded with the same morph
    m *= mix(dashMask(r - start, seed + genP, px), dashMask(r - start, seed + gen, px), xf);

    float alpha = m * clamp(0.30 + 0.55 * pulse + 0.35 * L + 0.35 * act, 0.0, 1.0);
    float och = clamp(0.55 * pulse + act, 0.0, 1.0);
    float halo = exp(-d / 0.035) * (0.5 * pulse + 0.35 * act) * step(start - 0.05, r);
    return vec3(alpha, och, halo);
}

// Composite a layer over the accumulator, premultiplied. The canvas is
// transparent, so the page's own paper shows through everywhere we don't paint.
void over(inout vec4 acc, vec3 c, float a) {
    a = clamp(a, 0.0, 1.0);
    acc = acc * (1.0 - a) + vec4(c * a, a);
}

void main() {
    vec2 res = iResolution;
    vec2 p = (gl_FragCoord.xy - 0.5 * res) / (0.5 * iScale) / FIT + 1e-5;
    float px = 2.0 / iScale / FIT;
    float t = iTime;
    float r = length(p);
    float ang01 = fract(atan(p.x, p.y) / (2.0 * PI)); // 0 at top, clockwise
    float k = kick(t) * iPulse;

    // Moon rotation, clockwise. pl is the moon-local frame: anything drawn
    // from pl rides the spin.
    float rot = iRot;
    float th = 2.0 * PI * fract(rot);
    float cth = cos(th);
    float sth = sin(th);
    vec2 pl = vec2(p.x * cth - p.y * sth, p.x * sth + p.y * cth);

    vec4 acc = vec4(0.0);

    // A soft lift behind the emblem, as if the paper were catching light
    over(acc, LIFT, 0.6 * exp(-r * r * 2.2));

    // Which bar owns this pixel (and its neighbour, so wide strokes never clip)
    float sN = ang01 * iSectors;
    float sector = floor(sN);
    float u = (fract(sN) - GAP) / (1.0 - 2.0 * GAP) * (RAYS - 1.0);
    float i0 = clamp(floor(u + 0.5), 0.0, RAYS - 1.0);
    float i1 = clamp(i0 + sign(u - i0), 0.0, RAYS - 1.0);
    float Lhere = level(sector * RAYS + i0, sector * 17.0 + i0, t, k);

    // Sound wavefronts spilling out of the moon. Each ring's radius and
    // strength wobble with the local bar's level, so the wavefront is the
    // audio, not just a circle.
    float rings = 0.0;
    for (int q = 0; q < 4; q++) {
        float fq = float(q);
        float tt = t * 0.30 + fq / 4.0;
        float age = fract(tt);
        float id = floor(tt) * 4.0 + fq;
        float rad = R_DISC + 0.02 + age * 1.05;
        rad += 0.015 * sin(ang01 * 2.0 * PI * 7.0 + id * 1.7) * age;
        rad += 0.03 * (Lhere - 0.5) * age;
        float band = exp(-pow((r - rad) / 0.010, 2.0));
        rings += band * pow(1.0 - age, 2.0) * (0.35 + 0.65 * hash(id + 0.7));
    }
    rings *= step(R_DISC + 0.01, r) * (0.35 + 0.65 * Lhere) * iPulse;
    over(acc, INKSOFT, min(rings * 0.16, 0.35));

    // The emission itself: a faint warm beam trailing out past the limb from
    // the beacon, fading with distance, drawn under the bars it excites.
    float da = fract(ang01 - rot + 0.5) - 0.5;
    float beam = exp(-pow(da / 0.022, 2.0)) * exp(-max(r - R_DISC, 0.0) * 1.6) * step(R_DISC, r);
    over(acc, OCHRE, beam * 0.20);

    // The two candidate bars, halo first, then ink
    vec3 ra = drawRay(sector, i0, r, ang01, t, k, px);
    vec3 rb = (i1 == i0) ? vec3(0.0) : drawRay(sector, i1, r, ang01, t, k, px);
    over(acc, OCHRE, min((ra.z + rb.z) * 0.22, 0.5));
    over(acc, mix(mix(RULE, INK, 0.25 + 0.55 * ra.x), OCHRE, ra.y * 0.85), ra.x);
    over(acc, mix(mix(RULE, INK, 0.25 + 0.55 * rb.x), OCHRE, rb.y * 0.85), rb.x);

    // The artwork moon, riding the rotation. Its edge lands exactly on R_DISC;
    // the feather past it lets the artwork's own glow melt into the paper, and
    // its whites are warmed so the print stays one stock.
    float dDisc = r - R_DISC;
    float imgMask = smoothstep(R_DISC + 0.04, R_DISC - 0.01, r);
    vec2 uv = IMG_C + pl * (IMG_R / R_DISC);
    over(acc, texture(iChannel0, uv).rgb * vec3(1.0, 0.962, 0.874), imgMask);

    // The beacon — a warm ember fixed on the artwork near its limb. The bars
    // it passes are exactly the ones alight.
    float dB = length(pl - vec2(0.0, 0.24));
    over(acc, OCHRE, exp(-dB * 30.0) * (0.30 + 0.35 * k) * imgMask);

    // The moon breathes a little warm light on each beat
    over(acc, OCHRE, exp(-abs(dDisc) * 55.0) * k * 0.30);

    fragColor = acc;
}`;

// Three decimals is ~0.0004px at this viewBox, so rounding keeps the server
// and the browser from disagreeing in trig's last bits and breaking hydration.
const round = (n: number) => Math.round(n * 1000) / 1000;

const pt = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return [round(Math.cos(a) * r), round(Math.sin(a) * r)] as const;
};

// A sector of the ring, covering the bars the shader draws for one release.
function wedge(a0: number, a1: number, r0: number, r1: number) {
    const [x0, y0] = pt(a0, r0);
    const [x1, y1] = pt(a1, r0);
    const [x2, y2] = pt(a1, r1);
    const [x3, y3] = pt(a0, r1);
    return `M${x0} ${y0}A${r0} ${r0} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r1} ${r1} 0 0 0 ${x3} ${y3}Z`;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src.trim());
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function useMoonShader(canvasRef: RefObject<HTMLCanvasElement | null>, sectors: number, active: number | null, pulse: boolean, still: boolean) {
    // The draw loop reads these through refs, so a hover never restarts WebGL.
    const activeRef = useRef(active);
    const pulseRef = useRef(pulse);
    activeRef.current = active;
    pulseRef.current = pulse;

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;
        const ctx = el.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true });
        if (!ctx) return;
        const canvas: HTMLCanvasElement = el;
        const gl: WebGL2RenderingContext = ctx;

        const vs = compile(gl, gl.VERTEX_SHADER, VERT);
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
        if (!vs || !fs) return;
        const prog = gl.createProgram();
        if (!prog) return;
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(prog));
            return;
        }
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
        gl.useProgram(prog);

        const uRes = gl.getUniformLocation(prog, 'iResolution');
        const uTime = gl.getUniformLocation(prog, 'iTime');
        const uScale = gl.getUniformLocation(prog, 'iScale');
        const uSectors = gl.getUniformLocation(prog, 'iSectors');
        const uActive = gl.getUniformLocation(prog, 'iActive');
        const uPulse = gl.getUniformLocation(prog, 'iPulse');
        const uRot = gl.getUniformLocation(prog, 'iRot');
        gl.uniform1i(gl.getUniformLocation(prog, 'iChannel0'), 0);

        // A paper-coloured pixel stands in until the artwork decodes, so the
        // disc never flashes through.
        const tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([237, 228, 207, 255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        const img = new Image();
        img.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            if (still) draw(0.9, STILL_ROT);
        };
        img.src = '/jejune-moon.png';

        let scale = 1;

        function draw(t: number, rot: number) {
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(uRes, canvas.width, canvas.height);
            gl.uniform1f(uScale, scale);
            gl.uniform1f(uTime, t);
            gl.uniform1f(uSectors, sectors);
            gl.uniform1f(uActive, activeRef.current ?? -1);
            gl.uniform1f(uPulse, pulseRef.current ? 1 : 0);
            gl.uniform1f(uRot, rot);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            scale = (canvas.parentElement?.clientWidth ?? width) * dpr;
            // A resize wipes the buffer, so a frozen frame has to be redrawn.
            if (still) draw(0.9, STILL_ROT);
        });
        ro.observe(canvas);

        // Motion only while the emblem is on screen — the catalog below it is
        // long, and there is no reason to keep a shader running out of view.
        let raf = 0;
        let visible = false;
        const t0 = performance.now();
        const loop = () => {
            const now = performance.now();
            draw((now - t0) / 1000, rotationAt(now));
            raf = requestAnimationFrame(loop);
        };
        const io = new IntersectionObserver(([entry]) => {
            if (still) return;
            if (entry.isIntersecting && !visible) {
                visible = true;
                raf = requestAnimationFrame(loop);
            } else if (!entry.isIntersecting && visible) {
                visible = false;
                cancelAnimationFrame(raf);
            }
        });
        io.observe(canvas);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            io.disconnect();
            img.onload = null;
            gl.deleteTexture(tex);
            gl.deleteProgram(prog);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            gl.getExtension('WEBGL_lose_context')?.loseContext();
        };
    }, [canvasRef, sectors, still]);
}

export function RayBurst({
    items,
    active,
    onActive,
    playhead,
    onTogglePlayhead,
}: {
    items: { id: string; title: string; artist: string; snippet?: string }[];
    active: number | null;
    onActive: (index: number | null) => void;
    playhead: boolean;
    onTogglePlayhead: () => void;
}) {
    const reduceMotion = useReducedMotion();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // The kick and the wavefronts were always the emblem's playing face; now
    // there is something actually playing to give them to.
    useMoonShader(canvasRef, items.length, active, playhead, reduceMotion === true);

    const span = 360 / items.length;
    const rHit = [round(500 * FIT * 0.32), round(500 * FIT * 0.83)] as const;

    return (
        <motion.div
            className="jm-burst relative mx-auto aspect-square"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Full-bleed: the emblem stays the size of the box, but its light
                spills across the page instead of stopping at a square edge. */}
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                tabIndex={-1}
                className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-screen w-screen -translate-x-1/2 -translate-y-1/2"
            />

            {/* The wordmark is the transport. Press it and the beacon stops
                being decoration: whichever arc it is crossing is the record
                you hear, and it hands over to the next one as it passes. */}
            <button
                type="button"
                onClick={onTogglePlayhead}
                aria-pressed={playhead}
                aria-label={playhead ? 'Stop the moon playing the catalog' : 'Let the moon play the catalog'}
                className={cn(
                    'font-header absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer text-center leading-[1.02] font-bold tracking-[-0.08em] uppercase transition-colors duration-700 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[var(--ink)]',
                    playhead && 'text-[var(--ochre)]'
                )}
                style={{ fontSize: 'calc(var(--burst) * 0.094)' }}
            >
                JeJune
                <br />
                Moon
            </button>

            {/* The svg box would swallow every click across the emblem, wordmark
                included, so the hits are left to the wedges themselves. */}
            <svg viewBox="-500 -500 1000 1000" className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
                <title>Jejune Moon catalog</title>
                {items.map((item, index) => (
                    <a
                        key={item.id}
                        href={`#${item.id}`}
                        aria-label={`${item.title} by ${item.artist}`}
                        onMouseEnter={() => {
                            onActive(index);
                            if (item.snippet) playSnippet(item.snippet);
                        }}
                        onMouseLeave={() => {
                            onActive(null);
                            pauseSnippet();
                        }}
                        onFocus={() => onActive(index)}
                        onBlur={() => onActive(null)}
                        className="pointer-events-auto outline-none"
                    >
                        <path d={wedge(-90 + index * span, -90 + (index + 1) * span, rHit[0], rHit[1])} fill="transparent" />
                    </a>
                ))}
            </svg>
        </motion.div>
    );
}
