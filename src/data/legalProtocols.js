/** @typedef {{ id: number; text: string }} LegalProtocolItem */
/** @typedef {{ section: string; items: LegalProtocolItem[] }} LegalProtocolSection */

/** Operasyonel ve Hukuki Protokol — toplam madde sayısı */
export const LEGAL_PROTOCOL_COUNT = 46

/** Yaş beyanı metin sürümü — metin değişince artırın (Firestore ageDeclaration.version). */
export const AGE_DECLARATION_VERSION = 'v1.0'

/** Kayıt sonrası premium geçiş için deneme süresi (gün) */
export const TRIAL_PERIOD_DAYS = 20

/**
 * 46 maddelik Operasyonel ve Hukuki Protokol — bölüm + madde yapısı.
 * @type {readonly LegalProtocolSection[]}
 */
export const LEGAL_PROTOCOLS = Object.freeze([
  {
    section: 'BÖLÜM 1: OPERASYONEL TERMİNOLOJİ VE SİMÜLASYON KAPSAMI (Genişletilmiş)',
    items: [
      {
        id: 1,
        text: 'Madde 1: Terimlerin Teknik/Eğitici Niteliği Audaz Tactical platformu, içerisinde yer alan "operasyon", "tim", "görev", "mühimmat", "doktrin", "taktiksel eğitim"," istihbarat" gibi ibarelerin tamamen profesyonel simülasyon, eğitim ve güvenlik bilincini artırma amacıyla kullanılan teknik/metaforik terimler olduğunu beyan eder. Bu terimler hiçbir suretle gerçek çatışma ortamlarına veya şiddete çağrı niteliği taşımaz; aksine sivil kullanıcıların savunma bilincini artırmaya yönelik birer eğitim aracıdır.',
      },
      {
        id: 2,
        text: 'Madde 2: Sivil Güvenlik ve Emniyet Misyonu Platformun temel amacı, kullanıcıların ateşli silah veya Airsoft ekipmanı kullanırken, gerçek dünyadaki silah güvenliği protokollerine (parmak disiplini, namlu kontrolü, taşıma emniyeti) uyum sağlamalarını garanti altına almaktır. Kullanılan askeri terminoloji, bu güvenlik kurallarını akılda kalıcı, disiplinli ve "taktiksel bir formatta" sunmak için seçilmiştir.',
      },
      {
        id: 3,
        text: 'Madde 3: İlgili Yasal Mevzuat Uyumu Audaz Tactical, platform içerisindeki tüm içeriklerini 6136 sayılı kanun ve yürürlükteki tüm sivil ateşli silah mevzuatı ile tam bir uyum içerisinde kurgulamıştır. Kullanıcı, platformdaki eğitimleri takip ederken, bu bilgileri yalnızca spor (Airsoft) veya meşru müdafaa/sivil ruhsatlı silah kullanımı çerçevesinde, yasaların öngördüğü sınırlar dahilinde uygulamayı taahhüt eder.',
      },
      {
        id: 4,
        text: 'Madde 4: Metaforik Yapının Hukuki Sınırları Kullanıcı, platformdaki eğitici doktrinlerin "askeri bir faaliyet" değil, "sivil bir güvenlik disiplini" olduğunu bilir. Askeri terminoloji kullanımı, sadece disiplin seviyesini yükseltmek amacıyla tercih edilmiş bir "sunum biçimi" olup, gerçek bir askeri operasyonel yetki veya sorumluluk alanı oluşturmaz.',
      },
    ],
  },
  {
    section: 'BÖLÜM 2: SORUMLULUK VE RİSK YÖNETİMİ (Genişletilmiş)',
    items: [
      {
        id: 5,
        text: 'Madde 5: Eğitimlerin Uygulanmasında Bireysel Sorumluluk Kullanıcı, Audaz Tactical üzerindeki her türlü taktiksel doktrini kendi fiziksel ve ruhsal yetkinliği dahilinde, tamamen kendi sorumluluğu altında uygular. Platform yönetimi, eğitimlerin gerçek saha uygulamalarında (Airsoft sahaları, poligonlar, sivil savunma pratikleri) birey tarafından yanlış uygulanması sonucunda doğabilecek maddi veya manevi zararlardan sorumlu tutulamaz.',
      },
      {
        id: 6,
        text: 'Madde 6: Ekipman Güvenliği ve Taşıma Prosedürleri Platformu kullanan sivil silah ruhsatı sahipleri veya Airsoft meraklıları, ekipmanlarını (gerçek veya simülasyon) toplu taşıma araçlarında, halka açık alanlarda veya "gerçek silah" algısı yaratarak huzursuzluk verecek şekilde taşımamayı kabul eder. Kullanıcı, ekipmanların taşınması ve saklanmasıyla ilgili yasal prosedürlere (kılıflı taşıma, boş şarjör, emniyetli bölge) riayet etmekle mükelleftir.',
      },
      {
        id: 7,
        text: 'Madde 7: Şiddet ve Kamu Düzeni Karşıtlığı Audaz Tactical, şiddeti, kamu düzenini bozucu eylemleri, yasa dışı silahlı faaliyetleri kesinlikle desteklemez. Platform, tamamen bir "savunma ve güvenlik disiplini" platformudur. Bu disiplin, bireyin kendini ve sevdiklerini koruma, güvenli ekipman yönetimi ve stres altında karar verme kapasitesini geliştirmeye odaklıdır.',
      },
    ],
  },
  {
    section: 'BÖLÜM 3: ÜYELİK HAKLARI, ABONELİK PROTOKOLÜ VE VERİ GÜVENLİĞİ',
    items: [
      {
        id: 8,
        text: 'Madde 8: Dijital İçerik ve Erişim Hakkı Audaz Tactical üzerindeki tüm "Premium" içerikler, dijital bilgi transferi niteliğindedir. Kullanıcı, ödemesini gerçekleştirdiği abonelik süresi boyunca bu içeriklere erişim hakkı kazanır. İçeriğin niteliği gereği, bir kez görüntülenen veya sisteme yüklenen dijital bilgi, "tüketilmiş" sayılır; bu nedenle kullanıcı, hizmeti kullanmaya başladığı andan itibaren cayma hakkı veya ücret iadesi talep edemeyeceğini kabul eder.',
      },
      {
        id: 9,
        text: 'Madde 9: Operatör Veri Arşivi ve Kişisel Gizlilik Platform içerisinde tutulan "Kişisel Sağlık Künyesi" ve "Eğitim Gelişim Raporları", kullanıcının kendi performansı adına oluşturulmuş özel verilerdir. Bu veriler, 20. gün sonrası "Operatör Arşivi" olarak premium abonelik süresince sistemde korunur. Kullanıcı, sistemin bu verileri, hizmetin sürekliliğini sağlamak ve platform altyapısını optimize etmek amacıyla anonimleştirilmiş ve kriptolanmış bir şekilde tutmasına rıza gösterir.',
      },
      {
        id: 10,
        text: 'Madde 10: Abonelik Yenileme ve Operasyonel Süreklilik Premium üyelik, kullanıcının aksini belirtmediği sürece aylık periyotlarla yenilenir. Kullanıcı, aboneliğini sistem içerisindeki "Ayarlar/Faturalandırma" sekmesinden istediği an durdurabilir. Aboneliğin durdurulması durumunda, operatörün verileri arşivde "pasif" konuma alınır; ancak yeni bir abonelik başlatılana kadar sistemdeki "Eğitim ve Taktik" içeriklerine erişimi sınırlandırılır.',
      },
      {
        id: 11,
        text: 'Madde 11: Sistem Erişimi ve Yetkilendirme (Auth & Claims) Audaz Tactical, kullanıcıların sistem üzerindeki "Yetki Seviyelerini" (Custom Claims) denetleme hakkını saklı tutar. 20. gün itibariyle, ödeme doğrulaması geçemeyen hesapların erişimi "Sınırlı (Read-Only)" moduna çekilir. Kullanıcı, ödeme sistemindeki bir aksaklık durumunda, sistemin erişim kısıtlamasına gideceğini ve bunun bir "operasyonel aksaklık" değil, "sistem protokolü" olduğunu kabul eder.',
      },
    ],
  },
  {
    section: 'BÖLÜM 4: PLATFORM YÖNETİMİ VE ANLAŞMAZLIK ÇÖZÜMÜ',
    items: [
      {
        id: 12,
        text: 'Madde 12: Güncelleme ve Operasyonel Değişiklik Hakkı Audaz Tactical yönetimi, dijital simülasyon dünyasının evrimi gereği, platformdaki eğitim modüllerini, taktiksel doktrinleri ve arayüz yapısını önceden haber vermeksizin güncelleme, ekleme veya kaldırma hakkına sahiptir. Kullanıcı, platformun statik bir yapı olmadığını; sürekli "gelişen ve güncellenen bir eğitim sistemi" olduğunu kabul eder.',
      },
      {
        id: 13,
        text: 'Madde 13: Uyuşmazlık Çözümü ve Yetkili Merciler Platform ile kullanıcı arasında doğabilecek her türlü ihtilaf, iyi niyet çerçevesinde, platformun "Geri Bildirim Sistemi" üzerinden çözülmeye çalışılır. Ancak sistem üzerinden çözülemeyen durumlarda, Türk Hukuku geçerli olup, uyuşmazlığın çözümü konusunda ilgili Mahkemeler ve İcra Daireleri tek yetkili mercidir.',
      },
      {
        id: 14,
        text: 'Madde 14: Sözleşmenin Kabulü ve Yürürlük Kullanıcı, "Kayıt Ol" butonuna bastığı ve sistemdeki "Protokolleri Onaylıyorum" kutucuğunu işaretlediği anda, bu 14 maddelik operasyonel sözleşmeyi bütünüyle okuduğunu, anladığını ve bu protokollere uymayı taahhüt ettiğini beyan etmiş sayılır. Bu sözleşme, kullanıcı sisteme giriş yaptığı andan itibaren süresiz olarak yürürlüktedir.',
      },
    ],
  },
  {
    section: 'BÖLÜM 5: SİBER EMNİYET VE VERİ GÜVENLİĞİ PROTOKOLÜ',
    items: [
      {
        id: 15,
        text: 'Madde 15: Siber Güvenlik Standardı ve Sorumluluk Sınırı Audaz Tactical, kullanıcı verilerini korumak için güncel şifreleme yöntemleri (Firebase Auth & Firestore Security Rules) ve endüstri standardı güvenlik protokolleri kullanır. Ancak, siber dünyada "sıfır risk" prensibi bulunmadığını ve kullanıcı, dijital platformların üçüncü taraf siber saldırılara (hacklenme, veri ihlali vb.) maruz kalabileceğini kabul eder. Platform yönetimi, tüm güvenlik önlemlerini almasına rağmen oluşabilecek "öngörülemeyen" veri ihlallerinde, kullanıcının doğrudan zararlarından yasal sınırlar dahilinde sorumludur.',
      },
      {
        id: 16,
        text: 'Madde 16: Kullanıcı Güvenliği ve Erişim Kontrolü (OPSEC) Kullanıcı, hesabına erişim sağlayan şifresini ("Operatör Anahtarı") gizli tutmakla mükelleftir. Kullanıcı hesabından yapılan tüm işlemler, hesabın sahibine ait kabul edilir. Kullanıcının kendi ihmali (zayıf şifre kullanımı, şifrenin üçüncü kişilerle paylaşılması vb.) sonucu oluşabilecek veri sızıntılarından platform yönetimi sorumlu tutulamaz.',
      },
      {
        id: 17,
        text: 'Madde 17: Veri İhlali Bildirim Protokolü Olası bir siber saldırı veya veri ihlali durumunda, Audaz Tactical yönetimi; durumu tespit ettiği andan itibaren 48 saat içerisinde tüm kayıtlı operatörleri e-posta ve site içi bildirimler aracılığıyla bilgilendirmeyi taahhüt eder. Bu protokol, operatörlerin kendi dijital varlıklarını koruması (şifre değişikliği, hesap dondurma) için gerekli süreyi tanımayı amaçlayan bir "Acil Durum Protokolü"dür.',
      },
      {
        id: 18,
        text: 'Madde 18: Kötüye Kullanım ve Dijital Saldırı Yasağı Platforma yönelik herhangi bir siber saldırı (DDoS, SQL injection, veritabanı manipülasyonu vb.) teşebbüsünde bulunan kullanıcıların hesapları derhal kapatılır, verileri yasal mercilere teslim edilir ve haklarında "Siber Suçlar" kapsamında cezai işlem başlatılması için tüm teknik loglar delil niteliğinde savcılığa sunulur. Audaz Tactical, kendi dijital sınırlarını korumak için her türlü hukuki ve teknik hamleyi yapma yetkisine sahiptir.',
      },
    ],
  },
  {
    section: 'BÖLÜM 6: EĞİTMEN YÖNETİMİ VE DEĞERLENDİRME PROTOKOLÜ',
    items: [
      {
        id: 19,
        text: 'Madde 19: Eğitmen Yetkinliği ve Akreditasyon Platformdaki "Eğitmen" statüsü, kullanıcının sisteme yüklediği referansların ve taktiksel bilgi birikiminin "Audaz Tactical Operasyon Merkezi" tarafından onaylanmasıyla verilir. Eğitmen, platformda oluşturduğu "Eğitim Grupları" ve verdiği "Değerlendirmeler" ile bir akademik disiplin oluşturur. Bu süreç, hiçbir şekilde resmi devlet akreditasyonu veya profesyonel spor sertifikasyonu yerine geçmez; tamamen "Platform İçi Yetkinlik Geliştirme" amaçlıdır.',
      },
      {
        id: 20,
        text: 'Madde 20: Objektif Değerlendirme ve Geri Bildirim Disiplini Eğitmen, bir kullanıcının performansını değerlendirirken "Audaz Tactical Taktiksel Standartları"na bağlı kalmayı taahhüt eder. Yapılan not verme ve değerlendirme işlemleri; nesnel kriterlere (isabet oranı, tepki süresi, güvenlik prosedürlerine uyum) dayanmalıdır. Kullanıcı, eğitmen tarafından verilen notun bir "eğitsel rehberlik" olduğunu, bir "ticari veya hukuki belge" niteliği taşımadığını kabul eder.',
      },
      {
        id: 21,
        text: 'Madde 21: Davet ve Etkileşim Protokolü Eğitmen, eğitim grubuna kullanıcı davet ederken veya kullanıcılar arası etkileşimi yönetirken, platformun "Siber Emniyet ve Veri Güvenliği Protokolü"ne (Bölüm 5) uymakla yükümlüdür. Eğitim grubu içerisindeki etkileşimlerde; eğitmen ve kullanıcı, birbirlerine karşı "Operatör Disiplini" içerisinde; hakaret, taciz veya ayrımcılık içermeyen bir iletişim dili kullanmak zorundadır.',
      },
      {
        id: 22,
        text: 'Madde 22: İtiraz ve Gözden Geçirme Hakkı Kullanıcı, bir eğitmen tarafından verilen değerlendirmeyi "Adil" bulmadığı takdirde, 7 gün içerisinde sistemdeki "Geri Bildirim Formu" aracılığıyla "İtiraz Dilekçesi" oluşturabilir. Audaz Tactical yönetimi, bu itirazı inceleyerek (eğer gerekli görürse) eğitmenin notunu gözden geçirme veya ilgili etkileşimi düzenleme yetkisine sahiptir. Yönetimin kararı "operasyonel olarak nihai" kabul edilir.',
      },
      {
        id: 23,
        text: 'Madde 23: Eğitmenin Veri Sorumluluğu Eğitmen, eriştiği kullanıcı verilerini (sağlık durumu, atış puanları, gelişim çizelgeleri) platform dışına çıkarmamayı, üçüncü kişilerle paylaşmamayı ve sadece eğitim kalitesini artırmak için kullanmayı taahhüt eder. Bu gizliliğin ihlali, eğitmenin "Eğitmenlik Statüsünün" derhal feshedilmesine ve platformdan kalıcı olarak uzaklaştırılmasına yol açar.',
      },
    ],
  },
  {
    section: 'BÖLÜM 7: MUHABERE (MESAJLAŞMA) VE SOSYAL ETKİLEŞİM PROTOKOLÜ',
    items: [
      {
        id: 24,
        text: 'Madde 24: İletişim Disiplini ve "Operatör Dili" Muhabere kanallarında (DM, Grup Chat, Kanal mesajları), tüm kullanıcılar "Operatör Disiplini" gereği; hakaret, küfür, taciz, nefret söylemi, ayrımcılık veya kamu düzenini bozucu içerik paylaşmamayı taahhüt eder. Platform, bu tür bir iletişimi "Operasyonel Disiplinsizlik" olarak tanımlar ve tespiti halinde ilgili kullanıcıyı uyarma veya hesabını süresiz askıya alma yetkisine sahiptir.',
      },
      {
        id: 25,
        text: 'Madde 25: Özel Hayatın Gizliliği ve Veri İfşası Muhabere kanallarında paylaşılan her türlü görsel, belge veya kişisel bilgi, sadece o kanalın katılımcıları arasındaki "Operasyonel Sır" niteliğindedir. Bu içeriklerin, platform dışına (sosyal medya, başka platformlar vb.) ekran görüntüsü alınarak veya başka yollarla çıkarılması, "Bilgi İfşası" olarak kabul edilir. İhlali gerçekleştiren operatör, platformdan derhal ihraç edilir.',
      },
      {
        id: 26,
        text: 'Madde 26: Moderasyon ve Log Denetimi Audaz Tactical, "Operasyonel Emniyet" gereği, sistemdeki tüm mesaj trafiğini (sadece ihbar veya şikayet durumlarında incelenmek üzere) şifreli loglar halinde tutar. Kullanıcı, yaptığı tüm muhaberenin platformun güvenlik kurallarına tabi olduğunu; şikayet durumunda yönetim tarafından inceleme yapılabileceğini kabul eder.',
      },
    ],
  },
  {
    section: 'BÖLÜM 8: GRUP VE FAALİYET YÖNETİMİ (SOSYAL AĞ)',
    items: [
      {
        id: 27,
        text: 'Madde 27: Grup Oluşturma ve Faaliyet Sorumluluğu Grup kurucusu (Grup Lideri) veya eğitmen, oluşturduğu grupta gerçekleşen tüm faaliyetlerden (eğitimler, buluşmalar, atış etkinlikleri) sorumludur. Grup lideri, oluşturduğu grupta "Emniyet Kuralları"nın ihlal edilmemesini sağlamakla mükelleftir. Audaz Tactical, grup içerisinde alınan kararlara veya düzenlenen fiziksel faaliyetlere taraf değildir.',
      },
      {
        id: 28,
        text: 'Madde 28: Arkadaşlık ve Bağlantı İstekleri Kullanıcı, "Arkadaşlık" taleplerini, karşı tarafa "Taciz veya rahatsızlık vermeyecek" bir frekansta kullanacağını taahhüt eder. Bir kullanıcı tarafından "Engellenen" operatör, o kişiyle tekrar iletişime geçmeye çalışamaz. Israrlı takip (stalking) veya taciz, hesabın doğrudan "Sistem İhracı" ile cezalandırılacağı bir "Kırmızı Hat" ihlalidir.',
      },
      {
        id: 29,
        text: 'Madde 29: Etkinlik ve Saha Faaliyetleri Katılımı Platform üzerinden organize edilen veya eğitmenler tarafından duyurulan herhangi bir saha faaliyeti (Airsoft turnuvası, eğitim buluşması), platformun "Dijital Doktrin" desteği ile gerçekleşir. Fiziksel etkinliklere katılan operatörler, kendi güvenliklerinden, ekipmanlarından ve bulundukları tesisin kurallarına uyumdan %100 kendileri sorumludur. Platform, fiziksel etkinliklerde yaşanabilecek kazalara karşı hiçbir hukuki mesuliyet kabul etmez.',
      },
    ],
  },
  {
    section: 'BÖLÜM 9: KAMU DÜZENİ, TERÖRLE MÜCADELE VE YASAL SORUMLULUK',
    items: [
      {
        id: 30,
        text: 'Madde 30: Terör ve Yasa Dışı Yapılarla İltisak Yasağı Audaz Tactical, Türkiye Cumhuriyeti Devleti\'nin bölünmez bütünlüğüne, anayasal düzenine ve milli güvenliğine karşı faaliyet gösteren her türlü terör örgütü veya yasa dışı yapıyla doğrudan veya dolaylı iltisakı olan hiç kimsenin tespiti halinde platforma girişine veya faaliyet göstermesine izin vermez. Kullanıcı, hiçbir terör örgütünün propagandasını yapmamayı, bu yapıları övmemeyi veya sempati duymayı teşvik edecek herhangi bir içerik paylaşmamayı taahhüt eder.',
      },
      {
        id: 31,
        text: 'Madde 31: Kamu Düzenini Bozan Faaliyetlerin Yasaklanması Platform, şiddeti yücelten, halkı kin ve düşmanlığa tahrik eden, toplumsal huzuru bozucu her türlü söylem ve eylemi "Sıfır Tolerans" prensibiyle reddeder. Kullanıcı, platformdaki eğitimleri kullanarak kamu düzenine aykırı, yasa dışı silahlı yapılanmalara zemin hazırlayacak veya kitleleri galeyana getirecek hiçbir eylemde bulunmayacağını kabul eder.',
      },
      {
        id: 32,
        text: 'Madde 32: İhbar ve İşbirliği Yükümlülüğü Platform içerisinde, yukarıdaki maddelere (Madde 30-31) aykırı herhangi bir faaliyet, söylem veya grup içerikli paylaşım tespit edilmesi durumunda; Audaz Tactical yönetimi, ilgili kullanıcının tüm verilerini (IP adresleri, mesaj logları, grup içerikleri, hesap bilgileri) delil niteliğinde derhal Emniyet Genel Müdürlüğü\'nün ilgili birimlerine (Siber Suçlarla Mücadele ve Terörle Mücadele Şubeleri) teslim etmekle yükümlüdür.',
      },
      {
        id: 33,
        text: 'Madde 33: Yasal İşlemler ve İdari Süreç Audaz Tactical platformu, sivil bir eğitim ve güvenlik disiplini platformudur. Bu platformun "güvenlik" ve "taktiksel eğitim" terminolojisini kullanarak, yasa dışı faaliyetlere zemin hazırlamaya çalışan her türlü kişi hakkında, "Halkı Suça Tahrik", "Terör Propagandası" ve "Kamu Düzenini Bozma" gibi suçlar kapsamında derhal suç duyurusunda bulunulacağını ve bu hukuki süreçlerin sonuna kadar takipçisi olunacağını beyan eder.',
      },
    ],
  },
  {
    section: 'BÖLÜM 10: TCCC (TAKTİKSEL MUHAREBE YARALI BAKIMI) VE TIBBİ DİSİPLİN PROTOKOLÜ',
    items: [
      {
        id: 34,
        text: 'Madde 34: Tıbbi Sorumluluk Reddi (Non-Medical Advice) TCCC modülü içerisinde paylaşılan tüm bilgiler, uluslararası TCCC standartlarına dayalı "teorik eğitim" içerikleridir. Bu içerikler, kesinlikle uzman bir tıp doktorunun, paramediğin veya acil tıp teknisyeninin yerini tutmaz. Kullanıcı, burada öğrenilen hiçbir yöntemin "gerçek bir tıbbi müdahale protokolü" olmadığını; acil durumlarda mutlaka 112 Acil Çağrı Merkezi\'nin aranması gerektiğini kabul eder.',
      },
      {
        id: 35,
        text: 'Madde 35: Simülasyon ve Pratik Uygulama Sınırları TCCC eğitimlerinde yer alan "Turnike Uygulaması", "Kanama Kontrolü" ve "Hava Yolu Yönetimi" gibi pratikler, sadece eğitici mankenler veya simülasyon ekipmanları üzerinde uygulanmalıdır. Kullanıcı, bu yöntemleri herhangi bir canlı üzerinde denemeyeceğini; gerçek bir yaralanma durumunda bu yöntemleri yalnızca "yaşamı destekleme" (hayat kurtarma) amacıyla ve profesyonel yardım gelene kadar geçici olarak uygulayabileceğini taahhüt eder.',
      },
      {
        id: 36,
        text: 'Madde 36: Yanlış Uygulama ve Sorumluluk Sınırı Platform, TCCC modülündeki teorik bilgilerin gerçek hayatta hatalı veya eksik uygulanması sonucu oluşabilecek fiziksel zararlardan, ekstremite kayıplarından veya ölümcül sonuçlardan sorumlu tutulamaz. Bilginin "teorik" olduğu ve ancak profesyonel bir ilk yardım sertifikasına sahip bireylerce "yetkinlik dahilinde" uygulanabileceği kullanıcıya her TCCC başlığının altında bir "Bilgilendirme Uyarı Kutusu" ile hatırlatılır.',
      },
    ],
  },
  {
    section: 'BÖLÜM 11: KÜRESEL HABER AĞI VE AÇIK KAYNAK ANALİZ PROTOKOLÜ',
    items: [
      {
        id: 37,
        text: 'Madde 37: Tanım ve İçerik Niteliği "Küresel Haber Ağı" (KHA), dünya genelindeki taktiksel gelişmelerin, güvenlik teknolojilerindeki değişimlerin, savunma sanayii yeniliklerinin ve operasyonel doktrinlerin takip edildiği bir "Açık Kaynak Analiz" (OSINT) merkezidir. Bu ağ, hiçbir suretle devletlerin gizli istihbarat faaliyetlerini, kişisel verilerin yasa dışı takibini veya mahremiyet ihlali içeren bilgileri kapsamaz.',
      },
      {
        id: 38,
        text: 'Madde 38: Bilgi Kaynağı ve Sorumluluk KİA içerisinde paylaşılan tüm veriler; kamuya açık haber kaynaklarından, resmi savunma sanayii bültenlerinden, teknik dokümanlardan ve güvenilir analiz platformlarından derlenmiştir. Audaz Tactical, paylaşılan verilerin doğruluğunu teyit etmek için çaba gösterse de, KİA üzerinden alınan verilerin gerçek dünyadaki operasyonel kararlarda (doğru veya yanlış) kullanılması sonucunda oluşabilecek risklerden sorumluluk kabul etmez.',
      },
      {
        id: 39,
        text: 'Madde 39: Yasal ve Etik Sınırlar KİA kategorisi, bireylerin veya kurumların gizliliğini ihlal edecek, yasa dışı yollarla elde edilmiş verilerin (hacker sızıntıları vb.) paylaşılmasına kesinlikle izin vermez. Bu ağ, sadece "Savunma ve Güvenlik Disiplini"ne uygun, analitik içeriklerin tartışıldığı profesyonel bir ortamdır. İllegal içerik paylaşımı yapan kullanıcılar, "Siber Emniyet Protokolü" (Bölüm 5) kapsamında sistemden kalıcı olarak ihraç edilir.',
      },
    ],
  },
  {
    section: 'BÖLÜM 12: DİJİTAL YAYIN, SPONSORLUK VE İÇERİK İŞ BİRLİĞİ PROTOKOLÜ',
    items: [
      {
        id: 40,
        text: 'Madde 40: İçerik Kabul ve Denetim Süreci "Küresel Haber Ağı" veya platformun diğer modüllerinde yayınlanması talep edilen üçüncü taraf videoları (YouTube içerikleri vb.), Audaz Tactical Editöryal Kurulu tarafından "Taktiksel ve Profesyonel Standartlara Uygunluk" testine tabi tutulur. Platform, herhangi bir içeriği (ücretli olsa dahi) "Emniyet ve Doktrin" ilkelerine aykırı bulursa reddetme veya yayından kaldırma hakkını saklı tutar.',
      },
      {
        id: 41,
        text: 'Madde 41: Yayın Ücretlendirmesi ve Ticari İlişki Platform üzerinde yayınlanan sponsorlu içerikler, "Tanıtım/İş Birliği" kategorisinde değerlendirilir. Bu içeriklerin yayınlanması, içerik sahibinin Audaz Tactical\'ın 39 maddelik tüm yasal protokollerini kabul ettiği anlamına gelir. Yayın ücreti, "Dijital Platform Kullanım ve Destek Bedeli" olarak faturalandırılır; bu bedel, içeriğin doğruluğunu veya kalitesini garanti eden bir "onay" değildir.',
      },
      {
        id: 42,
        text: 'Madde 42: İçerik Sorumluluğu ve İhlaller Platformda yayınlanan üçüncü taraf videolarının içeriğinden, telif haklarından ve bu videolarda sergilenen eylemlerin hukuki sorumluluğundan tamamen "İçerik Sahibi" sorumludur. Audaz Tactical, içeriği yayınlayarak sadece bir "yayın mecrası" (host) görevini üstlenir; içerikteki olası yasal ihlallerden (telif, hakaret, yanlış bilgi) platform sorumlu tutulamaz.',
      },
      {
        id: 43,
        text: 'Madde 43: İçerik Kaldırma ve Revizyon Hakkı Audaz Tactical, yayınlanan bir içeriğin zamanla platformun "Operasyonel Disiplini" ile çelişmesi durumunda (örneğin; içerik sahibinin yasal bir soruna karışması veya içeriğin yanlış/tehlikeli bilgileri teşvik eder hale gelmesi), içeriği derhal ve tek taraflı olarak yayından kaldırma hakkına sahiptir. Bu durumda herhangi bir ücret iadesi yapılmaz.',
      },
    ],
  },
  {
    section: 'BÖLÜM 13: HUKUKİ DAYANAKLAR VE ATIFLAR',
    items: [
      {
        id: 44,
        text: `Madde 44: Referans Verilen Yasal Mevzuat Audaz Tactical platformu, faaliyetlerini aşağıdaki temel yasal çerçeveler dahilinde yürütmektedir:
• 6698 Sayılı Kişisel Verilerin Korunması Kanunu (KVKK): Kişilerin verilerinin işlenmesi, saklanması ve korunması sürecinde bu kanuna riayet edilir.
• 5651 Sayılı İnternet Ortamında Yapılan Yayınların Düzenlenmesi ve Bu Yayınlar Yoluyla İşlenen Suçlarla Mücadele Edilmesi Hakkında Kanun: Platformumuz, "İçerik Sağlayıcı" sıfatıyla bu kanunun yükümlülüklerine tam uyum sağlar.
• 6136 Sayılı Ateşli Silahlar ve Bıçaklar ile Diğer Aletler Hakkında Kanun: Platformdaki sivil eğitim ve simülasyon içerikleri, bu kanunun sivil hak ve özgürlükler, emniyetli kullanım ve spor amaçlı kullanımı çerçevesinde yapılandırılmıştır.
• 5237 Sayılı Türk Ceza Kanunu (TCK): Bilişim suçları (Madde 243-246), halkı kin ve düşmanlığa tahrik (Madde 216) ve terör propagandası (Madde 7/2) gibi maddeler, platformun "Sıfır Tolerans" politikasının hukuki temelini oluşturur.
• Fikir ve Sanat Eserleri Kanunu (FSEK): Kullanıcı tarafından platforma yüklenen içeriklerin telif hakları, bu kanun kapsamında korunur.`,
      },
      {
        id: 45,
        text: 'Madde 45: Uluslararası TCCC ve Güvenlik Standartları Platformdaki "Taktiksel Muharebe Yaralı Bakımı" (TCCC) modülü, Committee on Tactical Combat Casualty Care (CoTCCC) tarafından belirlenen uluslararası güncel rehberleri esas alır. Ancak bu rehberler, sadece askeri/profesyonel standartların sivil simülasyona uyarlanmış teorik bir yansımasıdır.',
      },
      {
        id: 46,
        text: 'Madde 46: "Operasyonel" Sözleşmenin Niteliği Bu 46 maddelik protokol, taraflar arasında akdedilen bir "Hizmet ve Emniyet Sözleşmesi"dir. Platformun Noir estetiği ve "operatör" terminolojisi, sözleşmenin yasal bağlayıcılığını ortadan kaldırmaz; aksine, tarafların platformun "Taktiksel Eğitim Disiplini"ni kabul ettiğini vurgular.',
      },
    ],
  },
])

/**
 * Final Notu — protokol paketinin kapanış beyanı.
 * @type {string}
 */
export const LEGAL_PROTOCOL_FINAL_NOTE =
  'Final Notu: Audaz Tactical, yukarıdaki 46 maddenin tamamını tek bir "Operasyonel ve Hukuki Protokol" paketi olarak sunar. Platformun Noir estetiği, askeri terminolojisi ve simülasyon dili; içeriğin eğitim ve sivil güvenlik disiplini niteliğini değiştirmez. Dijital onay (agreedToTerms) işlemi, operatörün bu protokolü okuduğunu, anladığını ve kabul ettiğini tevsik eden hukuki bir kayıt niteliğindedir. Protokol metninde geçen bölüm atıfları birbirini tamamlar; tek bir madde, paketin geri kalanından bağımsız yorumlanamaz.'

/** @typedef {{ id: number; section: string; text: string }} LegalProtocolFlatItem */

/**
 * Düz liste — LegalDisclaimer vb. bileşenler için geriye dönük uyumluluk.
 * @type {readonly LegalProtocolFlatItem[]}
 */
export const OPERATIONAL_LEGAL_PROTOCOLS = Object.freeze(
  LEGAL_PROTOCOLS.flatMap((block) =>
    block.items.map((item) => ({
      id: item.id,
      section: block.section,
      text: item.text,
    })),
  ),
)

if (OPERATIONAL_LEGAL_PROTOCOLS.length !== LEGAL_PROTOCOL_COUNT) {
  throw new Error(
    `LEGAL_PROTOCOLS: beklenen ${LEGAL_PROTOCOL_COUNT} madde, tanımlı ${OPERATIONAL_LEGAL_PROTOCOLS.length}`,
  )
}
