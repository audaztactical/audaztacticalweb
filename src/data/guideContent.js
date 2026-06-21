/**
 * @typedef {Object} GuideStatusCallout
 * @property {string} now — Kodda şu an geçerli davranış
 * @property {string} launch — Lansman / planlanan tier vaadi (Pricing.jsx)
 */

/**
 * @typedef {Object} GuideSectionContent
 * @property {string} title
 * @property {string} [opsCode]
 * @property {string} [route]
 * @property {string} access — Kim erişir
 * @property {string} purpose
 * @property {string[]} [prerequisites]
 * @property {string[]} steps
 * @property {GuideStatusCallout} [status]
 * @property {string} [flowId] — guideFlows.js anahtarı
 * @property {string[]} [notes]
 * @property {boolean} [instructorOnly]
 * @property {boolean} [adminOnly]
 */

/** @type {Record<string, GuideSectionContent>} */
export const GUIDE_SECTIONS = {
  'platform-intro': {
    title: 'Platform tanıtımı',
    opsCode: 'SYS-00',
    access: 'Herkes (Landing); korumalı modüller giriş gerektirir.',
    purpose:
      'Audaz Tactical, operatörlerin antrenman kayıtları, cephanelik, görev/AAR, taktik muhabere ve analitik verilerini tek terminalde yönetmesini sağlar.',
    steps: [
      'Karargâh (/) sayfasından kayıt olun veya giriş yapın.',
      'E-posta/şifre veya Google ile kimlik doğrulaması tamamlanır.',
      'Beta döneminde aktif hesaplar doğrudan /dashboard\'a yönlendirilir.',
      'Sidebar grupları: Kişisel, Audaz Ağı, Operasyon, Komuta, Kullanım Kılavuzu, Sistem.',
    ],
    status: {
      now: 'Platform beta test dönemindedir (isPlatformInBetaPeriod). Premium ödeme akışı kapalıdır; /premium-gecis otomatik olarak /dashboard\'a yönlendirir.',
      launch:
        'Lansman tarihinden (VITE_PLATFORM_LAUNCH_ISO) sonra yeni kayıtlar için premium gereksinimi ve kilitli hesap yönlendirmesi devreye girebilir.',
    },
    notes: [
      'Bu kılavuz kod davranışına göre güncellenir; pazarlama metinleri ile karıştırılmamalıdır.',
    ],
  },

  'first-login-checklist': {
    title: 'İlk giriş checklist',
    opsCode: 'ONB-01',
    access: 'Yeni kayıt olan tüm operatörler.',
    purpose: 'İlk oturumda minimum operasyonel hazırlığı tamamlamak için önerilen sıra.',
    prerequisites: ['Geçerli Firebase oturumu', 'Operatör profili (kayıt sırasında veya /profil)'],
    steps: [
      'Kayıt / giriş tamamla → /dashboard.',
      '/profil üzerinden callsign, avatar ve kan grubunu doğrula.',
      '/cephanelik → en az bir silah ve eşleşen mühimmat ekle.',
      '/antrenman → ATIŞ sektörü → ilk atış kaydını gir.',
      '/dashboard → ORS göstergesi ve sistem logunu kontrol et.',
    ],
    flowId: 'ilk-kurulum',
    status: {
      now: 'Tüm bireysel antrenman sektörleri (ATIŞ–EĞİTİM) kayıtlı operatörlere açıktır; ATIŞ için cephanelik ön koşulu kodda zorunludur.',
      launch:
        'Ücretsiz planda yalnızca ATIŞ terminali ve 10 kayıt limiti; CQB/FOF/Eğitim terminalleri kilitli olacak şekilde planlandı (Pricing.jsx — henüz uygulanmıyor).',
    },
  },

  'roles-access-matrix': {
    title: 'Roller ve erişim matrisi',
    opsCode: 'ACL-01',
    access: 'Tüm kullanıcılar (kendi rolünü görmek için).',
    purpose: 'Hangi rolün hangi modüle erişebileceğini netleştirmek.',
    steps: [
      'member (varsayılan): Tüm korumalı modüller, /egitmen-komuta hariç.',
      'premium_member: Kod ile yükseltme; şu an member ile aynı terminal erişimi (tier kısıtı yok).',
      'instructor: + Eğitmen Kontrol Paneli (/egitmen-komuta), grup eğitimi oturumu başlatma.',
      'admin: + /admin, /fiyatlandirma (AdminRoute + custom claim).',
      'accountStatus=locked: Ödeme açıkken /premium-gecis veya /site-bakimda; beta\'da kısıtlama uygulanmaz.',
    ],
    status: {
      now: 'Rol kontrolü yalnızca /egitmen-komuta (InstructorRoute) ve /admin, /fiyatlandirma (AdminRoute) için sıkıdır. Antrenman sektörleri role göre filtrelenmez.',
      launch:
        'Premium üyelik CQB/FOF/Eğitim/VBSS/TCCC tam paket, sınırsız görev ve gelişmiş ORS vaat eder; ödeme MockStripeCheckout ile planlanmış.',
    },
  },

  'email-verification-locked': {
    title: 'E-posta doğrulama ve kilitli hesap',
    opsCode: 'AUTH-02',
    route: '/verify-email',
    access: 'Doğrulama: şifre kayıtlı kullanıcılar (lansman sonrası). Kilitli: accountStatus=locked.',
    purpose: 'Hesap güvenliği ve abonelik durumu yönetimi.',
    steps: [
      'Şifre ile kayıt + lansman sonrası → /verify-email\'e yönlendirilir.',
      'E-postadaki bağlantıya tıkla → "Yeniden kontrol" → /dashboard.',
      'Google ile giriş genelde doğrulama gerektirmez.',
      'Kilitli hesap: /ayarlar erişilebilir; diğer modüller ödeme açıkken kısıtlanır.',
    ],
    status: {
      now: 'Beta döneminde aktif hesaplar e-posta doğrulamasına düşmez (userRequiresEmailVerification). Kilitli hesap yönlendirmesi isPremiumPaymentEnabled=false iken devre dışı.',
      launch:
        '20 günlük deneme sonrası yeni kayıtlar premium gerektirebilir; kilitli hesaplar /premium-gecis üzerinden yükseltme bekler.',
    },
  },

  landing: {
    title: 'Karargâh (Landing)',
    opsCode: 'HQ-00',
    route: '/',
    access: 'Herkes (public). Oturum açıkken sidebar\'dan "Karargâh\'a Dön".',
    purpose: 'Tanıtım, haber teaser, kayıt ve giriş paneli.',
    steps: [
      'Intro overlay (ilk ziyaret) veya atla.',
      'Operasyon paneline kaydır → Kayıt veya Giriş sekmesi.',
      'Google veya e-posta/şifre + kullanıcı adı (kayıt).',
      'Yasal protokol onayı → oturum → /dashboard.',
    ],
  },

  dashboard: {
    title: 'Ana Sayfa (Dashboard)',
    opsCode: 'CMD-00',
    route: '/dashboard',
    access: 'Tüm korumalı kullanıcılar.',
    purpose: 'ORS hazırlık göstergesi, aktif görevler, cephanelik bakım alarmı, muhabere bildirimleri, operasyonel radar.',
    steps: [
      'Giriş sonrası varsayılan hedef sayfa.',
      'Widget\'lardan görev, cephanelik veya antrenmana geç.',
      'Sistem logu son aktiviteleri listeler.',
    ],
  },

  profile: {
    title: 'Profilim',
    opsCode: 'ID-01',
    route: '/profil',
    access: 'Tüm korumalı kullanıcılar.',
    purpose: 'Callsign, kullanıcı adı, avatar, telefon, kan grubu; ORS özeti ve aktivite geçmişi.',
    prerequisites: ['createOperatorProfile kaydı (kayıt akışında oluşturulur)'],
    steps: [
      'Callsign ve kullanıcı adını düzenle → kaydet.',
      'Avatar yükle (Storage).',
      'Kan grubu seç (TCCC entegrasyonu için).',
      'Şifre değiştir (e-posta hesabı).',
    ],
  },

  'operator-profile': {
    title: 'Operatör sicili',
    opsCode: 'ID-02',
    route: '/profil/:operatorUid',
    access: 'Tüm korumalı kullanıcılar (başka operatör profili).',
    purpose: 'Forum veya Muhabere\'den açılan salt okunur operatör özeti.',
    steps: [
      'Forum gönderisinde veya Muhabere\'de callsign\'a tıkla.',
      '/profil/{uid} sicil kartı açılır.',
      '"Brifing Odasına dön" ile foruma geri dön.',
    ],
  },

  akademi: {
    title: 'Audaz Akademi',
    opsCode: 'EDU-07',
    route: '/akademi',
    access: 'Tüm korumalı kullanıcılar.',
    purpose: 'Doktrin metinleri ve eğitim video kütüphanesi (planlanan).',
    steps: [
      'Sidebar → Audaz Akademi.',
      'Tam sürümde: doktrin listesi + video embed.',
    ],
    status: {
      now: 'AKADEMI_COMING_SOON=true — "Geliştirme aşamasında" ekranı gösterilir; içerik erişilemez.',
      launch: 'Premium planda tam Akademi erişimi vaat edilir (Pricing.jsx).',
    },
  },

  forum: {
    title: 'Brifing Odası (Forum)',
    opsCode: 'BRF-01',
    route: '/forum',
    access: 'Tüm korumalı kullanıcılar.',
    purpose: 'Kategorili taktik tartışma: gönderi, yanıt, beğeni, görsel ek.',
    steps: [
      'Kategori seç: SİLAH SİSTEMLERİ, CQB & TAKTİK, TCCC & MEDİKAL, GENEL OPERASYON.',
      'Yeni brifing → başlık, içerik, isteğe bağlı görsel → yayınla.',
      'Gönderiye tıkla → yanıt yaz veya beğen.',
      'Yazar callsign → operatör siciline git.',
    ],
  },

  'forum-reports': {
    title: 'Forum şikayet sistemi',
    opsCode: 'MOD-01',
    access: 'Şikayet: tüm kullanıcılar. Moderasyon: admin.',
    purpose: 'Uygunsuz forum içeriğini bildirmek ve admin incelemesi.',
    steps: [
      'Gönderi veya yanıtta bayrak (Flag) simgesine tıkla.',
      'Sebep seç (spam, taciz vb.) → gönder.',
      'Admin → Forum Moderasyonu sekmesinde inceleme.',
    ],
    notes: ['Genel site geri bildirimi sidebar "Şikayet & Öneri" ile ayrı kanaldır.'],
  },

  'intel-feed': {
    title: 'Küresel Haber Ağı',
    opsCode: 'INT-01',
    route: '/istihbarat',
    access: 'Tüm korumalı kullanıcılar.',
    purpose: 'Admin beslemeli yazılı haberler ve YouTube video haber akışı; TR/EN toggle.',
    steps: [
      'Yazılı / Video sekmesi seç.',
      'Kartta özet oku → dil değiştir (varsa).',
      'Harici kaynak linkine git.',
    ],
  },

  'feedback-system': {
    title: 'Şikayet & Öneri (genel)',
    opsCode: 'FB-01',
    access: 'Tüm korumalı kullanıcılar.',
    purpose: 'Platform geri bildirimi (forum moderasyonundan bağımsız).',
    steps: [
      'Sidebar [ SİSTEM ] → Şikayet & Öneri.',
      'Panel açılır → mesajını yaz → gönder.',
      'Admin Geri Bildirimler sekmesinde listelenir.',
    ],
  },

  missions: {
    title: 'Görevlerim / AAR Terminal',
    opsCode: 'OPS-01',
    route: '/gorevler',
    access: 'Tüm korumalı kullanıcılar.',
    purpose: 'Operasyon planlama, yürütme kaydı ve After Action Review (AAR).',
    steps: [
      'Yeni görev (+) → tür (CQB, MİLSİM, SABOTAJ, Gerçek Görev) seç.',
      'Bölge, tarih, açıklama doldur → kaydet.',
      'Grid\'den görevi aç → düzenle veya AAR tamamla.',
      'Sonuç: Başarılı / Kısmi / Başarısız / Planlama + debrief notları.',
      'Sahip operatör çöp kutusu ile silebilir.',
    ],
    status: {
      now: 'Görev kayıt sayısında kod tabanında ücretsiz tier limiti uygulanmıyor.',
      launch: 'Ücretsiz planda sınırlı görev kaydı; Premium\'da sınırsız (Pricing.jsx).',
    },
  },

  'training-hub': {
    title: 'Antrenman ve Operasyon hub',
    opsCode: 'TRN-00',
    route: '/antrenman',
    access: 'Hub: tüm kullanıcılar. Grup Eğitimi kartı: grup üyesi veya eğitmen.',
    purpose: 'Altı bireysel sektör + Grup Eğitimi + (eğitmen için) Kontrol Paneli kartı.',
    steps: [
      'Sidebar → Antrenman ve Operasyon.',
      'Sektör kartına tıkla → terminal açılır.',
      'Geri ok ile hub\'a dön.',
      'URL: ?sector=atis&training= (grup deep link).',
    ],
    status: {
      now: 'filterTrainingCategoriesByAccess: bireysel 6 sektör herkese açık; grup-egitimi yalnızca group/groupId veya instructor.',
      launch: 'Ücretsiz planda CQB/FOF/Eğitim kilitli olacak şekilde planlandı — şu an uygulanmıyor.',
    },
  },

  'sector-atis': {
    title: 'ATIŞ sektörü',
    opsCode: 'RNG-01',
    route: '/antrenman?sector=atis',
    access: 'Tüm korumalı kullanıcılar.',
    purpose: 'Atış günlüğü; drill türü, atım/isabet, süreli atış; mühimmat stok düşümü.',
    prerequisites: [
      'Cephanelikte en az 1 silah',
      'En az 1 mühimmat kaydı (kalibre eşleşmesi)',
    ],
    steps: [
      'Silah seç (cephanelikten).',
      'Mühimmat otomatik veya manuel eşleştir.',
      'Drill türü seç (özel drill ise ad gir).',
      'Atım ve isabet sayısı; süreli ise split/total/first shot.',
      'Kaydet → range_logs + stok güncellenir.',
    ],
    flowId: 'atis-kaydi',
    status: {
      now: '10 kayıt limiti kodda YOK — sınırsız kayıt girilebilir. Stok yetersizse gönderim engellenir.',
      launch: 'Ücretsiz planda toplam 10 ATIŞ kaydı (tek seferlik, aylık sıfırlanmaz) planlandı.',
    },
  },

  'sector-cqb': {
    title: 'CQB sektörü',
    opsCode: 'CQB-02',
    route: '/antrenman?sector=cqb',
    access: 'Tüm korumalı kullanıcılar (beta).',
    purpose: 'Oda temizleme / clearance antrenman kaydı.',
    steps: [
      'Oda topolojisi, giriş metodu, kırma tipi, kapı durumu seç.',
      'Takım boyutu, tehdit/etkisiz sayıları.',
      'Clearance süresi (sn), accuracy (0–100), güvenlik ihlali sayısı.',
      'Taktik karar seç → kaydet.',
    ],
    status: {
      now: 'Tüm doğrulanmış operatörlere açık; cephanelik ön koşulu yok.',
      launch: 'Ücretsiz planda kilitli; Premium ile açılacak (Pricing.jsx locked listesi).',
    },
  },

  'sector-fof': {
    title: 'FOF sektörü',
    opsCode: 'FOF-03',
    route: '/antrenman?sector=fof',
    access: 'Tüm korumalı kullanıcılar (beta).',
    purpose: 'Force-on-force simülasyon kaydı ve debrief.',
    steps: [
      'Senaryo tipi ve simülasyon sistemi seç.',
      'Süre (sn), atış sayısı, angajman türü.',
      'Karar doğruluğu (0–100).',
      'Debrief notu zorunlu → kaydet.',
    ],
    status: {
      now: 'Tüm operatörlere açık.',
      launch: 'Ücretsiz planda kilitli; Premium gerekli.',
    },
  },

  'sector-vbss': {
    title: 'VBSS sektörü',
    opsCode: 'VBS-04',
    route: '/antrenman?sector=vbss',
    access: 'Tüm korumalı kullanıcılar.',
    purpose: 'VBSS operasyon antrenman günlüğü (vbss_logs).',
    steps: [
      'Terminal form alanlarını doldur.',
      'Doğrulama geç → kaydet.',
      'Kişisel Başarı Takibi\'nde VBSS disiplini altında görünür.',
    ],
    status: {
      now: 'Role göre kısıt yok.',
      launch: 'Premium tam terminal paketinde sınırsız VBSS vaat edilir.',
    },
  },

  'sector-tccc-training': {
    title: 'TCCC terminal (antrenman)',
    opsCode: 'MED-05',
    route: '/antrenman?sector=tccc',
    access: 'Tüm korumalı kullanıcılar; grup eval için grup üyeliği.',
    purpose: 'MARCH faz değerlendirme, gözlemli eval, PDF — antrenman kaydı.',
    steps: [
      'HUD / PDF / Entry / Observed modları arasında geç.',
      'MARCH faz skorlarını gir.',
      'Kayıt tccc_logs koleksiyonuna yazılır.',
    ],
    notes: [
      '/tccc (TCCC & Sağlık) modülünden farklıdır — bu sayfa antrenman/değerlendirme terminalidir.',
    ],
    status: {
      now: 'Bireysel TCCC antrenmanı tüm operatörlere açık.',
      launch: 'Tam TCCC paketi (DD-1380, 9-Line, CASEVAC vb.) Premium vaadi; /tccc suite kapsamı genişler.',
    },
  },

  'sector-egitim': {
    title: 'EĞİTİM sektörü',
    opsCode: 'EDU-06',
    route: '/antrenman?sector=egitim',
    access: 'Tüm korumalı kullanıcılar (beta).',
    purpose: 'Eğitim planı / tatbikat hedefi kaydı (trainings).',
    steps: [
      'Eğitim odağı ve zorluk seviyesi seç.',
      'Hedef tarih ve tahmini süre (dk) gir.',
      'Plan kaydı oluştur → ilerleme güncelle.',
    ],
    status: {
      now: 'Tüm operatörlere açık.',
      launch: 'Ücretsiz planda Eğitim terminali kilitli planlandı.',
    },
  },

  'group-training': {
    title: 'Grup eğitimi',
    opsCode: 'GRP-07',
    route: '/antrenman?sector=grup-egitimi',
    access: 'Grup üyesi (userData.group / groupId) veya eğitmen.',
    purpose: 'Eğitmenin başlattığı canlı oturuma katılım.',
    prerequisites: ['Gruba katılım (şifre) veya eğitmen rolü', 'Eğitmenin aktif oturum açması'],
    steps: [
      'Eğitmen /egitmen-komuta → Eğitim sekmesinde oturum başlatır.',
      'Operatör /basarilar veya eğitmenden grup şifresi alır → gruba katılır.',
      'Antrenman hub\'da [ EĞİTMEN OTURUMU AKTİF ] banner görünür.',
      'Grup Eğitimi kartı → deep link ile oturuma bağlan.',
    ],
    flowId: 'grup-egitimi',
  },

  'tccc-suite': {
    title: 'TCCC & Sağlık',
    opsCode: 'MED-SUITE',
    route: '/tccc',
    access: 'Tüm korumalı kullanıcılar.',
    purpose: 'Kişisel sağlık profili, MARCH evrak çantası, IFAK envanter ve SKT takibi.',
    steps: [
      'Menüden kart seç: Kişisel Sağlık, Taktik Medikal Kılavuz & Evrak, IFAK & Lojistik.',
      'Sağlık: alerji, aşı, kan grubu senkronu.',
      'IFAK: malzeme ekle → SKT uyarıları (TcccAlertContext).',
    ],
    notes: ['Antrenman TCCC terminali /antrenman?sector=tccc adresindedir.'],
    status: {
      now: 'Temel sağlık ve IFAK modülleri tüm operatörlere açık.',
      launch: 'Premium\'da tam TCCC evrak paketi vaat edilir.',
    },
  },

  cephanelik: {
    title: 'Cephanelik (ILWS)',
    opsCode: 'ILWS-01',
    route: '/cephanelik',
    access: 'Tüm korumalı kullanıcılar.',
    purpose: 'Silah, optik/aksesuar, mühimmat envanteri; denetim terminali; bakım/namlu ömrü.',
    steps: [
      'Hub: Silahlar / Aksesuarlar / Mühimmat kategorisi seç.',
      'Ekle modal → teknik alanları doldur → kaydet.',
      'Deep dive listesinde düzenle; filtre çipleri (P_TFK, T_TAB, OPT, MHM).',
      'ATIŞ terminali bu envanterden silah ve mühimmat çeker.',
      'Dashboard bakım alarmı kritik eşiği aşınca tetiklenir.',
    ],
    status: {
      now: 'Tam ILWS derinlemesine erişim tüm operatörlere açık.',
      launch: 'Premium\'da derinlemesine cephanelik + denetim kaydı vaat edilir.',
    },
  },

  'progress-tracker': {
    title: 'Kişisel Başarı Takibi',
    opsCode: 'ORS-01',
    route: '/basarilar',
    access: 'Tüm korumalı kullanıcılar.',
    purpose: 'ORS skoru, disiplin filtreleri, trend grafikleri, aktivite feed.',
    prerequisites: ['Anlamlı veri için antrenman/görev kayıtları'],
    steps: [
      'Zaman dilimi: 7 gün / 30 gün / tüm zamanlar.',
      'Disiplin filtresi: ATIŞ, CQB, FOF, VBSS, TCCC.',
      'HUD panellerini genişlet; log detayına odaklan.',
    ],
    status: {
      now: 'Tüm analitik paneller role göre kısıtlanmaz.',
      launch: 'Premium\'da ORS gelişmiş analitik (MATRIX/RADAR/WAVE/TREND) vaat edilir.',
    },
  },

  'group-join': {
    title: 'Gruba katılım',
    opsCode: 'GRP-JOIN',
    route: '/basarilar',
    access: 'Grupsuz operatörler.',
    purpose: 'Eğitmenin verdiği grup şifresi ile takıma dahil olmak.',
    steps: [
      'Kişisel Başarı Takibi sayfasında Grup Şifresi paneli.',
      'Min 4 karakter şifre gir → Katıl.',
      'Başarılı → userData.group güncellenir → Grup Eğitimi kartı hub\'da görünür.',
    ],
  },

  'instructor-dashboard': {
    title: 'Eğitmen Kontrol Paneli',
    opsCode: 'CMD-09',
    route: '/egitmen-komuta',
    access: 'Yalnızca instructor rolü (InstructorRoute).',
    purpose: 'Grup yönetimi, operatör raporlama, canlı eğitim oturumu, analitik.',
    instructorOnly: true,
    steps: [
      'Gruplar: oluştur, şifre ata, üye listele.',
      'Operatör Raporlama: platform operatör profilleri.',
      'Eğitim: oturum başlat/durdur → operatörler Grup Eğitimi\'nden katılır.',
      'Analitik: grup aktivite logları.',
    ],
    notes: ['Sidebar\'da [ KOMUTA VE ANALİTİK ] altına dinamik eklenir.'],
  },

  settings: {
    title: 'Ayarlar',
    opsCode: 'CFG-01',
    route: '/ayarlar',
    access: 'Tüm korumalı; kilitli hesaplar da erişebilir.',
    purpose: 'Tema, bildirim tercihleri, geri bildirim formu.',
    steps: [
      'SettingsPanel ile görünüm ve bildirim ayarlarını değiştir.',
      'Geri bildirim formu gönder.',
      'Admin: eğitmen davet token üret (tek kullanımlık).',
    ],
  },

  'access-codes': {
    title: 'Erişim kodları',
    opsCode: 'KEY-01',
    route: '/ayarlar',
    access: 'Tüm korumalı kullanıcılar.',
    purpose: 'Premium veya Pro-Eğitmen rolünü etkinleştirmek (beta döneminde birincil yükseltme yolu).',
    steps: [
      'Ayarlar → Erişim Kodu paneli.',
      'Min 8 karakter kod gir → kullan.',
      'callRedeemAccessCode → rol güncellenir → refreshUserProfile.',
    ],
    status: {
      now: 'Premium ödeme kapalı; yükseltme erişim kodu ile yapılır (AccessCodeRedeemPanel).',
      launch: 'Ödeme akışı /premium-gecis ve MockStripeCheckout ile birlikte devreye girebilir.',
    },
  },

  'pricing-plans': {
    title: 'Üyelik planları',
    opsCode: 'BIL-01',
    route: '/fiyatlandirma',
    access: 'Yalnızca admin (AdminRoute).',
    adminOnly: true,
    purpose: 'Plan karşılaştırma ekranı — pazarlama ve gelecek tier yapısı referansı.',
    steps: [
      'Admin sidebar → Fiyatlandırma.',
      'ÜCRETSİZ / PREMİUM / PRO-EĞİTMEN kartlarını incele.',
      'CTA → "Ödeme yakında" modal (gerçek ödeme yok).',
    ],
    status: {
      now: 'Sayfa admin-only; fiyatlar SHOW_REAL_PRICES=false ile maskelenebilir. Tier kısıtları kodda uygulanmıyor.',
      launch: 'Plan vaatleri: ücretsiz ATIŞ 10 kayıt + kilitli CQB/FOF/Eğitim; Premium sınırsız terminaller.',
    },
    notes: [
      'Kılavuz okuyucusu bu sayfayı göremez; içerik referans amaçlı burada özetlenir.',
    ],
  },

  'admin-panel': {
    title: 'Admin Paneli',
    opsCode: 'ADM-01',
    route: '/admin',
    access: 'Admin (custom claim + showAdminPanel).',
    adminOnly: true,
    purpose: 'Platform içerik ve kullanıcı yönetimi.',
    steps: [
      'İçerik & Envanter: Akademi doktrin CRUD.',
      'Haber Ağı: intel feed yazılı haber.',
      'YouTube Kanalları: video kaynakları.',
      'Geri Bildirimler: kullanıcı feedback.',
      'Forum Moderasyonu: forum_reports inceleme.',
      'Kullanıcı Yönetimi: rol ve hesap durumu.',
    ],
  },

  troubleshooting: {
    title: 'Sorun giderme',
    opsCode: 'DBG-01',
    access: 'Tüm kullanıcılar.',
    purpose: 'Sık karşılaşılan hatalar ve çözümler.',
    steps: [
      'ATIŞ: CEPHANELİKTE_SİLAH_YOK → önce silah ekle.',
      'ATIŞ: STOK_YETERSİZ → mühimmat stoğunu artır veya atım sayısını düşür.',
      'Grup: group-not-found → şifreyi eğitmenle doğrula.',
      'Forum şikayet permission → admin rules deploy (deploy-backend).',
      'Firestore hataları → ekrandaki Firebase hata panelini kontrol et.',
    ],
  },

  'deep-links': {
    title: 'Derin linkler ve URL parametreleri',
    opsCode: 'REF-01',
    access: 'Referans.',
    purpose: 'Doğrudan modül/sektör açılışı için URL kalıpları.',
    steps: [
      '/antrenman?sector=atis|cqb|fof|vbss|tccc|egitim|grup-egitimi',
      '/antrenman?sector=grup-egitimi&training={groupTrainingId}',
      'location.state: { groupTrainingId, trainingSector }',
      '/profil/{operatorUid}',
      '/mesajlar? (Muhabere query parametreleri)',
    ],
  },

  glossary: {
    title: 'Terimler sözlüğü',
    opsCode: 'REF-02',
    access: 'Referans.',
    purpose: 'Platform kısaltmaları.',
    steps: [
      'ORS — Operatör Hazırlık Skoru (computeORS).',
      'AAR — After Action Review; görev sonrası debrief.',
      'ILWS — Envanter Lojistik Silah Sistemi (Cephanelik).',
      'MARCH — Massive hemorrhage, Airway, Respiration, Circulation, Hypothermia.',
      'FOF — Force on Force.',
      'VBSS — Visit, Board, Search, Seizure.',
      'TCCC — Tactical Combat Casualty Care.',
    ],
  },
}

/** @param {string} id */
export function getGuideSection(id) {
  return GUIDE_SECTIONS[id] ?? null
}
