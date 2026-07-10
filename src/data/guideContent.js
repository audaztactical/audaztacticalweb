/**
 * @typedef {Object} GuidePageLink
 * @property {string} to
 * @property {string} label
 */

/**
 * @typedef {Object} GuideSectionContent
 * @property {string} title
 * @property {string} [opsCode]
 * @property {GuidePageLink} [pageLink]
 * @property {string} access
 * @property {string} purpose
 * @property {string[]} [prerequisites]
 * @property {string[]} steps
 * @property {string} [infoNote]
 * @property {string} [flowId]
 * @property {string[]} [notes]
 * @property {boolean} [instructorOnly]
 * @property {boolean} [adminOnly]
 */

/** @type {Record<string, GuideSectionContent>} */
export const GUIDE_SECTIONS = {
  'platform-intro': {
    title: 'Platform tanıtımı',
    opsCode: 'SYS-00',
    access: 'Karargâh sayfası herkese açık; diğer modüller için giriş gerekir.',
    purpose:
      'Audaz Tactical, antrenman kayıtları, cephanelik, görev ve değerlendirme raporları, taktik muhabere ile performans takibini tek yerde toplar.',
    steps: [
      'Karargâh sayfasından kayıt olun veya giriş yapın.',
      'E-posta ve şifre ya da Google hesabı ile oturum açın.',
      'Beta sürecinde aktif hesaplar doğrudan Ana Sayfaya yönlendirilir.',
      'Sol menüde Kişisel, Audaz Ağı, Operasyon, Komuta, Kullanım Kılavuzu ve Sistem bölümlerini görürsünüz.',
    ],
    infoNote:
      'Platform şu an beta test döneminde. Ücretli üyelik ödemesi henüz açık değil; Üyelik Geçiş ekranı sizi Ana Sayfaya yönlendirir. Resmi lansman sonrasında yeni kayıtlar ve kilitli hesap kuralları değişebilir.',
    notes: ['Bu kılavuz, uygulamanın güncel davranışına göre hazırlanmıştır.'],
  },

  'first-login-checklist': {
    title: 'İlk giriş checklist',
    opsCode: 'ONB-01',
    access: 'Yeni kayıt olan tüm operatörler.',
    purpose: 'İlk oturumda temel hazırlığı tamamlamak için önerilen sıra.',
    prerequisites: ['Giriş yapmış olmak', 'Operatör profilinizin oluşturulmuş olması'],
    steps: [
      'Kayıt veya girişi tamamlayın, Ana Sayfaya gidin.',
      'Profilim sayfasından takma adınızı, profil fotoğrafınızı ve kan grubunuzu kontrol edin.',
      'Cephanelik sayfasından en az bir silah ve uyumlu mühimmat ekleyin.',
      'Antrenman ve Operasyon menüsünden ATIŞ sektörüne girip ilk atış kaydınızı oluşturun.',
      'Ana Sayfada ORS (Operasyonel Hazırlık Skoru) göstergesini ve son aktivite özetini kontrol edin.',
    ],
    flowId: 'ilk-kurulum',
    infoNote:
      'Şu anda ATIŞ, CQB, FOF, VBSS, TCCC ve EĞİTİM sektörlerinin tamamı kayıtlı operatörlere açık. ATIŞ kaydı için önce cephaneliğe silah ve mühimmat eklemeniz gerekir. İleride ücretsiz planda yalnızca ATIŞ ve sınırlı kayıt sayısı uygulanabilir.',
  },

  'roles-access-matrix': {
    title: 'Roller ve erişim',
    opsCode: 'ACL-01',
    access: 'Tüm giriş yapmış kullanıcılar.',
    purpose: 'Hangi kullanıcı tipinin nereye girebileceğini anlamak.',
    steps: [
      'Standart operatör: Görevler, antrenman, forum, muhabere ve analitik dahil tüm günlük modüller; Eğitmen Kontrol Paneli hariç.',
      'Premium operatör: Şu an erişim kodu ile yükseltilir; antrenman sektörlerinde ek kısıtlama yok.',
      'Eğitmen: Ek olarak Eğitmen Kontrol Paneli, grup oluşturma ve canlı grup eğitimi oturumu başlatma.',
      'Yönetici: Ek olarak Yönetici Paneli ve Fiyatlandırma sayfası.',
      'Kilitli hesap: Ödeme sistemi açıldığında yalnızca Ayarlar ve üyelik ekranlarına erişim; beta döneminde bu kısıtlama uygulanmaz.',
    ],
    infoNote:
      'Antrenman sektörleri şu an rolünüze bakılmaksızın açık. Eğitmen ve yönetici sayfaları yalnızca yetkili hesaplara görünür. Lansman sonrasında premium üyelikle ek analitik ve sınırsız kayıt vaat edilebilir.',
  },

  'email-verification-locked': {
    title: 'E-posta doğrulama ve kilitli hesap',
    opsCode: 'AUTH-02',
    pageLink: { to: '/verify-email', label: 'Doğrulama sayfasına git' },
    access: 'E-posta doğrulama: şifre ile kayıt olanlar, lansman sonrası. Kilitli hesap: abonelik süresi dolmuş operatörler.',
    purpose: 'Hesap güvenliği ve üyelik durumunu yönetmek.',
    steps: [
      'Şifre ile kayıt olduktan sonra, resmi lansman sonrasında Doğrulama sayfasına yönlendirilebilirsiniz.',
      'E-postanızdaki bağlantıya tıklayın, ardından sayfada yeniden kontrol edin ve Ana Sayfaya dönün.',
      'Google ile giriş yapanlar genelde ayrıca e-posta doğrulaması görmez.',
      'Hesabınız kilitliyse Ayarlar sayfasına erişebilirsiniz; ödeme açıkken diğer modüller kısıtlanabilir.',
    ],
    infoNote:
      'Beta döneminde aktif hesaplar e-posta doğrulama ekranına düşmez. Kilitli hesap yönlendirmesi de ödeme sistemi devreye girene kadar uygulanmaz.',
  },

  landing: {
    title: 'Karargâh',
    opsCode: 'HQ-00',
    pageLink: { to: '/', label: 'Karargâh sayfasına git' },
    access: 'Herkes. Giriş yapmışken menüden Karargâha Dön ile de açılır.',
    purpose: 'Tanıtım, haber önizlemesi, kayıt ve giriş.',
    steps: [
      'İlk ziyarette kısa tanıtım ekranı çıkabilir; atlayabilirsiniz.',
      'Operasyon paneline kaydırın, Kayıt veya Giriş sekmesini seçin.',
      'Google veya e-posta ile kayıt olun; kullanıcı adı ve yasal onay gerekir.',
      'Oturum açıldığında Ana Sayfaya yönlendirilirsiniz.',
    ],
  },

  dashboard: {
    title: 'Ana Sayfa',
    opsCode: 'CMD-00',
    pageLink: { to: '/dashboard', label: 'Ana Sayfaya git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose:
      'ORS (Operasyonel Hazırlık Skoru), aktif görevler, cephanelik bakım uyarıları, muhabere bildirimleri ve operasyon özeti.',
    steps: [
      'Girişten sonra varsayılan olarak buradasınız.',
      'Kartlardan görev, cephanelik veya antrenman modüllerine geçin.',
      'Sistem günlüğü son aktivitelerinizi listeler.',
    ],
  },

  profile: {
    title: 'Profilim',
    opsCode: 'ID-01',
    pageLink: { to: '/profil', label: 'Profilim sayfasına git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose:
      'Takma ad, kullanıcı adı, profil fotoğrafı, telefon, kan grubu; ORS (Operasyonel Hazırlık Skoru) özeti ve aktivite geçmişi.',
    prerequisites: ['Kayıt sırasında oluşturulan operatör profili'],
    steps: [
      'Takma adınızı ve kullanıcı adınızı düzenleyip kaydedin.',
      'Profil fotoğrafı yükleyin.',
      'Kan grubunuzu seçin; sağlık modülüyle uyumludur.',
      'E-posta hesabınızın şifresini buradan değiştirebilirsiniz.',
    ],
  },

  'operator-profile': {
    title: 'Operatör sicili',
    opsCode: 'ID-02',
    access: 'Giriş yapmış tüm operatörler; başka bir operatörün özeti.',
    purpose: 'Forum veya muhabereden açılan salt okunur operatör kartı.',
    steps: [
      'Forum gönderisinde veya muhaberede operatör takma adına tıklayın.',
      'Sicil kartı açılır.',
      'Brifing Odasına dön bağlantısıyla foruma geri dönebilirsiniz.',
    ],
  },

  akademi: {
    title: 'Audaz Akademi',
    opsCode: 'EDU-07',
    pageLink: { to: '/akademi', label: 'Audaz Akademi sayfasına git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose: 'Doktrin metinleri ve eğitim videoları.',
    steps: [
      'Sol menüden Audaz Akademi seçin.',
      'Modül tam açıldığında doktrin listesi ve videolar burada yer alacak.',
    ],
    infoNote:
      'Şu an modül geliştirme aşamasında ekranı gösterilir; içeriğe erişilemez. Premium planda tam erişim planlanmaktadır.',
  },

  forum: {
    title: 'Brifing Odası',
    opsCode: 'BRF-01',
    pageLink: { to: '/forum', label: 'Brifing Odası sayfasına git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose: 'Kategorili taktik tartışma: gönderi, yanıt, beğeni ve görsel paylaşım.',
    steps: [
      'Kategori seçin: Silah Sistemleri, CQB ve Taktik, TCCC ve Medikal, Genel Operasyon.',
      'Yeni brifing açın; başlık, metin ve isteğe bağlı görsel ekleyin.',
      'Gönderiye tıklayıp yanıt yazın veya beğenin.',
      'Yazar takma adından operatör siciline gidebilirsiniz.',
    ],
  },

  'forum-reports': {
    title: 'Forum şikayet',
    opsCode: 'MOD-01',
    access: 'Şikayet: tüm kullanıcılar. İnceleme: yöneticiler.',
    purpose: 'Uygunsuz forum içeriğini bildirmek.',
    steps: [
      'Gönderi veya yanıttaki bayrak simgesine tıklayın.',
      'Sebebi seçin ve gönderin.',
      'Yöneticiler Forum Moderasyonu bölümünden inceler.',
    ],
    notes: ['Genel site geri bildirimi menüdeki Şikayet ve Öneri ile ayrı bir kanaldır.'],
  },

  'intel-feed': {
    title: 'Küresel Haber Ağı',
    opsCode: 'INT-01',
    pageLink: { to: '/istihbarat', label: 'Küresel Haber Ağı sayfasına git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose: 'Yazılı haberler ve video haber akışı; Türkçe ve İngilizce özet.',
    steps: [
      'Yazılı veya Video sekmesini seçin.',
      'Kartta özeti okuyun; varsa dili değiştirin.',
      'Kaynak linkiyle haberin tamamına gidebilirsiniz.',
    ],
  },

  'feedback-system': {
    title: 'Şikayet ve Öneri',
    opsCode: 'FB-01',
    access: 'Giriş yapmış tüm operatörler.',
    purpose: 'Platform hakkında genel geri bildirim; forum şikayetinden bağımsızdır.',
    steps: [
      'Sol menüde Sistem bölümünden Şikayet ve Öneri seçin.',
      'Açılan panelde mesajınızı yazıp gönderin.',
      'Yöneticiler Geri Bildirimler bölümünden okur.',
    ],
  },

  'training-hub': {
    title: 'Antrenman ve Operasyon',
    opsCode: 'TRN-00',
    pageLink: { to: '/antrenman', label: 'Antrenman sayfasına git' },
    access: 'Ana hub tüm operatörlere açık. Grup Eğitimi kartı: gruba üye veya eğitmen.',
    purpose: 'Altı bireysel antrenman sektörü, grup eğitimi ve eğitmenler için kontrol paneli kartı.',
    steps: [
      'Sol menüden Antrenman ve Operasyon seçin.',
      'Sektör kartına tıklayın; ilgili kayıt ekranı açılır.',
      'Geri ok ile sektör listesine dönün.',
      'Eğitmen oturumu varsa üstte aktif eğitim bildirimi görünür.',
    ],
    infoNote:
      'Altı bireysel sektör şu an herkese açık. Grup eğitimi yalnızca bir gruba dahil operatörler ve eğitmenler içindir. İleride ücretsiz planda bazı sektörler kilitlenebilir.',
  },

  'sector-atis': {
    title: 'ATIŞ sektörü',
    opsCode: 'RNG-01',
    pageLink: { to: '/antrenman', label: 'Antrenman sayfasından ATIŞ sektörüne git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose: 'Atış günlüğü; drill türü, atım ve isabet; kayıt sonrası mühimmat stoğu düşer.',
    prerequisites: [
      'Cephanelikte en az bir silah kaydı',
      'Silahla uyumlu en az bir mühimmat kaydı',
    ],
    steps: [
      'Cephanelikten silah seçin.',
      'Mühimmat otomatik veya elle eşleştirilir.',
      'Drill türünü seçin; özel drill ise adını yazın.',
      'Atım ve isabet sayısını girin; süreli atışta süre alanlarını doldurun.',
      'Kaydedin; stok güncellenir ve kayıtlarınız listelenir.',
    ],
    flowId: 'atis-kaydi',
    infoNote:
      'Şu an atış kayıt sayısında sınır yok. Mühimmat stoğu yetmezse kayıt alınmaz. İleride ücretsiz planda toplam on atış kaydı sınırı gelebilir.',
  },

  'sector-cqb': {
    title: 'CQB sektörü',
    opsCode: 'CQB-02',
    pageLink: { to: '/antrenman', label: 'Antrenman sayfasından CQB sektörüne git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose: 'Kapalı alan temizleme antrenman kaydı.',
    steps: [
      'Oda düzeni, giriş yöntemi, kapı kırma tipi ve kapı durumunu seçin.',
      'Takım boyutu ile tehdit ve etkisiz hale getirilen sayılarını girin.',
      'Temizleme süresini, isabet yüzdesini ve güvenlik ihlali sayısını yazın.',
      'Taktik kararı seçip kaydedin.',
    ],
    infoNote:
      'Şu an tüm operatörlere açık; cephanelik zorunluluğu yok. İleride ücretsiz planda kilitlenebilir, premium ile açılabilir.',
  },

  'sector-fof': {
    title: 'FOF sektörü',
    opsCode: 'FOF-03',
    pageLink: { to: '/antrenman', label: 'Antrenman sayfasından FOF sektörüne git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose: 'Karşılıklı güç simülasyonu kaydı ve görev sonrası değerlendirme notu.',
    steps: [
      'Senaryo ve simülasyon sistemini seçin.',
      'Süreyi, atış sayısını ve angajman türünü girin.',
      'Karar doğruluğu yüzdesini yazın.',
      'Değerlendirme notu zorunludur; kaydedin.',
    ],
    infoNote: 'Şu an herkese açık. İleride premium üyelik gerekebilir.',
  },

  'sector-vbss': {
    title: 'VBSS sektörü',
    opsCode: 'VBS-04',
    pageLink: { to: '/antrenman', label: 'Antrenman sayfasından VBSS sektörüne git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose: 'VBSS operasyon antrenman günlüğü.',
    steps: [
      'Form alanlarını doldurun.',
      'Doğrulama geçince kaydedin.',
      'Kişisel Başarı Takibinde VBSS disiplini altında görünür.',
    ],
    infoNote: 'Şu an hesap türüne göre kısıtlama yok. Premium planda genişletilmiş erişim planlanabilir.',
  },

  'sector-tccc-training': {
    title: 'TCCC antrenman terminali',
    opsCode: 'MED-05',
    pageLink: { to: '/antrenman', label: 'Antrenman sayfasından TCCC sektörüne git' },
    access: 'Giriş yapmış tüm operatörler; grup değerlendirmesi için gruba üye olmak gerekir.',
    purpose: 'MARCH aşama değerlendirmesi ve saha antrenman kaydı.',
    steps: [
      'Özet, belge, kayıt veya gözlem modları arasında geçin.',
      'MARCH aşama puanlarını girin.',
      'Kaydı tamamlayın.',
    ],
    notes: [
      'TCCC ve Sağlık menüsündeki kişisel sağlık modülünden farklıdır; bu ekran antrenman kaydı içindir.',
    ],
    infoNote:
      'Bireysel TCCC antrenmanı şu an herkese açık. Tam medikal evrak paketi premium planda planlanmaktadır.',
  },

  'sector-egitim': {
    title: 'EĞİTİM sektörü',
    opsCode: 'EDU-06',
    pageLink: { to: '/antrenman', label: 'Antrenman sayfasından EĞİTİM sektörüne git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose: 'Eğitim planı ve tatbikat hedefi kaydı.',
    steps: [
      'Eğitim odağını ve zorluk seviyesini seçin.',
      'Hedef tarih ve tahmini süreyi girin.',
      'Planı kaydedin; ilerlemeyi güncelleyin.',
    ],
    infoNote: 'Şu an herkese açık. İleride ücretsiz planda kilitlenebilir.',
  },

  'group-training': {
    title: 'Grup eğitimi',
    opsCode: 'GRP-07',
    pageLink: { to: '/antrenman', label: 'Antrenman sayfasından Grup Eğitimi sektörüne git' },
    access: 'Gruba üye operatörler ve eğitmenler.',
    purpose: 'Eğitmenin başlattığı canlı oturuma katılmak.',
    prerequisites: ['Gruba katılmış olmak veya eğitmen olmak', 'Eğitmenin aktif oturum açmış olması'],
    steps: [
      'Eğitmen, Eğitmen Kontrol Panelinde Eğitim sekmesinden oturum başlatır.',
      'Operatör, eğitmenden aldığı grup şifresiyle gruba katılır.',
      'Antrenman sayfasında aktif eğitmen oturumu bildirimi görünür.',
      'Grup Eğitimi kartından oturuma girin.',
    ],
    flowId: 'grup-egitimi',
  },

  'tccc-suite': {
    title: 'TCCC ve Sağlık',
    opsCode: 'MED-SUITE',
    pageLink: { to: '/tccc', label: 'TCCC ve Sağlık sayfasına git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose: 'Kişisel sağlık profili, taktik medikal evrak ve IFAK envanter takibi.',
    steps: [
      'Kişisel Sağlık, Medikal Kılavuz ve Evrak veya IFAK ve Lojistik kartını seçin.',
      'Sağlık bölümünde alerji, aşı ve kan grubunu güncelleyin.',
      'IFAK malzemelerini ekleyin; son kullanma tarihi uyarıları görüntülenir.',
    ],
    notes: ['Antrenman kaydı için Antrenman menüsündeki TCCC sektörünü kullanın.'],
    infoNote: 'Temel sağlık ve IFAK modülleri şu an herkese açık. Geniş evrak paketi premium planda planlanır.',
  },

  cephanelik: {
    title: 'Cephanelik',
    opsCode: 'ILWS-01',
    pageLink: { to: '/cephanelik', label: 'Cephanelik sayfasına git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose: 'Silah, aksesuar ve mühimmat envanteri; bakım ve namlu ömrü takibi.',
    steps: [
      'Silahlar, Aksesuarlar veya Mühimmat bölümünü seçin.',
      'Yeni kayıt ekleyip teknik bilgileri doldurun. Silah tipinde Keskin Nişancı Tüfeği (KNT) kategorisi de seçilebilir.',
      'Silah, optik ve mühimmat formlarında "Balistik Bilgileri (Opsiyonel)" akordionunu açın; namlu uzunluğu, twist rate, namlu hızı, sight height gibi alanları doldurun — Balistik Terminal "Cephanelikten Getir" ile bunları otomatik çeker.',
      'Listeden düzenleyin; filtrelerle daraltın.',
      'ATIŞ sektörü silah ve mühimmatı buradan alır.',
      'Bakım eşiği aşılınca Ana Sayfada uyarı çıkabilir.',
    ],
    infoNote: 'Şu an tam envanter erişimi herkese açık. İleride premium planda denetim kaydı eklenebilir.',
    notes: [
      'Balistik Terminal, Cephanelik envanterindeki silah/optik/mühimmat ve opsiyonel balistik alanlarını "Cephanelikten Getir" ile kullanır.',
    ],
  },

  'balistik-terminal': {
    title: 'Balistik Terminal',
    opsCode: 'BLST-01',
    pageLink: { to: '/balistik', label: 'Balistik Terminal sayfasına git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose:
      'Mermi/silah/optik verilerine dayalı dış balistik hesaplama (drop, rüzgar sapması, uçuş süresi, MOA/MRAD click değerleri); Cephanelik’ten otomatik veri çekme, kayıtlı profil yönetimi ve PDF raporlama.',
    prerequisites: [
      'Cephanelikten Getir kullanacaksanız en az bir silah (ve mümkünse uyumlu optik/mühimmat) kaydı',
    ],
    steps: [
      'Cephanelikten Getir ile envanterinizdeki bir silahı seçin; silah, optik ve mühimmat bilgileri otomatik doldurulur (bu alanlar salt-okunur gelir, gerekirse Kilidi Aç ile düzenleyebilirsiniz).',
      'Cephanelik’te olmayan balistik-özel alanları (namlu hızı, BC, sight height, zero mesafesi gibi) elle girin.',
      'Optik biriminizi (MOA veya MRAD) seçin; sadece seçtiğiniz birim gösterilir.',
      'Çevre koşullarını (sıcaklık, basınç, nem, rakım, rüzgar) girin; her hesaplamada ayrı girilir, profile kaydedilmez.',
      'Hedef mesafe aralığını belirleyip Hesapla’ya basın.',
      'Hızlı Referans panelinde TİK (dürbün çevirme) veya NİŞAN (doğrudan nişan noktası) modunu seçin.',
      'Referans Kilitle ile mevcut mesafeyi referans alıp, başka bir mesafeye geçtiğinizde aradaki FARKI (toplam yerine) görebilirsiniz.',
      'Grafik, Tam Tablo sekmeleri arasında geçiş yapın; PDF olarak raporu indirin.',
      'Profili isim vererek kaydedin; istediğinizde silebilirsiniz.',
    ],
    infoNote:
      'Bu terminaldeki hesaplamalar teorik tahminlerdir, gerçek atışla mutlaka doğrulanmalıdır (sayfaya her girişte bir bilgilendirme modalı bu konuda uyarır). Şu an herkese açık.',
    notes: [
      'Cephanelik’ten gelen veriler (silah/optik/mühimmat adı) salt-okunur gelir; bu veriler ayrı olarak Cephanelik’te düzenlenir.',
    ],
  },

  'progress-tracker': {
    title: 'Kişisel Başarı Takibi',
    opsCode: 'ORS-01',
    pageLink: { to: '/basarilar', label: 'Kişisel Başarı Takibi sayfasına git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose:
      'ORS (Operasyonel Hazırlık Skoru), disiplin filtreleri, trend grafikleri ve aktivite özeti.',
    prerequisites: ['Anlamlı sonuç için antrenman kayıtları'],
    steps: [
      'Son yedi gün, otuz gün veya tüm zamanlar aralığını seçin.',
      'ATIŞ, CQB, FOF, VBSS veya TCCC disiplinine göre filtreleyin.',
      'Özet panelleri genişletin; kayıt detayına odaklanın.',
      'Toplu Rapor İndir ile HUD, tüm analitik grafikler, geçmiş kayıtlar ve hata kodlarını tek PDF’te indirin.',
      'Eğitmen hesapları: Operatör Seç menüsünden kendi grubunuzdaki bir üyeyi seçin; sayfanın üstünde "Şu An Görüntülenen: {isim}" göstergesiyle kimin verisini izlediğiniz netleşir.',
    ],
    infoNote:
      'Tüm analitik paneller şu an herkese açık. İleride premium planda gelişmiş ORS (Operasyonel Hazırlık Skoru) grafikleri eklenebilir.',
  },

  'group-join': {
    title: 'Gruba katılım',
    opsCode: 'GRP-JOIN',
    pageLink: { to: '/ayarlar', label: 'Ayarlar · TAKTİK TİM bölümüne git' },
    access: 'Henüz gruba dahil olmayan operatörler.',
    purpose: 'Eğitmenin verdiği grup şifresiyle takıma katılmak.',
    steps: [
      'Ayarlar sayfasında TAKTİK TİM bölümünü açın.',
      'Grup Şifresi alanına en az dört karakterlik şifreyi girip Katıl deyin.',
      'Başarılı olunca Grup Eğitimi kartı antrenman sayfasında görünür.',
    ],
  },

  'instructor-dashboard': {
    title: 'Eğitmen Kontrol Paneli',
    opsCode: 'CMD-09',
    pageLink: { to: '/egitmen-komuta', label: 'Eğitmen Kontrol Paneline git' },
    access: 'Yalnızca eğitmen hesapları.',
    purpose: 'Grup yönetimi, operatör raporları, canlı eğitim oturumu ve analitik.',
    instructorOnly: true,
    steps: [
      'Gruplar sekmesinde grup oluşturun, şifre verin, üyeleri görün.',
      'Operatör Raporlama sekmesinde platform operatörlerini inceleyin; Toplu Rapor İndir (PDF) ile aktivite feed’i ve ilgili özetleri dışa aktarın.',
      'Eğitim sekmesinde oturum başlatın; operatörler Grup Eğitiminden katılır.',
      'Analitik sekmesinde grup aktivitelerini takip edin; Toplu Rapor İndir (PDF) ile aktivite feed’i ve grup performans grafiklerini tek dosyada indirin.',
    ],
    notes: ['Sol menüde Komuta ve Analitik bölümüne eğitmenler için eklenir.'],
  },

  'language-switcher': {
    title: 'Dil seçici',
    opsCode: 'LNG-01',
    access: 'Herkese açık.',
    purpose: 'Üst bar’daki TR/EN dil seçici ile arayüz dilini değiştirmek.',
    steps: [
      'Üst bar’daki TR veya EN butonuna tıklayın; tüm arayüz anında seçilen dile geçer, tercihiniz hesabınıza kaydedilir.',
    ],
  },

  settings: {
    title: 'Ayarlar',
    opsCode: 'CFG-01',
    pageLink: { to: '/ayarlar', label: 'Ayarlar sayfasına git' },
    access: 'Giriş yapmış tüm operatörler; kilitli hesaplar da erişebilir.',
    purpose: 'Görünüm, bildirim tercihleri ve geri bildirim.',
    steps: [
      'Tema ve bildirim ayarlarını değiştirin.',
      'Geri bildirim formu ile mesaj gönderin.',
      'Yöneticiler tek kullanımlık eğitmen davet kodu üretebilir.',
    ],
  },

  'access-codes': {
    title: 'Erişim kodları',
    opsCode: 'KEY-01',
    pageLink: { to: '/ayarlar', label: 'Ayarlar sayfasına git' },
    access: 'Giriş yapmış tüm operatörler.',
    purpose: 'Premium veya eğitmen erişimini etkinleştirmek; beta döneminde ana yükseltme yolu.',
    steps: [
      'Ayarlar sayfasında Erişim Kodu bölümünü açın.',
      'En az sekiz karakterlik kodu girip kullanın.',
      'Hesap rolünüz güncellenir; sayfayı yenilemeniz gerekebilir.',
    ],
    infoNote:
      'Ücretli ödeme şu an kapalı; yükseltme erişim kodu ile yapılır. Lansman sonrasında ödeme ekranı da devreye girebilir.',
  },

  troubleshooting: {
    title: 'Sorun giderme',
    opsCode: 'DBG-01',
    access: 'Tüm kullanıcılar.',
    purpose: 'Sık karşılaşılan sorunlar ve çözümleri.',
    steps: [
      'ATIŞ kaydı alınamıyorsa önce cephaneliğe silah ekleyin.',
      'Stok yetersiz uyarısında mühimmat stoğunu artırın veya atım sayısını azaltın.',
      'Grup şifresi geçersizse eğitmeninizden kodu doğrulayın.',
      'Forum şikayeti gönderilemiyorsa yöneticiye bildirin.',
      'Bağlantı veya kayıt hatası görürseniz ekrandaki hata bildirimini okuyun.',
    ],
  },

  'deep-links': {
    title: 'Hızlı geçiş ipuçları',
    opsCode: 'REF-01',
    access: 'Referans.',
    purpose: 'Modüllere daha hızlı ulaşmak için pratik yollar.',
    steps: [
      'Antrenman sayfasında doğrudan sektör kartına tıklayarak ATIŞ, CQB, FOF, VBSS, TCCC veya EĞİTİM ekranına girin.',
      'Eğitmen oturumu davetinde bildirim veya antrenman sayfasındaki aktif eğitim uyarısını takip edin.',
      'Forum veya muhabereden operatör takma adına tıklayarak sicil kartını açın.',
      'Muhabere bildirim sayacı sol menüde görünür; tıklayarak mesajlara gidin.',
    ],
  },

  glossary: {
    title: 'Terimler sözlüğü',
    opsCode: 'REF-02',
    access: 'Referans.',
    purpose: 'Sık kullanılan kısaltmalar.',
    steps: [
      'ORS (Operasyonel Hazırlık Skoru) — antrenman verilerinden hesaplanan genel hazırlık göstergesi.',
      'ILWS — cephanelik envanter sistemi.',
      'BLST — Balistik Terminal (dış balistik hesaplama).',
      'MARCH — kanama, hava yolu, solunum, dolaşım ve hipotermi aşamaları.',
      'FOF — karşılıklı güç antrenmanı.',
      'VBSS — gemi biniş, arama ve ele geçirme operasyonu.',
      'TCCC — taktik savaş yaralanması bakımı.',
      'IFAK — bireysel ilk yardım kiti.',
    ],
  },
}

/** @param {string} id */
export function getGuideSection(id) {
  return GUIDE_SECTIONS[id] ?? null
}
