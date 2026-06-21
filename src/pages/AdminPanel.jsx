import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  AlignLeft,
  BookOpen,
  ChevronUp,
  Eye,
  FileText,
  Globe,
  Loader2,
  MessageSquare,
  Package,
  Pencil,
  Play,
  Plus,
  Save,
  Shield,
  Tag,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react'
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
import UsersManagementTable from '../components/admin/UsersManagementTable'
import YoutubeChannelsPanel from '../components/admin/YoutubeChannelsPanel'
import {
  ADMIN_BADGE,
  ADMIN_BTN_DANGER,
  ADMIN_BTN_GHOST,
  ADMIN_BTN_PREVIEW,
  ADMIN_BTN_PRIMARY,
  ADMIN_EMPTY_STATE,
  ADMIN_FORM_CARD,
  ADMIN_FORM_CARD_HEADER,
  ADMIN_PANEL_LIST_HEADER,
  ADMIN_SUMMARY_BAR,
  ADMIN_TABLE,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_TD,
  ADMIN_TABLE_TH,
  ADMIN_TABLE_WRAP,
  PUBLISH_TONE,
  VIDEO_SOURCE_TONE,
} from '../components/admin/adminUi'

/** @typedef {'icerik' | 'istihbarat' | 'youtube-kanallar' | 'geri-bildirim' | 'kullanicilar'} AdminTabId */

const ADMIN_TABS = [
  { id: /** @type {AdminTabId} */ ('icerik'), label: 'İçerik & Envanter', icon: Package },
  { id: 'istihbarat', label: 'Haber Ağı', icon: Globe },
  { id: 'youtube-kanallar', label: 'YouTube Kanalları', icon: Video },
  { id: 'geri-bildirim', label: 'Geri Bildirimler', icon: MessageSquare },
  { id: 'kullanicilar', label: 'Kullanıcı Yönetimi', icon: Users },
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

/**
 * @param {{ icon: import('lucide-react').LucideIcon; title: string; accentClass?: string; children: import('react').ReactNode }} props
 */
function DoctrineFormCard({ icon, title, accentClass = 'text-accent', children }) {
  const IconComponent = icon
  return (
    <div className={ADMIN_FORM_CARD}>
      <div className={ADMIN_FORM_CARD_HEADER}>
        <IconComponent className={`size-4 shrink-0 ${accentClass}`} strokeWidth={1.5} aria-hidden />
        <p className={`font-mono-technical text-[10px] font-bold uppercase tracking-widest ${accentClass}`}>{title}</p>
      </div>
      {children}
    </div>
  )
}

/**
 * @param {string} url
 * @returns {'youtube' | 'vimeo' | 'other'}
 */
function detectVideoSource(url) {
  const u = String(url ?? '').toLowerCase()
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('vimeo.com')) return 'vimeo'
  return 'other'
}

/**
 * @param {{ label: string; value: number | string; tone?: string }} props
 */
function SummaryStat({ label, value, tone = 'text-app-text/80' }) {
  return (
    <span className={tone}>
      {label}: <strong className="text-app-text">{value}</strong>
    </span>
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
  const [previewOpen, setPreviewOpen] = useState(false)

  const doctrineStats = useMemo(() => {
    const total = doctrines.length
    const published = doctrines.filter((d) => d.isPublic).length
    return { total, published, draft: total - published }
  }, [doctrines])

  const bulkLineCount = useMemo(() => {
    return bulkText.split('\n').filter((line) => line.trim()).length
  }, [bulkText])

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
        <AdminSection
          title="İstihbarat moderasyonu"
          subtitle={`Son ${30} kayıt — canlı akış. Yanlış pozitifleri doğrudan imha edin.`}
          icon={Globe}
        >
          <IntelModerationTable onFeedback={showMsg} />
        </AdminSection>
      ) : null}

      {activeTab === 'youtube-kanallar' ? (
        <AdminSection
          title="YouTube kanalları"
          subtitle="Liste Firestore'da; videolar RSS ile saatlik botta veya manuel çekimle video_news'e yazılır."
          icon={Video}
        >
          <YoutubeChannelsPanel onFeedback={showMsg} />
        </AdminSection>
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

      {activeTab === 'kullanicilar' ? (
        <AdminSection
          title="Kullanıcı yönetimi"
          subtitle="Operatör hesapları — askıya alma, üyelik düşürme ve kalıcı silme."
          icon={Users}
        >
          <UsersManagementTable onFeedback={showMsg} />
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
            <DoctrineFormCard icon={BookOpen} title="Kimlik & başlık" accentClass="text-accent">
              <FieldLabel>Başlık</FieldLabel>
              <InputStyle
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Doktrin başlığı"
                required
              />
            </DoctrineFormCard>

            <DoctrineFormCard icon={AlignLeft} title="Özet (teaser)" accentClass="text-sky-300/90">
              <FieldLabel>Özet (Teaser)</FieldLabel>
              <TextAreaStyle
                rows={3}
                value={form.teaser}
                onChange={(e) => setForm((f) => ({ ...f, teaser: e.target.value }))}
                placeholder="Kısa özet — herkese açık önizleme"
              />
            </DoctrineFormCard>

            <DoctrineFormCard icon={FileText} title="Tam metin (Markdown)" accentClass="text-amber-300/90">
              <FieldLabel>Tam metin (Markdown)</FieldLabel>
              <TextAreaStyle
                rows={12}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder={'## Bölüm\n- Madde 1\n- Madde 2'}
                className="min-h-[200px]"
              />
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setPreviewOpen((v) => !v)}
                  className={[
                    ADMIN_BTN_PREVIEW,
                    previewOpen ? 'border-accent/40 bg-accent/10 text-accent' : '',
                  ].join(' ')}
                  aria-expanded={previewOpen}
                >
                  {previewOpen ? <ChevronUp className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
                  {previewOpen ? 'Önizlemeyi gizle' : '▶ Önizleme'}
                </button>
                {previewOpen ? (
                  <div className="markdown-admin-preview mt-3 max-h-56 overflow-auto rounded-lg border border-accent/20 bg-black/40 p-4 text-sm leading-relaxed text-app-text/90 shadow-[inset_0_1px_0_rgba(132,204,22,0.08)]">
                    <div className="mb-2 flex items-center gap-2 font-mono-technical text-[9px] uppercase tracking-wider text-accent/60">
                      <Eye className="size-3" aria-hidden />
                      Canlı önizleme
                    </div>
                    <ReactMarkdown>{form.body || '*Boş*'}</ReactMarkdown>
                  </div>
                ) : null}
              </div>
            </DoctrineFormCard>

            <DoctrineFormCard icon={Tag} title="Sınıflandırma & yayın" accentClass="text-emerald-300/90">
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
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 font-mono-technical text-sm text-app-text/90 transition hover:border-emerald-500/30">
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
            </DoctrineFormCard>

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={busy} className={ADMIN_BTN_PRIMARY}>
                {editingId ? <Save className="size-4" /> : <Plus className="size-4" />}
                {editingId ? 'Güncelle' : 'Doktrin ekle'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetDoctrineForm}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 font-display text-sm text-app-text/70 transition hover:bg-white/5"
                >
                  <X className="size-4" />
                  İptal
                </button>
              ) : null}
            </div>
          </form>

          <div>
            <div className={ADMIN_SUMMARY_BAR}>
              <span className="font-bold uppercase tracking-wider text-accent/90">Özet</span>
              <span className="text-app-text/50">·</span>
              <SummaryStat label="Toplam" value={doctrineStats.total} />
              <span className="text-app-text/50">·</span>
              <SummaryStat label="Yayında" value={doctrineStats.published} tone="text-emerald-300/90" />
              <span className="text-app-text/50">·</span>
              <SummaryStat label="Taslak" value={doctrineStats.draft} tone="text-zinc-400" />
            </div>

            <div className={ADMIN_TABLE_WRAP}>
              <div className={ADMIN_PANEL_LIST_HEADER}>Kayıtlı doktrinler</div>
              <div className="max-h-[560px] overflow-auto">
                {loadingDoc ? (
                  <div className="flex items-center justify-center gap-2 p-8 text-app-text/55">
                    <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
                    <span className="font-mono-technical text-xs uppercase tracking-wider">Yükleniyor…</span>
                  </div>
                ) : doctrines.length === 0 ? (
                  <div className={`${ADMIN_EMPTY_STATE} border-0 rounded-none`}>
                    <BookOpen className="size-8 text-app-text/40" strokeWidth={1.25} aria-hidden />
                    <p className="font-mono-technical text-sm text-app-text/55">Henüz doktrin kaydı yok.</p>
                    <p className="text-xs text-app-text/45">Sol taraftaki formdan ilk doktrini ekleyin.</p>
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
                          <td className={`${ADMIN_TABLE_TD} max-w-[200px]`}>
                            <p className="truncate font-bold text-app-text" title={row.title}>
                              {row.title}
                            </p>
                            {editingId === row.id ? (
                              <span className="mt-1 inline-block rounded border border-amber-500/35 bg-amber-950/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                                Düzenleniyor
                              </span>
                            ) : null}
                          </td>
                          <td className={ADMIN_TABLE_TD}>
                            <span className={[ADMIN_BADGE, 'border-accent/30 bg-accent/10 text-accent/90'].join(' ')}>
                              {row.category || 'Genel'}
                            </span>
                          </td>
                          <td className={ADMIN_TABLE_TD}>
                            <span
                              className={[
                                ADMIN_BADGE,
                                row.isPublic ? PUBLISH_TONE.public : PUBLISH_TONE.private,
                              ].join(' ')}
                            >
                              {row.isPublic ? 'Açık' : 'Kapalı'}
                            </span>
                          </td>
                          <td className={`${ADMIN_TABLE_TD} text-right`}>
                            <div className="flex flex-wrap justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => onEditDoctrine(row)}
                                className={[ADMIN_BTN_GHOST, 'text-accent hover:border-accent/30 hover:text-accent'].join(' ')}
                              >
                                Düzenle
                              </button>
                              <button type="button" onClick={() => onTogglePublish(row)} className={ADMIN_BTN_GHOST}>
                                {row.isPublic ? 'Yayından kaldır' : 'Yayınla'}
                              </button>
                              <button type="button" onClick={() => onDeleteDoctrine(row.id)} className={ADMIN_BTN_DANGER}>
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
        </div>
      </AdminSection>

      <AdminSection title="Eğitim videoları" subtitle="YouTube / Vimeo bağlantısı" icon={Video}>
        <div className={ADMIN_SUMMARY_BAR}>
          <span className="font-bold uppercase tracking-wider text-accent/90">Özet</span>
          <span className="text-app-text/50">·</span>
          <SummaryStat label="Toplam video" value={loadingVid ? '…' : videos.length} />
        </div>

        <form onSubmit={onAddVideo} className={`${ADMIN_FORM_CARD} mb-6`}>
          <div className={ADMIN_FORM_CARD_HEADER}>
            <Video className="size-4 text-accent" strokeWidth={1.5} aria-hidden />
            <p className="font-mono-technical text-[10px] font-bold uppercase tracking-widest text-accent">
              Yeni video ekle
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
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
            <button type="submit" disabled={busy} className={`${ADMIN_BTN_PRIMARY} h-10 shrink-0`}>
              <Plus className="size-4" aria-hidden />
              Ekle
            </button>
          </div>
        </form>

        {loadingVid ? (
          <div className="flex items-center justify-center gap-2 py-10 text-app-text/55">
            <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
            <span className="font-mono-technical text-xs uppercase tracking-wider">Videolar yükleniyor…</span>
          </div>
        ) : videos.length === 0 ? (
          <div className={ADMIN_EMPTY_STATE}>
            <Video className="size-8 text-app-text/40" strokeWidth={1.25} aria-hidden />
            <p className="font-mono-technical text-sm text-app-text/55">Henüz eğitim videosu eklenmemiş.</p>
          </div>
        ) : (
          <div className={ADMIN_TABLE_WRAP}>
            <div className={ADMIN_PANEL_LIST_HEADER}>Kayıtlı videolar</div>
            <table className={`${ADMIN_TABLE} min-w-[400px]`}>
              <thead className={`${ADMIN_TABLE_HEAD} sticky top-0 z-[1]`}>
                <tr>
                  <th className={ADMIN_TABLE_TH}>Başlık</th>
                  <th className={ADMIN_TABLE_TH}>Kaynak</th>
                  <th className={ADMIN_TABLE_TH}>URL</th>
                  <th className={`${ADMIN_TABLE_TH} text-right`}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((v) => {
                  const source = detectVideoSource(v.url)
                  return (
                    <tr key={v.id} className={ADMIN_TABLE_ROW}>
                      <td className={`${ADMIN_TABLE_TD} font-bold text-app-text`}>{v.title}</td>
                      <td className={ADMIN_TABLE_TD}>
                        <span className={[ADMIN_BADGE, VIDEO_SOURCE_TONE[source]].join(' ')}>
                          {source === 'youtube' ? 'YouTube' : source === 'vimeo' ? 'Vimeo' : 'Bağlantı'}
                        </span>
                      </td>
                      <td className={`${ADMIN_TABLE_TD} max-w-xs truncate font-mono-technical text-xs text-app-text/55`} title={v.url}>
                        {v.url}
                      </td>
                      <td className={`${ADMIN_TABLE_TD} text-right`}>
                        <button type="button" onClick={() => onDeleteVideo(v.id)} className={ADMIN_BTN_DANGER}>
                          <Trash2 className="size-3" aria-hidden />
                          Sil
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Envanter toplu giriş"
        subtitle="Her satır: adet | ürün adı | seri no (opsiyonel)"
        icon={Plus}
      >
        <div className={ADMIN_SUMMARY_BAR}>
          <span className="font-bold uppercase tracking-wider text-accent/90">Özet</span>
          <span className="text-app-text/50">·</span>
          <SummaryStat label="Satır" value={bulkLineCount} tone="text-amber-300/90" />
        </div>

        <form onSubmit={onBulkInventory} className="space-y-4">
          <div className={ADMIN_FORM_CARD}>
            <div className={ADMIN_FORM_CARD_HEADER}>
              <Package className="size-4 text-accent" strokeWidth={1.5} aria-hidden />
              <p className="font-mono-technical text-[10px] font-bold uppercase tracking-widest text-accent">
                Toplu envanter metni
              </p>
            </div>
            <TextAreaStyle
              rows={10}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'2 | Glock 17 | SN-001\n1 | Telsiz Motorola\n5 | 9mm mühimmat'}
              className="font-mono-technical"
            />
            <p className="mt-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono-technical text-[10px] leading-relaxed text-app-text/50">
              Format: <span className="text-amber-300/90">adet | ürün adı | seri no</span> — seri no opsiyonel.
            </p>
          </div>
          <button type="submit" disabled={busy || bulkLineCount === 0} className={ADMIN_BTN_PRIMARY}>
            <Package className="size-4" aria-hidden />
            Envantere yaz
          </button>
        </form>
      </AdminSection>
      </div>
      ) : null}
    </div>
  )
}
