from pathlib import Path

path = Path(r'c:\audaztacticalweb\src\components\armory\AttachmentsDeepDive.jsx')
text = path.read_text(encoding='utf-8')

# --- Center column ---
center_start = text.index("        <TacticalPanel className=\"flex min-h-0 flex-col overflow-hidden border-white/10 bg-black/40 p-0\">\n          <p className=\"shrink-0 border-b border-white/10 bg-[#080808] px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-[#00FF41]/80\">\n            TAKTİK_MONİTÖR · 3D_ANALİTİK")
center_end = text.index("        <TacticalPanel className=\"flex min-h-0 flex-col overflow-hidden border-white/10 bg-black/40 p-0\">\n          <p className=\"shrink-0 border-b border-white/10 bg-[#080808] px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-[#00FF41]/80\">\n            EYLEM · DENETİM_HUB")

center_block = r'''        <TacticalPanel className="flex min-h-0 flex-col overflow-hidden border-white/10 bg-black/40 p-0">
          <p className="shrink-0 border-b border-white/10 bg-[#080808] px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-[#00FF41]/80">
            {isViewingLogs ? 'TAKTİK_MONİTÖR · KAYIT_DEFTERİ' : 'TAKTİK_MONİTÖR · 3D_ANALİTİK'}
          </p>
          {selected ? (
            <motion.div className="flex min-h-0 flex-1 flex-col">
              {isViewingLogs ? (
                <>
                  <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[#00b4ff]/25 bg-[#050a12] px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#5ec8ff]">
                        {centerLogStream === 'deploy'
                          ? 'AKSESUAR MONTAJ / SÖKME KAYIT DEFTERİ'
                          : 'TEKNİK BAKIM VE ONARIM GÜNLÜĞÜ'}
                      </p>
                      <p className="mt-0.5 font-mono-technical text-[7px] tabular-nums text-slate-500">
                        {centerLogStream === 'deploy'
                          ? `${filteredDeploymentHistory.length}/${deploymentHistory.length} KAYIT`
                          : `${filteredTechnicalLogs.length}/${technicalMaintenanceLogs.length} KAYIT`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsViewingLogs(false)}
                      className="shrink-0 rounded border border-red-500/55 bg-red-950/25 px-2 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-wide text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)] transition hover:bg-red-950/45"
                    >
                      [ ↩️ MONİTÖRE GERİ DÖN / RETURN ]
                    </button>
                  </div>
                  <div className={`min-h-0 flex-1 space-y-2 p-3 ${panelScroll}`}>
                    {centerLogStream === 'deploy' ? (
                      <>
                        <motion.div className="grid gap-1.5 rounded border border-[#00b4ff]/35 bg-[#00b4ff]/5 p-2">
                          <p className="font-mono-technical text-[7px] font-bold uppercase text-[#5ec8ff]/80">FİLTRE</p>
                          <div className="grid gap-1.5 sm:grid-cols-3">
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-slate-500">İŞLEM TÜRÜ</span>
                              <select className={filterSelectClass} value={deployActionFilter} onChange={(e) => setDeployActionFilter(e.target.value)}>
                                {DEPLOY_ACTION_FILTERS.map((f) => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-slate-500">TARİH BAŞ</span>
                              <input type="date" className={filterDateClass} value={deployDateFrom} max={deployDateTo || todayIsoDate()} onChange={(e) => setDeployDateFrom(e.target.value)} />
                            </label>
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-slate-500">TARİH BİT</span>
                              <input type="date" className={filterDateClass} value={deployDateTo} min={deployDateFrom || undefined} max={todayIsoDate()} onChange={(e) => setDeployDateTo(e.target.value)} />
                            </label>
                          </div>
                          {(deployActionFilter !== 'ALL' || deployDateFrom || deployDateTo) && (
                            <button type="button" onClick={() => { setDeployActionFilter('ALL'); setDeployDateFrom(''); setDeployDateTo('') }} className="font-mono-technical text-[7px] uppercase text-[#5ec8ff]/80 hover:text-[#5ec8ff]">FİLTREYİ SIFIRLA</button>
                          )}
                        </motion.div>
                        <ul className="space-y-1.5 rounded border border-[#00b4ff]/30 bg-black/30 p-2">
                          {deploymentHistory.length === 0 ? (
                            <li className="font-mono-technical text-[9px] uppercase text-slate-600">KAYIT_YOK</li>
                          ) : filteredDeploymentHistory.length === 0 ? (
                            <li className="font-mono-technical text-[9px] uppercase text-slate-600">FİLTRE_SONUCU_YOK</li>
                          ) : (
                            filteredDeploymentHistory.map((log, i) => (
                              <li key={`${log.date}-${log.action_type}-${i}`} className="rounded border border-[#00b4ff]/20 bg-black/50 px-2 py-1.5 font-mono-technical text-[8px] uppercase">
                                <span className="text-slate-500">{log.date}</span>
                                <span className={`ml-2 ${log.action_type === 'MONTAJ' ? 'text-[#00FF41]' : 'text-amber-400'}`}>{log.action_type}</span>
                                <p className="mt-0.5 text-slate-300">{log.target_weapon}</p>
                              </li>
                            ))
                          )}
                        </ul>
                      </>
                    ) : (
                      <>
                        <motion.div className="grid gap-1.5 rounded border border-[#ffb400]/25 bg-[#ffb400]/5 p-2">
                          <p className="font-mono-technical text-[7px] font-bold uppercase text-[#ffb400]/80">FİLTRE</p>
                          <div className="grid gap-1.5 sm:grid-cols-3">
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-slate-500">BAKIM TÜRÜ</span>
                              <select className={filterSelectClass} value={techTypeFilter} onChange={(e) => setTechTypeFilter(e.target.value)}>
                                <option value="ALL">TÜM TÜRLER</option>
                                {ACCESSORY_MAINTENANCE_TYPES.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-slate-500">TARİH BAŞ</span>
                              <input type="date" className={filterDateClass} value={techDateFrom} max={techDateTo || todayIsoDate()} onChange={(e) => setTechDateFrom(e.target.value)} />
                            </label>
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-slate-500">TARİH BİT</span>
                              <input type="date" className={filterDateClass} value={techDateTo} min={techDateFrom || undefined} max={todayIsoDate()} onChange={(e) => setTechDateTo(e.target.value)} />
                            </label>
                          </div>
                          {(techTypeFilter !== 'ALL' || techDateFrom || techDateTo) && (
                            <button type="button" onClick={() => { setTechTypeFilter('ALL'); setTechDateFrom(''); setTechDateTo('') }} className="font-mono-technical text-[7px] uppercase text-[#ffb400]/80 hover:text-[#ffb400]">FİLTREYİ SIFIRLA</button>
                          )}
                        </motion.div>
                        <ul className="space-y-0 rounded border border-[#ffb400]/25 bg-black/30 p-2">
                          {technicalMaintenanceLogs.length === 0 ? (
                            <li className="font-mono-technical text-[9px] uppercase text-slate-600">TEKNİK_KAYIT_YOK</li>
                          ) : filteredTechnicalLogs.length === 0 ? (
                            <li className="font-mono-technical text-[9px] uppercase text-slate-600">FİLTRE_SONUCU_YOK</li>
                          ) : (
                            filteredTechnicalLogs.map((log, i) => (
                              <li key={`${log.date}-${log.maintenanceType}-${i}`}>
                                {i > 0 ? <div className="my-2 font-mono-technical text-[8px] text-slate-600" aria-hidden>-------------------------</div> : null}
                                <p className="font-mono-technical text-[9px] tabular-nums text-slate-500">{log.date}</p>
                                <span className="mt-0.5 inline-block rounded border border-[#ffb400]/40 bg-[#ffb400]/10 px-1.5 py-0.5 font-mono-technical text-[7px] font-bold uppercase text-[#ffb400]">{log.maintenanceType}</span>
                                <p className="mt-1 font-mono-technical text-[9px] normal-case leading-snug text-slate-300">{log.note || '—'}</p>
                              </li>
                            ))
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <MatrixWireVisualizer variant="reddot" imageSrc={imageSrc} imageAlt={accessoryDisplayName(selected)} label={accessoryStokKodu(String(selected.id))} />
                  <div className="shrink-0 space-y-1 border-t border-white/10 px-3 py-2 font-mono-technical text-[9px] uppercase">
                    <p className="text-slate-500">AKSESUAR TÜRÜ: <span className="text-[#00FF41]">{typeLabel}</span></p>
                    <p className="font-mono-technical text-[9px] uppercase tracking-[0.12em] text-[#00FF41]">ENVANTERE GİRİŞ TARİHİ: <span className="tabular-nums">{entryDate}</span></p>
                  </div>
                  <div className="mt-auto shrink-0 border-t border-[#00FF41]/25 bg-[#050805] px-3 py-2">
                    <p className={`font-mono-technical text-[9px] font-bold uppercase ${mounted ? 'text-[#00FF41]' : 'animate-pulse text-[#ffb400]'}`}>
                      DURUM: {mounted ? statusLabel : 'BOŞTA · ENSTALASYONA HAZIR'}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center p-6 font-mono-technical text-[9px] uppercase text-slate-600">AKSESUAR_SEÇİN</p>
          )}
        </TacticalPanel>

'''

center_block = center_block.replace('motion.div', 'div')

# --- Right column hub ---
right_start = text.index("            EYLEM · DENETİM_HUB")
right_start = text.rindex('        <TacticalPanel', 0, right_start)
right_end = text.index('      <AccessoryMaintenanceModal', right_start)

view_logs_btn = r'''className="w-full rounded border border-[#00b4ff]/55 bg-[#00b4ff]/12 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#5ec8ff] shadow-[0_0_18px_rgba(0,180,255,0.28)] transition hover:bg-[#00b4ff]/20 hover:shadow-[0_0_24px_rgba(0,180,255,0.4)] disabled:opacity-40"'''

right_block = f'''        <TacticalPanel className="flex min-h-0 flex-col overflow-hidden border-white/10 bg-black/40 p-0">
          <p className="shrink-0 border-b border-white/10 bg-[#080808] px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-[#00FF41]/80">
            EYLEM · DENETİM_HUB
          </p>
          {{selected ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 gap-1 border-b border-white/10 bg-[#080808] p-1">
                <button type="button" onClick={{() => setRightTab('deploy')}} className={{`flex-1 rounded px-2 py-1.5 font-mono-technical text-[7px] font-bold uppercase tracking-wide ${{rightTab === 'deploy' ? 'border border-[#00FF41]/50 bg-[#00FF41]/15 text-[#00FF41]' : 'text-slate-500 hover:text-slate-300'}}`}}>[ 📑 MONTAJ KAYITLARI ]</button>
                <button type="button" onClick={{() => setRightTab('maint')}} className={{`flex-1 rounded px-2 py-1.5 font-mono-technical text-[7px] font-bold uppercase tracking-wide ${{rightTab === 'maint' ? 'border border-[#ffb400]/50 bg-[#ffb400]/15 text-[#ffb400]' : 'text-slate-500 hover:text-slate-300'}}`}}>[ 🛠️ TEKNİK BAKIM ]</button>
              </div>

              <div className={{`min-h-0 flex-1 p-3 ${{panelScroll}}`}}>
                {{rightTab === 'deploy' ? (
                  <section className="space-y-3">
                    <button type="button" onClick={{() => openCenterLogs('deploy')}} disabled={{!selected}} {view_logs_btn}>
                      [ 🔍 İŞLEM KAYITLARINI GÖRÜNTÜLE ]
                    </button>
                    <div className="space-y-2 rounded border border-red-500/45 bg-red-950/15 p-3 shadow-[0_0_14px_rgba(239,68,68,0.12)]">
                      <p className="font-mono-technical text-[8px] font-bold uppercase tracking-wider text-red-400/90">MONTAJ_KONTROL · EYLEM</p>
                      {{mounted ? (
                        <>
                          <p className="rounded border border-[#00FF41]/40 bg-[#00FF41]/10 px-2 py-1.5 font-mono-technical text-[9px] font-bold uppercase text-[#00FF41]">DURUM: {{statusLabel}}</p>
                          <label className="block">
                            <span className="font-mono-technical text-[7px] uppercase text-slate-500">İŞLEM_TARİHİ (KAYIT)</span>
                            <input type="date" className={{`${{dateInputClass}} mt-1`}} value={{logDate}} max={{todayIsoDate()}} onChange={{(e) => setLogDate(e.target.value)}} disabled={{busy}} />
                          </label>
                          <button type="button" disabled={{busy}} onClick={{detachAccessory}} className="w-full rounded border border-amber-500/45 bg-amber-950/25 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)] transition hover:bg-amber-950/45 disabled:opacity-40">[ ⌧ AKSESUARI SÖK / DETACH ]</button>
                        </>
                      ) : (
                        <>
                          <p className="animate-pulse font-mono-technical text-[9px] font-bold uppercase text-[#ffb400]">DURUM: BOŞTA · ENSTALASYONA HAZIR</p>
                          <button type="button" onClick={{() => setIsMountModalOpen(true)}} disabled={{busy || idleWeaponsForMount.length === 0}} className="w-full rounded border border-[#00FF41]/60 bg-[#00FF41]/15 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.35)] transition hover:bg-[#00FF41]/25 hover:shadow-[0_0_28px_rgba(0,255,65,0.5)] disabled:opacity-40">[ ⚡ YENİ MONTAJ İŞLEMİ BAŞLAT ]</button>
                        </>
                      )}}
                    </div>
                  </section>
                ) : (
                  <section className="space-y-3">
                    <button type="button" onClick={{() => setIsMaintenanceModalOpen(true)}} disabled={{busy || techMaintSaving}} className="w-full rounded border border-[#00FF41]/60 bg-[#00FF41]/15 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.35)] transition hover:bg-[#00FF41]/25 hover:shadow-[0_0_28px_rgba(0,255,65,0.5)] disabled:opacity-40">[ + YENİ TEKNİK KAYIT GİRİŞİ ]</button>
                    <button type="button" onClick={{() => openCenterLogs('maint')}} disabled={{!selected}} {view_logs_btn}>
                      [ 🔍 İŞLEM KAYITLARINI GÖRÜNTÜLE ]
                    </button>
                  </section>
                )}}
              </div>
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center p-6 font-mono-technical text-[9px] uppercase text-slate-600">AKSESUAR_SEÇİN</p>
          )}}
        </TacticalPanel>

'''

text = text[:center_start] + center_block + text[center_end:right_start] + right_block + text[right_end:]
path.write_text(text, encoding='utf-8')
print('patched')
