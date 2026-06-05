from pathlib import Path

path = Path(r'c:\audaztacticalweb\src\components\armory\AttachmentsDeepDive.jsx')
text = path.read_text(encoding='utf-8')

start_marker = '                  <section className="space-y-3">\n                    <p className="font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#ffb400]/90">\n                      TEKNİK BAKIM VE ONARIM GÜNLÜĞÜ'
end_marker = '                  </section>\n                )}\n              </motion.div>'

# file uses </div> not motion
end_marker = '                  </section>\n                )}\n              </div>'

start = text.index(start_marker)
# find the closing section for maint tab - first occurrence after start that matches end pattern before AKSESUAR_SEÇİN in right column
idx = text.index(end_marker, start)
end = idx + len('                  </section>\n')

new_section = r'''                  <section className="space-y-2">
                    <p className="font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#ffb400]/90">
                      TEKNİK BAKIM VE ONARIM GÜNLÜĞÜ
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsMaintenanceModalOpen(true)}
                      disabled={busy || techMaintSaving}
                      className="w-full rounded border border-[#00FF41]/60 bg-[#00FF41]/15 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.35)] transition hover:bg-[#00FF41]/25 hover:shadow-[0_0_28px_rgba(0,255,65,0.5)] disabled:opacity-40"
                    >
                      [ + YENİ TEKNİK KAYIT GİRİŞİ ]
                    </button>
                    <ul className={`max-h-[400px] space-y-0 overflow-y-auto ${panelScroll}`}>
                      {technicalMaintenanceLogs.length === 0 ? (
                        <li className="font-mono-technical text-[9px] uppercase text-slate-600">TEKNİK_KAYIT_YOK</li>
                      ) : (
                        technicalMaintenanceLogs.map((log, i) => (
                          <li key={`${log.date}-${log.maintenanceType}-${i}`}>
                            {i > 0 ? (
                              <div className="my-2 font-mono-technical text-[8px] text-slate-600" aria-hidden>
                                -------------------------
                              </div>
                            ) : null}
                            <p className="font-mono-technical text-[9px] tabular-nums text-slate-500">{log.date}</p>
                            <span className="mt-0.5 inline-block rounded border border-[#ffb400]/40 bg-[#ffb400]/10 px-1.5 py-0.5 font-mono-technical text-[7px] font-bold uppercase text-[#ffb400]">
                              {log.maintenanceType}
                            </span>
                            <p className="mt-1 font-mono-technical text-[9px] normal-case leading-snug text-slate-300">{log.note || '—'}</p>
                          </li>
                        ))
                      )}
                    </ul>
                  </section>
'''

path.write_text(text[:start] + new_section + text[end:], encoding='utf-8')
print('patched maint tab')
