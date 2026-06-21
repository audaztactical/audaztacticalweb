import { useCallback, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Globe, MessageSquare, Package, Pencil, Plus, Save, Shield, Trash2, Video, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  addDoctrine,
  deleteDoctrine,
  fetchAllDoctrinesForAdmin,
  updateDoctrine,
} from '../lib/firestoreDoctrines'
import { addTrainingVideo, deleteTrainingVideo, fetchTrainingVideos } from '../lib/firestoreVideos'
import { bulkAddInventoryItems, parseInventoryBulkText } from '../lib/firestoreInventory'
import IntelModerationTable from '../components/admin/IntelModerationTable'
import FeedbackModerationTable from '../components/admin/FeedbackModerationTable'
import YoutubeChannelsPanel from '../components/admin/YoutubeChannelsPanel'
import {
  ADMIN_EMPTY_STATE,
  ADMIN_TABLE,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_TD,
  ADMIN_TABLE_TH,
  ADMIN_TABLE_WRAP,
} from '../components/admin/adminUi'

/** @typedef {'icerik' | 'istihbarat' | 'youtube-kanallar' | 'geri-bildirim'} AdminTabId */

const ADMIN_TABS = [
  { id: /** @type {AdminTabId} */ ('icerik'), label: 'İçerik & Envanter', icon: Package },
  { id: 'istihbarat', label: 'Haber Ağı', icon: Globe },
  { id: 'youtube-kanallar', label: 'YouTube Kanalları', icon: Video },
  { id: 'geri-bildirim', label: 'Geri Bildirimler', icon: MessageSquare },
]

const emptyDoctrineForm = {
  title: '',
  teaser: '',
  body: '',
  isPublic: false,
  category: 'Genel',
}

/**
 * @param {{ active: boolean, onClick: () => void, label: string, icon: import('lucide-react').LucideIcon }} props
 */
function AdminTabButton({ active, onClick, label, icon }) {
  const IconComponent = icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={[
        'relative inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-3 font-mono-technical text-[11px] font-bold uppercase tracking-wider transition-all',
        active
          ? 'border-accent/40 bg-accent/10 text-accent shadow-[0_-2px_12px_-4px_rgba(132,204,22,0.35)]'
          : 'border-transparent text-app-text/50 hover:border-white/10 hover:bg-white/[0.03] hover:text-app-text/85',
      ].join(' ')}
    >
      <IconComponent className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
      {label}
      {active ? (
        <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden />
      ) : null}
    </button>
  )
}

function AdminSection({ title, subtitle, children, icon: Icon }) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-white/10 bg-black/30 px-5 py-4">
        <div className="flex items-center gap-3">
          {Icon ? <Icon className="size-5 text-accent" strokeWidth={1.5} aria-hidden /> : null}
          <div>
            <h2 className="font-display text-base font-bold uppercase tracking-wider text-accent">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-app-text/55">{subtitle}</p> : null}
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function FieldLabel({ children }) {
  return (
    <label className="mb-1.5 block font-mono-technical text-[10px] font-bold uppercase tracking-widest text-accent/90">
      {children}
    </label>
  )
}

function InputStyle({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={[
        'w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-app-text placeholder:text-app-text/45',
        'focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20',
        className,
      ].join(' ')}
    />
  )
}

function TextAreaStyle({ className = '', ...props }) {
  return (
    <textarea
      {...props}
      className={[
        'w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 font-mono-technical text-sm text-app-text placeholder:text-app-text/45',
        'focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20',
        className,
      ].join(' ')}
    />
  )
}

export default function AdminPanel() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(/** @type {AdminTabId} */ ('icerik'))
  const [doctrines, setDoctrines] = useState([])
  const [videos, setVideos] = useState([])
  const [loadingDoc, setLoadingDoc] = useState(true)
  const [loadingVid, setLoadingVid] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const [form, setForm] = useState(emptyDoctrineForm)
  const [editingId, setEditingId] = useState(null)

  const [videoTitle, setVideoTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')

  const [bulkText, setBulkText] = useState('')

  const showMsg = useCallback((type, text) => {
    setMsg({ type, text })
    if (text) setTimeout(() => setMsg({ type: '', text: '' }), 5000)
  }, [])

  const loadDoctrines = useCallback(async () => {
    setLoadingDoc(true)
    try {
      setDoctrines(await fetchAllDoctrinesForAdmin())
    } catch {
      showMsg('err', 'Doktrinler yüklenemedi.')
    } finally {
      setLoadingDoc(false)
    }
  }, [showMsg])

  const loadVideos = useCallback(async () => {
    setLoadingVid(true)
    try {
      setVideos(await fetchTrainingVideos())
    } catch {
      showMsg('err', 'Videolar yüklenemedi.')
    } finally {
      setLoadingVid(false)
    }
  }, [showMsg])

  useEffect(() => {
    loadDoctrines()
    loadVideos()
  }, [loadDoctrines, loadVideos])

  const resetDoctrineForm = () => {
    setForm(emptyDoctrineForm)
    setEditingId(null)
  }

  const onEditDoctrine = (row) => {
    setEditingId(row.id)
    setForm({
      title: row.title,
      teaser: row.teaser,
      body: row.body,
      isPublic: row.isPublic,
      category: row.category || 'Genel',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onSubmitDoctrine = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      showMsg('err', 'Başlık zorunlu.')
      return
    }
    setBusy(true)
    try {
      if (editingId) {
        await updateDoctrine(editingId, {
          title: form.title,
          teaser: form.teaser,
          body: form.body,
          isPublic: form.isPublic,
          category: form.category,
        })
        showMsg('ok', 'Doktrin güncellendi.')
      } else {
        await addDoctrine({
          title: form.title,
          teaser: form.teaser,
          body: form.body,
          isPublic: form.isPublic,
          category: form.category,
        })
        showMsg('ok', 'Doktrin eklendi.')
      }
      resetDoctrineForm()
      await loadDoctrines()
    } catch {
      showMsg('err', 'Kayıt başarısız. Firestore kurallarını ve admin e-postasını kontrol edin.')
    } finally {
      setBusy(false)
    }
  }

  const onDeleteDoctrine = async (id) => {
    if (!window.confirm('Bu doktrini kalıcı olarak silmek istiyor musunuz?')) return
    setBusy(true)
    try {
      await deleteDoctrine(id)
      showMsg('ok', 'Silindi.')
      if (editingId === id) resetDoctrineForm()
      await loadDoctrines()
    } catch {
      showMsg('err', 'Silinemedi.')
    } finally {
      setBusy(false)
    }
  }

  const onTogglePublish = async (row) => {
    setBusy(true)
    try {
      await updateDoctrine(row.id, { isPublic: !row.isPublic })
      showMsg('ok', row.isPublic ? 'Yayından kaldırıldı.' : 'Yayınlandı.')
      await loadDoctrines()
    } catch {
      showMsg('err', 'Güncellenemedi.')
    } finally {
      setBusy(false)
    }
  }

  const onAddVideo = async (e) => {
    e.preventDefault()
    const u = videoUrl.trim()
    const t = videoTitle.trim()
    if (!t || !u) {
      showMsg('err', 'Başlık ve bağlantı gerekli.')
      return
    }
    const ok =
      /youtube\.com|youtu\.be|vimeo\.com/i.test(u) ||
      u.startsWith('https://') ||
      u.startsWith('http://')
    if (!ok) {
      showMsg('err', 'YouTube veya Vimeo bağlantısı girin.')
      return
    }
    setBusy(true)
    try {
      await addTrainingVideo({ title: t, url: u })
      setVideoTitle('')
      setVideoUrl('')
      showMsg('ok', 'Video eklendi.')
      await loadVideos()
    } catch {
      showMsg('err', 'Video eklenemedi.')
    } finally {
      setBusy(false)
    }
  }

  const onDeleteVideo = async (id) => {
    if (!window.confirm('Bu kaydı silmek istiyor musunuz?')) return
    setBusy(true)
    try {
      await deleteTrainingVideo(id)
      showMsg('ok', 'Video silindi.')
      await loadVideos()
    } catch {
      showMsg('err', 'Silinemedi.')
    } finally {
      setBusy(false)
    }
  }

  const onBulkInventory = async (e) => {
    e.preventDefault()
    const items = parseInventoryBulkText(bulkText)
    if (items.length === 0) {
      showMsg('err', 'Geçerli satır bulunamadı. Format: adet | ürün | seri')
      return
    }
    setBusy(true)
    try {
      const n = await bulkAddInventoryItems(items, user?.uid)
      setBulkText('')
      showMsg('ok', `${n} kalem envantere yazıldı.`)
    } catch {
      showMsg('err', 'Toplu yazım başarısız.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <header className="overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-br from-black/60 via-zinc-950/90 to-black/70 px-5 py-6 shadow-[0_0_48px_-16px_rgba(132,204,22,0.15)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono-technical text-[10px] font-semibold uppercase tracking-[0.35em] text-accent">
              [ YÖNETİM KONSOLU ]
            </p>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-app-text">Admin Panel</h1>
            <p className="mt-2 max-w-2xl text-sm text-app-text/55">
              Komuta merkezi — içerik, istihbarat, kanal yönetimi ve operatör geri bildirimleri.
            </p>
            <p className="mt-2 font-mono-technical text-[10px] uppercase tracking-wider text-app-text/45">
              Yetkili hesap:{' '}
              <span className="text-accent">{user?.email ?? '—'}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 shadow-[0_0_20px_-6px_rgba(132,204,22,0.4)]">
              <Shield className="size-4 text-accent" aria-hidden />
              <span className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent">
                ROOT_ERİŞİM
              </span>
            </div>
          </div>
        </div>
        {msg.text ? (
          <p
            className={`mt-4 rounded-lg border px-4 py-2 font-mono-technical text-sm ${
              msg.type === 'ok'
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                : 'border-orange-500/40 bg-orange-950/30 text-orange-200'
            }`}
          >
            {msg.text}
          </p>
        ) : null}
      </header>

      <nav
        className="flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-white/10 bg-black/30 px-2 pt-2"
        aria-label="Admin panel sekmeleri"
      >
        {ADMIN_TABS.map((tab) => (
          <AdminTabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            label={tab.label}
            icon={tab.icon}
          />
        ))}
      </nav>

      {activeTab === 'istihbarat' ? (
        <IntelModerationTable onFeedback={showMsg} />
      ) : null}

      {activeTab === 'youtube-kanallar' ? (
        <YoutubeChannelsPanel onFeedback={showMsg} />
      ) : null}

      {activeTab === 'geri-bildirim' ? (
        <AdminSection
          title="Operatör geri bildirimleri"
          subtitle="Şikayet & öneri (yeni şema) ve legacy hata/bug raporları — feedback koleksiyonu."
          icon={MessageSquare}
        >
          <FeedbackModerationTable onFeedback={showMsg} />
        </AdminSection>
      ) : null}

      {activeTab === 'icerik' ? (
      <div className="space-y-8">
      <AdminSection
        title="Doktrin yönetimi"
        subtitle="Markdown tam metin; landing yalnızca teaser gösterir."
        icon={Pencil}
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <form onSubmit={onSubmitDoctrine} className="space-y-4">
            <div>
              <FieldLabel>Başlık</FieldLabel>
              <InputStyle
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Doktrin başlığı"
                required
              />
            </div>
            <div>
              <FieldLabel>Özet (Teaser)</FieldLabel>
              <TextAreaStyle
                rows={3}
                value={form.teaser}
                onChange={(e) => setForm((f) => ({ ...f, teaser: e.target.value }))}
                placeholder="Kısa özet — herkese açık önizleme"
              />
            </div>
            <div>
              <FieldLabel>Tam metin (Markdown)</FieldLabel>
              <TextAreaStyle
                rows={12}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder={'## Bölüm\n- Madde 1\n- Madde 2'}
                className="min-h-[200px]"
              />
              <details className="mt-2">
                <summary className="cursor-pointer font-mono-technical text-[10px] uppercase tracking-wider text-app-text/55">
                  Önizleme
                </summary>
                <div className="markdown-admin-preview mt-2 max-h-56 overflow-auto rounded-lg border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-app-text/90">
                  <ReactMarkdown>{form.body || '*Boş*'}</ReactMarkdown>
                </div>
              </details>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Kategori</FieldLabel>
                <InputStyle
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Genel"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-3 font-mono-technical text-sm text-app-text/90">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
                    className="size-4 rounded border-white/20 bg-black/50 text-accent focus:ring-accent/40"
                  />
                  Herkese açık (isPublic)
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg border border-accent/50 bg-accent/15 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-accent transition hover:bg-accent/25 disabled:opacity-50"
              >
                {editingId ? <Save className="size-4" /> : <Plus className="size-4" />}
                {editingId ? 'Güncelle' : 'Doktrin ekle'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetDoctrineForm}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 font-display text-sm text-app-text/70 hover:bg-white/5"
                >
                  <X className="size-4" />
                  İptal
                </button>
              ) : null}
            </div>
          </form>

          <div className={ADMIN_TABLE_WRAP}>
            <div className="border-b border-white/10 bg-black/40 px-4 py-2 font-mono-technical text-[10px] uppercase tracking-widest text-accent/70">
              Kayıtlı doktrinler
            </div>
            <div className="max-h-[560px] overflow-auto">
              {loadingDoc ? (
                <p className="p-4 text-sm text-app-text/55">Yükleniyor…</p>
              ) : doctrines.length === 0 ? (
                <div className={`${ADMIN_EMPTY_STATE} border-0 rounded-none`}>
                  <p className="font-mono-technical text-sm text-app-text/55">Henüz doktrin kaydı yok.</p>
                </div>
              ) : (
                <table className={`${ADMIN_TABLE} min-w-[480px]`}>
                  <thead className={`${ADMIN_TABLE_HEAD} sticky top-0 z-[1]`}>
                    <tr>
                      <th className={ADMIN_TABLE_TH}>Başlık</th>
                      <th className={ADMIN_TABLE_TH}>Kategori</th>
                      <th className={ADMIN_TABLE_TH}>Yayın</th>
                      <th className={`${ADMIN_TABLE_TH} text-right`}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctrines.map((row) => (
                      <tr key={row.id} className={ADMIN_TABLE_ROW}>
                        <td className="max-w-[180px] truncate px-3 py-2.5 font-medium text-app-text" title={row.title}>
                          {row.title}
                        </td>
                        <td className="px-3 py-2.5 text-app-text/70">{row.category}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`rounded px-2 py-0.5 font-mono-technical text-[10px] uppercase ${
                              row.isPublic ? 'bg-emerald-950/50 text-emerald-400' : 'bg-slate-800 text-app-text/55'
                            }`}
                          >
                            {row.isPublic ? 'Açık' : 'Kapalı'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onEditDoctrine(row)}
                              className="rounded border border-white/10 px-2 py-1 text-[10px] uppercase text-accent hover:bg-white/5"
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => onTogglePublish(row)}
                              className="rounded border border-white/10 px-2 py-1 text-[10px] uppercase text-app-text/70 hover:bg-white/5"
                            >
                              {row.isPublic ? 'Yayından kaldır' : 'Yayınla'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteDoctrine(row.id)}
                              className="rounded border border-orange-500/30 px-2 py-1 text-[10px] uppercase text-orange-400 hover:bg-orange-950/30"
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Eğitim videoları" subtitle="YouTube / Vimeo bağlantısı" icon={Video}>
        <form onSubmit={onAddVideo} className="mb-6 grid gap-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <div>
            <FieldLabel>Başlık</FieldLabel>
            <InputStyle value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Video başlığı" />
          </div>
          <div>
            <FieldLabel>Bağlantı</FieldLabel>
            <InputStyle
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="h-10 rounded-lg border border-accent/50 bg-accent/15 px-4 font-display text-sm font-bold text-accent hover:bg-accent/25 disabled:opacity-50"
          >
            Ekle
          </button>
        </form>
        <div className={ADMIN_TABLE_WRAP}>
          <table className={`${ADMIN_TABLE} min-w-[400px]`}>
            <thead className={ADMIN_TABLE_HEAD}>
              <tr>
                <th className={ADMIN_TABLE_TH}>Başlık</th>
                <th className={ADMIN_TABLE_TH}>URL</th>
                <th className={`${ADMIN_TABLE_TH} text-right`}>Sil</th>
              </tr>
            </thead>
            <tbody>
              {loadingVid ? (
                <tr>
                  <td colSpan={3} className={`${ADMIN_TABLE_TD} text-app-text/55`}>
                    Yükleniyor…
                  </td>
                </tr>
              ) : videos.length === 0 ? (
                <tr>
                  <td colSpan={3} className={ADMIN_TABLE_TD}>
                    <p className="py-4 text-center font-mono-technical text-xs text-app-text/55">
                      Henüz eğitim videosu eklenmemiş.
                    </p>
                  </td>
                </tr>
              ) : (
                videos.map((v) => (
                  <tr key={v.id} className={ADMIN_TABLE_ROW}>
                    <td className="px-3 py-2 font-medium text-app-text">{v.title}</td>
                    <td className="max-w-xs truncate px-3 py-2 font-mono-technical text-xs text-app-text/55">{v.url}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteVideo(v.id)}
                        className="rounded border border-orange-500/30 px-2 py-1 text-[10px] uppercase text-orange-400"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminSection
        title="Envanter toplu giriş"
        subtitle="Her satır: adet | ürün adı | seri no (opsiyonel)"
        icon={Plus}
      >
        <form onSubmit={onBulkInventory} className="space-y-4">
          <TextAreaStyle
            rows={10}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'2 | Glock 17 | SN-001\n1 | Telsiz Motorola\n5 | 9mm mühimmat'}
            className="font-mono-technical"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-accent/50 bg-accent/15 px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-accent hover:bg-accent/25 disabled:opacity-50"
          >
            Envantere yaz
          </button>
        </form>
      </AdminSection>
      </div>
      ) : null}
    </div>
  )
}
