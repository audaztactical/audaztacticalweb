from pathlib import Path

path = Path(r'c:\audaztacticalweb\src\components\armory\AttachmentsDeepDive.jsx')
text = path.read_text(encoding='utf-8')

start_marker = (
    '              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto border-t border-white/10 p-3 op-detay-col-scroll">'
)
right_start_marker = (
    '        <TacticalPanel className="flex min-h-0 flex-col border-white/10 bg-black/40 p-0">\n'
    '          <p className="border-b border-white/10 bg-[#080808] px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-[#00FF41]/80">\n'
    '            MONTAJ_KONTROL · İŞLEM_PANELİ'
)
center_footer = '''              <div className="mt-auto shrink-0 space-y-2 border-t border-[#00FF41]/25 bg-[#050805] px-3 py-3">
                {mounted ? (
                  <>
                    <p className="rounded border border-[#00FF41]/40 bg-[#00FF41]/10 px-2 py-1.5 font-mono-technical text-[9px] font-bold uppercase text-[#00FF41] shadow-[0_0_14px_-4px_rgba(0,255,65,0.45)]">
                      DURUM: {statusLabel}
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={detachAccessory}
                      className="w-full rounded border border-amber-500/45 bg-amber-950/30 py-2 font-mono-technical text-[9px] font-bold uppercase text-amber-300 hover:bg-amber-950/50 disabled:opacity-40"
                    >
                      [ ⌧ AKSESUARI SÖK / DETACH ]
                    </button>
                    <label className="block">
                      <span className="font-mono-technical text-[7px] uppercase text-slate-500">İŞLEM_TARİHİ (KAYIT)</span>
                      <input
                        type="date"
                        className={`${dateInputClass} mt-1`}
                        value={logDate}
                        max={todayIsoDate()}
                        onChange={(e) => setLogDate(e.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <p className="animate-pulse font-mono-technical text-[9px] font-bold uppercase text-[#ffb400]">
                    DURUM: BOŞTA · ENSTALASYONA HAZIR
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center p-6 font-mono-technical text-[9px] uppercase text-slate-600">
              AKSESUAR_SEÇİN
            </p>
          )}
        </TacticalPanel>

'''

right_panel = Path(r'c:\audaztacticalweb\scripts\attachments-right-panel.txt').read_text(encoding='utf-8')

start = text.index(start_marker)
right_start = text.index(right_start_marker)
right_end = text.index('        </TacticalPanel>', right_start) + len('        </TacticalPanel>\n')

text = text[:start] + center_footer + right_panel + text[right_end:]
path.write_text(text, encoding='utf-8')
print('patched ok', len(text))
