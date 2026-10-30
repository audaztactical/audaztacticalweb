import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { db, isFirebaseConfigured } from '../../../lib/firebase'
import { istanbulDayKey } from '../../../lib/neural/neuralEngine'
import { logAarEntry } from '../../../lib/neural/activityEvents'
import { REGION_IDS } from '../../../lib/neural/neuralConfig'
import { useNeuralEvents } from '../../../hooks/useNeuralEvents'
import {
  buildBriefing,
  buildEventReaction,
  buildQuickAnswer,
  buildWelcome,
  canEmitAutoMessage,
  isOpsecRisky,
  opsecWarnText,
  primaryRegionFromGains,
} from './noroEngine'
import { V } from './noroCopy'
import './noro.css'

/** @typedef {'e'|'s'|'k'} NoroTone */

/**
 * @param {string} uid
 * @param {string} key
 */
function lsGet(uid, key) {
  try {
    return localStorage.getItem(`noro:${uid}:${key}`)
  } catch {
    return null
  }
}
/**
 * @param {string} uid
 * @param {string} key
 * @param {string} val
 */
function lsSet(uid, key, val) {
  try {
    localStorage.setItem(`noro:${uid}:${key}`, val)
  } catch {
    /* private */
  }
}

/**
 * @param {{
 *   neuralState: object
 *   serverStored: object|null
 *   hasActivity: boolean
 *   loading?: boolean
 * }} props
 */
export default function NoroAssistant({ neuralState, serverStored, hasActivity, loading }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const navigate = useNavigate()
  const { events } = useNeuralEvents()
  const listRef = useRef(/** @type {HTMLDivElement|null} */ (null))

  const [tone, setTone] = useState(/** @type {NoroTone} */ ('e'))
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [peek, setPeek] = useState(/** @type {string|null} */ (null))
  const [talking, setTalking] = useState(false)
  const [msgs, setMsgs] = useState(
    /** @type {Array<{ id: string; text: string; me?: boolean; aar?: { good: string; change: string }; links?: Array<{ to: string; label: string }>; qrs?: boolean; eventKey?: string }>} */ ([]),
  )
  const [aar, setAar] = useState(
    /** @type {{ step: 0|1|2; eventKey: string|null; region: string|null; a1: string; pendingKey: string|null }} */ ({
      step: 0,
      eventKey: null,
      region: null,
      a1: '',
      pendingKey: null,
    }),
  )
  const [input, setInput] = useState('')
  const bootRef = useRef(false)
  const seenEventsRef = useRef(/** @type {Set<string>} */ (new Set()))
  const prevLevelsRef = useRef(/** @type {Record<string, number>} */ ({}))
  const primedRef = useRef(false)

  // Ton + geçmiş yükle
  useEffect(() => {
    if (!uid) return
    const t = lsGet(uid, 'tone')
    if (t === 'e' || t === 's' || t === 'k') setTone(t)
    try {
      const raw = lsGet(uid, 'msgs')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setMsgs(parsed.slice(-50))
      }
    } catch {
      /* */
    }
  }, [uid])

  useEffect(() => {
    if (!uid) return
    lsSet(uid, 'tone', tone)
  }, [uid, tone])

  useEffect(() => {
    if (!uid || msgs.length === 0) return
    lsSet(uid, 'msgs', JSON.stringify(msgs.slice(-50)))
  }, [uid, msgs])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, open])

  const bumpAuto = useCallback(
    (n = 1) => {
      if (!uid) return
      const day = istanbulDayKey(Date.now())
      const used = Number(lsGet(uid, `auto:${day}`) || 0)
      lsSet(uid, `auto:${day}`, String(used + n))
    },
    [uid],
  )

  const pushMsg = useCallback(
    (/** @type {Omit<(typeof msgs)[0], 'id'>} */ m) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      setMsgs((prev) => [...prev, { ...m, id }].slice(-50))
      if (!open && !m.me) {
        setUnread((u) => u + 1)
        setPeek(m.text.slice(0, 160))
        window.setTimeout(() => setPeek(null), 8000)
      }
    },
    [open],
  )

  const say = useCallback(
    (text, extra = {}) => {
      setTalking(true)
      window.setTimeout(() => {
        pushMsg({ text, ...extra })
        setTalking(false)
      }, 280)
    },
    [pushMsg],
  )

  // İlk brifing / karşılama (günde bir)
  useEffect(() => {
    if (!uid || loading || bootRef.current) return
    bootRef.current = true
    const day = istanbulDayKey(Date.now())
    const briefDone = lsGet(uid, `brief:${day}`)
    if (!hasActivity) {
      say(buildWelcome(tone, false), {
        links: [{ to: '/antrenman', label: 'Antrenmana git' }],
      })
      return
    }
    if (briefDone) return
    const lastVisit = Number(lsGet(uid, 'lastVisitMs') || 0)
    const daysSince = lastVisit ? Math.max(1, (Date.now() - lastVisit) / 86_400_000) : 1
    const used = Number(lsGet(uid, `auto:${day}`) || 0)
    if (!canEmitAutoMessage(day, used)) return
    const regions = REGION_IDS.map((id) => {
      const r = neuralState?.regions?.[id] || {}
      return {
        id,
        idleDays: Number(r.idleDays) || 0,
        decayLoss: Number(r.decayLoss) || 0,
        daysToDecay: Number(r.daysToDecay) || 0,
        decaying: Boolean(r.decaying),
        level: Number(r.level) || 0,
      }
    })
    const texts = buildBriefing({
      tone,
      daysSince,
      regions,
      streak: Number(neuralState?.streak) || 0,
    })
    texts.forEach((t) => say(t))
    bumpAuto(texts.length)
    lsSet(uid, `brief:${day}`, '1')
    lsSet(uid, 'lastVisitMs', String(Date.now()))
  }, [uid, loading, hasActivity, neuralState, tone, say, bumpAuto])

  // Seviye snapshot
  useEffect(() => {
    /** @type {Record<string, number>} */
    const lv = {}
    for (const id of REGION_IDS) {
      lv[id] = Number(neuralState?.regions?.[id]?.level) || 0
    }
    prevLevelsRef.current = lv
  }, [neuralState])

  // Yeni eventler — ilk snapshot geçmişi mesajlaştırmaz
  useEffect(() => {
    if (!uid || !events.length) return
    const lastTs = Number(lsGet(uid, 'lastEventTs') || 0)
    const day = istanbulDayKey(Date.now())

    if (!primedRef.current) {
      primedRef.current = true
      for (const ev of events) seenEventsRef.current.add(String(ev.id))
      const newest = events[0]
      const ts =
        newest?.createdAt && typeof newest.createdAt.toMillis === 'function'
          ? newest.createdAt.toMillis()
          : Number(newest?.ts) || Date.now()
      if (!lastTs) lsSet(uid, 'lastEventTs', String(Math.max(ts, lastTs)))
      return
    }

    let autoUsed = Number(lsGet(uid, `auto:${day}`) || 0)
    let cursorTs = lastTs
    const fresh = [...events]
      .reverse()
      .filter((ev) => !seenEventsRef.current.has(String(ev.id)))

    for (const ev of fresh) {
      seenEventsRef.current.add(String(ev.id))
      const ts =
        ev.createdAt && typeof ev.createdAt.toMillis === 'function'
          ? ev.createdAt.toMillis()
          : Number(ev.ts) || Date.now()
      if (ts <= cursorTs) continue
      if (!canEmitAutoMessage(day, autoUsed)) {
        cursorTs = ts
        lsSet(uid, 'lastEventTs', String(cursorTs))
        continue
      }

      const gains = /** @type {Record<string, number>} */ (ev.gains || {})
      const flags = /** @type {{ bonus?: boolean; cap?: boolean; typeCap?: boolean; streakBonus?: number }} */ (
        ev.flags || {}
      )
      const primary = primaryRegionFromGains(gains)
      let aarReminder = null
      try {
        const raw = lsGet(uid, 'aarMap')
        const map = raw ? JSON.parse(raw) : {}
        const remKey = map[primary]
        if (remKey && !lsGet(uid, `aarRem:${primary}:${String(remKey).slice(0, 40)}`)) {
          aarReminder = String(remKey)
          lsSet(uid, `aarRem:${primary}:${aarReminder.slice(0, 40)}`, '1')
          delete map[primary]
          lsSet(uid, 'aarMap', JSON.stringify(map))
        }
      } catch {
        /* */
      }

      /** @type {Record<string, number>} */
      const nextLv = {}
      for (const id of REGION_IDS) {
        nextLv[id] = Number(neuralState?.regions?.[id]?.level) || 0
      }
      const reaction = buildEventReaction({
        tone,
        gains,
        score: ev.score == null ? null : Number(ev.score),
        flags,
        streak: Number(serverStored?.streak ?? neuralState?.streak) || 0,
        prevLevels: prevLevelsRef.current,
        nextLevels: nextLv,
        aarReminder,
      })
      reaction.texts.forEach((t) => say(t))
      bumpAuto(reaction.texts.length)
      autoUsed += reaction.texts.length
      cursorTs = ts
      lsSet(uid, 'lastEventTs', String(cursorTs))

      if (reaction.offerAar) {
        const skipDay = lsGet(uid, 'aarSkipDay')
        const offered = lsGet(uid, `aarOffered:${ev.id}`)
        if (skipDay !== day && !offered && aar.step === 0 && !aar.pendingKey) {
          lsSet(uid, `aarOffered:${ev.id}`, '1')
          setAar((a) => ({ ...a, pendingKey: String(ev.id), region: reaction.primaryId }))
          say(
            V(
              tone,
              'Sıcağı sıcağına kısa bir AAR yapalım mı? İki soru, yarım dakika. Cevapların Frontal hanesine yazılır.',
              'Kısa AAR yapmak ister misin? İki soru; Frontal puan alır.',
              'AAR zamanı. İki soru. Cevapla.',
            ),
            { qrs: true, eventKey: String(ev.id) },
          )
          bumpAuto(1)
          autoUsed += 1
        }
      }
    }
  }, [events, uid, tone, neuralState, serverStored, say, bumpAuto, aar.step, aar.pendingKey])

  function onQuick(q) {
    const ans = buildQuickAnswer(q, neuralState, tone)
    pushMsg({ text: q === 'rapor' ? 'Durum raporu' : q === 'oneri' ? 'Bugün ne yapayım?' : 'En zayıf yerim?', me: true })
    say(ans.text, { links: ans.links })
  }

  function onTone(/** @type {NoroTone} */ t) {
    if (t === tone) return
    setTone(t)
    say(
      V(
        t,
        'Esprili moddayız. Kahveni al, laf sokmaya devam.',
        'Sade moda geçtim. Kısa ve net bilgi vereceğim.',
        'Komutan modu. Kısa konuşacağım. Dinle ve uygula.',
      ),
    )
  }

  function onQrs(action, eventKey) {
    pushMsg({
      text: action === 'yes' ? 'AAR yap' : action === 'no' ? 'Şimdi değil' : 'Bugün sorma',
      me: true,
    })
    if (action === 'skip') {
      lsSet(uid || '', 'aarSkipDay', istanbulDayKey(Date.now()))
      setAar((a) => ({ ...a, pendingKey: null }))
      say(V(tone, 'Bugünlük AAR sormuyorum, söz.', 'Bugün tekrar sormayacağım.', 'Bugün AAR yok.'))
      return
    }
    if (action === 'no') {
      setAar((a) => ({ ...a, pendingKey: null }))
      say(V(tone, 'Tamamdır, başka sefere.', 'Tamam.', 'Anlaşıldı.'))
      return
    }
    const region = aar.region || 'motor'
    setAar({ step: 1, eventKey: eventKey || aar.pendingKey, region, a1: '', pendingKey: null })
    setOpen(true)
    say(V(tone, 'Birinci soru: ne iyi gitti? Bir cümle yeter.', 'Ne iyi gitti?', 'Ne iyi gitti? Kısa.'))
  }

  async function submitAarText(raw) {
    const t = String(raw || '').trim()
    if (!t || !uid) return
    if (isOpsecRisky(t)) {
      pushMsg({ text: '[mesaj gönderilmedi]', me: true })
      say(opsecWarnText(tone))
      return
    }
    if (t.length > 400) {
      say('En fazla 400 karakter.')
      return
    }
    pushMsg({ text: t, me: true })
    if (aar.step === 1) {
      setAar((a) => ({ ...a, step: 2, a1: t }))
      say(
        V(
          tone,
          'Güzel. İkinci soru: bir dahakine neyi farklı yaparsın?',
          'Bir dahakine neyi farklı yaparsın?',
          'Bir dahakine neyi değiştireceksin?',
        ),
      )
      return
    }
    if (aar.step === 2 && aar.eventKey && aar.region) {
      const good = aar.a1
      const change = t
      const eventKey = aar.eventKey
      const region = aar.region
      setAar({ step: 0, eventKey: null, region: null, a1: '', pendingKey: null })
      try {
        if (isFirebaseConfigured() && db) {
          await setDoc(doc(db, 'users', uid, 'aar_notes', eventKey), {
            eventKey,
            region,
            good,
            change,
            createdAt: serverTimestamp(),
          })
          logAarEntry(eventKey)
        }
        try {
          const rawMap = lsGet(uid, 'aarMap')
          const map = rawMap ? JSON.parse(rawMap) : {}
          map[region] = change
          lsSet(uid, 'aarMap', JSON.stringify(map))
        } catch {
          /* */
        }
        say(
          V(
            tone,
            'AAR kaydedildi, eline sağlık. Frontal puanı tetikleyiciyle işlenecek. Bir sonraki kayıtta bu notu hatırlatacağım.',
            'AAR kaydedildi. Frontal puanı işlenecek.',
            'AAR kaydedildi. Notu uygula.',
          ),
          { aar: { good, change } },
        )
      } catch {
        say('AAR kaydı şimdilik başarısız (kurallar/deploy). Yerelde not tutuldu.')
        try {
          const rawMap = lsGet(uid, 'aarMap')
          const map = rawMap ? JSON.parse(rawMap) : {}
          map[region] = change
          lsSet(uid, 'aarMap', JSON.stringify(map))
        } catch {
          /* */
        }
        say('AAR (yerel)', { aar: { good, change } })
      }
    }
  }

  if (!uid) return null

  return (
    <div className="noro-asst" aria-live="polite">
      {open ? (
        <div className="noro-apanel" role="dialog" aria-label="NÖRO asistanı">
          <div className="noro-ahead">
            <div>
              <h3>NÖRO</h3>
              <p>operatör asistanı · çevrimiçi</p>
            </div>
            <button type="button" className="noro-aclose" aria-label="Kapat" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <div className="noro-atone" role="radiogroup" aria-label="Konuşma tonu">
            <span>ton</span>
            {(
              [
                ['e', 'Esprili'],
                ['s', 'Sade'],
                ['k', 'Komutan'],
              ]
            ).map(([t, label]) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tone === t}
                onClick={() => onTone(/** @type {NoroTone} */ (t))}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="noro-alist" ref={listRef}>
            {msgs.map((m) => (
              <div key={m.id} className={['noro-msg', m.me ? 'noro-me' : ''].filter(Boolean).join(' ')}>
                <div className="noro-bub">
                  {m.text}
                  {m.aar ? (
                    <div className="noro-aar-card">
                      <div>
                        ✓ <b>İyi giden:</b> {m.aar.good}
                      </div>
                      <div>
                        ↻ <b>Değişecek:</b> {m.aar.change}
                      </div>
                    </div>
                  ) : null}
                  {m.links?.length ? (
                    <div className="noro-links">
                      {m.links.map((l) => (
                        <button
                          key={l.to + l.label}
                          type="button"
                          className="noro-link"
                          onClick={() => navigate(l.to)}
                        >
                          {l.label} →
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {m.qrs ? (
                    <div className="noro-qrs">
                      <button type="button" className="noro-qr" onClick={() => onQrs('yes', m.eventKey)}>
                        AAR yap
                      </button>
                      <button type="button" className="noro-qr" onClick={() => onQrs('no', m.eventKey)}>
                        Şimdi değil
                      </button>
                      <button type="button" className="noro-qr" onClick={() => onQrs('skip', m.eventKey)}>
                        Bugün sorma
                      </button>
                    </div>
                  ) : null}
                </div>
                <time>{m.me ? 'sen' : 'NÖRO'}</time>
              </div>
            ))}
          </div>
          <div className="noro-achips">
            <button type="button" onClick={() => onQuick('rapor')}>
              Durum raporu
            </button>
            <button type="button" onClick={() => onQuick('oneri')}>
              Bugün ne yapayım?
            </button>
            <button type="button" onClick={() => onQuick('zayif')}>
              En zayıf yerim?
            </button>
          </div>
          {aar.step > 0 ? (
            <form
              className="noro-ain"
              onSubmit={(e) => {
                e.preventDefault()
                const v = input
                setInput('')
                void submitAarText(v)
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={400}
                placeholder={aar.step === 1 ? 'AAR 1/2 · ne iyi gitti?' : 'AAR 2/2 · neyi değiştirirsin?'}
                aria-label="AAR cevabı"
              />
            </form>
          ) : (
            <p className="noro-soon">Serbest sohbet yakında</p>
          )}
          <p className="noro-anote">
            OPSEC: konum, koordinat, plaka veya operasyon detayı yazma. Yalnızca eğitim.
          </p>
        </div>
      ) : null}

      {peek && !open ? (
        <button type="button" className="noro-apeek" onClick={() => setOpen(true)}>
          <span className="noro-who">NÖRO</span>
          {peek}
        </button>
      ) : null}

      <button
        type="button"
        className={['noro-abtn', talking ? 'noro-talk' : ''].filter(Boolean).join(' ')}
        aria-label="NÖRO asistanı"
        onClick={() => {
          setOpen((o) => !o)
          setUnread(0)
          setPeek(null)
        }}
      >
        <span className="noro-orb" aria-hidden />
        <span className="noro-core" aria-hidden />
        {unread > 0 ? <i className="noro-abadge">{unread > 9 ? '9+' : unread}</i> : null}
      </button>
    </div>
  )
}
