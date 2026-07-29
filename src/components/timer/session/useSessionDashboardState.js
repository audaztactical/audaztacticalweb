import { useEffect, useRef, useState } from 'react'
import { useHardware } from '../../../context/HardwareContext'
import { listSessionShots } from '../../../lib/sessionEngine'
import { calculateGrade } from '../../../lib/performanceScoringEngine'

/**
 * analysisRef.session → UI snapshot (motorlara yazmaz).
 * @param {{ enabled?: boolean, throttleMs?: number }} [opts]
 */
export function useSessionDashboardState(opts = {}) {
  const enabled = opts.enabled !== false
  const throttleMs = Math.max(100, Number(opts.throttleMs) || 200)
  const { analysisRef } = useHardware()
  const lastSeqRef = useRef(-1)
  const lastCountRef = useRef(-1)
  const lastPublishRef = useRef(0)

  const [snap, setSnap] = useState(() => emptySnap())

  useEffect(() => {
    if (!enabled) return undefined
    let raf = 0

    const tick = (now) => {
      const state = analysisRef.current
      const session = state.session
      const seq = state.seq
      const due = now - lastPublishRef.current >= throttleMs
      const changed =
        seq !== lastSeqRef.current || session.shotCount !== lastCountRef.current
      if (due && changed) {
        lastPublishRef.current = now
        lastSeqRef.current = seq
        lastCountRef.current = session.shotCount
        const shots = listSessionShots(session)
        setSnap({
          shotCount: session.shotCount,
          totalAdded: session.totalAdded,
          averageScore: session.averageScore,
          bestScore: session.bestScore,
          worstScore: session.worstScore,
          consistency: session.consistency,
          grade: calculateGrade(session.averageScore),
          gradeDistribution: { ...session.gradeDistribution },
          trends: { ...session.trends },
          personalBest: session.personalBest,
          startedAt: session.startedAt,
          shots,
        })
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [analysisRef, enabled, throttleMs])

  return snap
}

function emptySnap() {
  return {
    shotCount: 0,
    totalAdded: 0,
    averageScore: 0,
    bestScore: 0,
    worstScore: 0,
    consistency: 0,
    grade: 'F',
    gradeDistribution: { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 },
    trends: { last5: 0, last10: 0, last20: 0 },
    personalBest: 0,
    startedAt: 0,
    shots: /** @type {import('../../../lib/sessionEngine').ShotRecord[]} */ ([]),
  }
}
