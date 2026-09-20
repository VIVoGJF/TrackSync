import type { GaugeBreakdown } from '../lib/gauge';
import './Gauge.css';

interface GaugeProps {
    breakdown: GaugeBreakdown;
}

const RADIUS = 88;
const STROKE = 8;
const CENTER = RADIUS + STROKE / 2; // room for half the stroke on every side
const SIZE = CENTER * 2;

// LeetCode's ring is a 270° arc that's open at the bottom. Angles use the math
// convention (0° = 3 o'clock, counter-clockwise positive): the ring starts at
// 225° (bottom-left) and runs clockwise over the top to -45° (bottom-right).
const START_ANGLE = 225;
const TOTAL_SWEEP = 270;

// Round caps stick out past each path end by STROKE / 2. Pull every end in by
// that amount (converted to degrees) plus half the visible gap between arcs,
// otherwise neighbouring arcs would touch.
const CAP_DEG = (STROKE / 2 / RADIUS) * (180 / Math.PI);
const GAP_DEG = 6;
const INSET_DEG = CAP_DEG + GAP_DEG / 2;

function pointAt(angleDeg: number): { x: number; y: number } {
    const rad = (angleDeg * Math.PI) / 180;
    return {
        x: CENTER + RADIUS * Math.cos(rad),
        y: CENTER - RADIUS * Math.sin(rad),
    };
}

// Arc that starts at `startDeg` and sweeps `sweepDeg` degrees clockwise on screen.
function arcPath(startDeg: number, sweepDeg: number): string {
    const start = pointAt(startDeg);
    const end = pointAt(startDeg - sweepDeg);
    const largeArc = sweepDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

// Dim version of a colour, used for the unfilled part of each arc.
const dim = (color: string) => `color-mix(in srgb, ${color} 25%, transparent)`;

export function Gauge({ breakdown }: GaugeProps) {
    const { overall, daily, weekly, deadline } = breakdown;

    const types = [
        { key: 'daily', label: 'Daily', color: 'var(--type-daily)', ...daily },
        { key: 'weekly', label: 'Weekly', color: 'var(--type-weekly)', ...weekly },
        { key: 'deadline', label: 'Deadline', color: 'var(--type-deadline)', ...deadline },
    ];

    // Every type that has something to track gets an equal slice of the ring.
    // Its own progress fills from the start of that slice, like LeetCode's
    // per-difficulty arcs. (Your totals are very uneven, e.g. 60 / 5 / 1, so
    // slices sized by `max` would leave Weekly and Deadline as slivers.)
    const active = types.filter((t) => t.max > 0);
    const slice = TOTAL_SWEEP / active.length;

    const arcs = active.map((t, i) => {
        const start = START_ANGLE - i * slice - INSET_DEG;
        const sweep = slice - 2 * INSET_DEG;
        const filled = sweep * (t.completed / t.max);
        return {
            ...t,
            track: arcPath(start, sweep),
            // Skip empty arcs: a zero-length path with round caps still draws a dot.
            fill: filled > 0 ? arcPath(start, filled) : null,
        };
    });

    return (
        <div className="gauge">
            <div className="gauge-ring">
                <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="gauge-svg">
                    <g fill="none" strokeWidth={STROKE} strokeLinecap="round">
                        {arcs.length === 0 && (
                            <path
                                d={arcPath(START_ANGLE - CAP_DEG, TOTAL_SWEEP - 2 * CAP_DEG)}
                                stroke="var(--level-0)"
                            />
                        )}
                        {arcs.map((arc) => (
                            <g key={arc.key}>
                                <path d={arc.track} stroke={dim(arc.color)} />
                                {arc.fill && <path d={arc.fill} stroke={arc.color} />}
                            </g>
                        ))}
                    </g>
                </svg>

                <div className="gauge-center">
                    <div className="gauge-percent">
                        {overall}
                        <span className="gauge-percent-sign">%</span>
                    </div>
                    <div className="gauge-caption">
                        Completed
                    </div>
                </div>

            </div>

            <div className="gauge-stats">
                {types.map((t) => (
                    <div className="gauge-stat" key={t.key}>
                        <span className="gauge-stat-label" style={{ color: t.color }}>
                            {t.label}
                        </span>
                        <span className="gauge-stat-progress">
                            <span className="gauge-stat-bar">
                                <span
                                    className="gauge-stat-bar-fill"
                                    style={{ width: `${t.percent}%`, background: t.color }}
                                />
                            </span>
                            <span className="gauge-stat-value">
                                {t.completed}/{t.max}
                            </span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}