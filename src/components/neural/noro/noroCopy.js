/**
 * NÖRO metinleri — tek ses: esprili, samimi, arkadaşça.
 */

import { REGIONS } from '../../../lib/neural/neuralConfig'

/**
 * @param {string} id
 */
export function regionName(id) {
  return REGIONS[/** @type {keyof typeof REGIONS} */ (id)]?.nameTr ?? id
}

/** @param {string[]} a */
export function pick(a) {
  return a[Math.floor(Math.random() * a.length)]
}

export const ADV = Object.freeze({
  frontal: 'Bir FOF senaryosu ya da kısa bir AAR yazmak kararlarını keskinleştirir.',
  motor: 'Kuru tetik ısınması ve bir atış serisi; temel her zaman kazandırır.',
  parietal: 'Balistik terminalde farklı mesafe ve rüzgârla iki profil hesapla, kafandaki harita netleşsin.',
  occipital: 'Bir taktik video analizi izle; ne gördüğünü değil, neyi kaçırdığını not et.',
  temporal: 'Bir doktrin bölümü oku, sonra kendi cümlelerinle iki satır özet çıkar.',
  hippocampus: 'Eski bir konuyu kendini test ederek tekrar et. Seri için her gün küçük bir kayıt yeter.',
  cerebellum: "Timer'da 10 dakikalık kılıftan çekiş tekrarı refleksleri canlı tutar.",
  stem: 'Haftada bir TCCC tatbikatı: turnike süreni ölç, kendi rekorunu kır.',
})

export const SCI = Object.freeze({
  stem: 'Turnike ve kanama kontrolü gibi beceriler eğitimden sonraki aylarda belirgin düşüyor.',
  motor: 'Doğruluk isteyen beceriler hız isteyenlerden daha çabuk paslanır.',
  temporal: 'Bilgiye dayalı beceriler fiziksel olanlardan daha hızlı unutulur.',
  parietal: 'Hesap ve bilgi becerileri fiziksel becerilerden hızlı unutulur.',
  frontal: 'Duruma göre karar verme, sabit prosedürlerden daha çabuk paslanır.',
  cerebellum: 'Refleksler dayanıklıdır ama sonsuza kadar değil.',
  occipital: 'İstihbarat bayatlar; iki hafta önceki haber bugünün haritası değildir.',
  hippocampus: 'Hafıza düzenli tekrarı sever.',
})

export const ACT_LABEL = Object.freeze({
  frontal: 'Görev / AAR tamamla',
  motor: 'Atış kaydı',
  parietal: 'Balistik hesap',
  occipital: 'Video / istihbarat',
  temporal: 'Doktrin / rehber',
  hippocampus: 'Tekrar / seri',
  cerebellum: 'Timer seansı',
  stem: 'TCCC tatbikatı',
})

/**
 * Bağlama göre motivasyon — { id, tags, text }
 * tags: level_up | streak_3 | streak_7 | streak_14 | streak_30 | return | low_score | comeback | generic
 */
export const MOTIVATION = Object.freeze([
  { id: 'm01', tags: ['generic', 'level_up'], text: 'Bir basamak daha. Merdiven kendiliğinden çıkılmaz.' },
  { id: 'm02', tags: ['generic', 'level_up'], text: 'Seviye atladın; ego değil, kanıt. Cebine koy, devam.' },
  { id: 'm03', tags: ['level_up'], text: 'Yeni seviye = yeni standart. Eski rahatına dönme.' },
  { id: 'm04', tags: ['streak_3'], text: 'Üç gün üst üste. Bu artık alışkanlık değil, karakter.' },
  { id: 'm05', tags: ['streak_3', 'generic'], text: 'Üçüncü gün… Beyin “ciddiyiz” diye not düştü.' },
  { id: 'm06', tags: ['streak_7'], text: 'Yedi gün. Haftalık ritim kuruldu; zinciri hafife alma.' },
  { id: 'm07', tags: ['streak_7'], text: 'Bir haftalık seri. Disiplin sessizce birikir, sonra gürültü yapar.' },
  { id: 'm08', tags: ['streak_14'], text: 'İki hafta. Artık “bugünlük” değil, “sistem” diyorsun.' },
  { id: 'm09', tags: ['streak_14'], text: 'On dört gün. Rakiplerin mazeret yazarken sen kayıt yazıyorsun.' },
  { id: 'm10', tags: ['streak_30'], text: 'Otuz gün. Bu bir ay değil; bir operatörün imzası.' },
  { id: 'm11', tags: ['streak_30'], text: 'Bir aylık seri. Karakter dosyana kalın bir satır düştü.' },
  { id: 'm12', tags: ['return'], text: 'Tozlanmış bölgeye dönüş. Unutulan beceri sıfırdan hızlı geri gelir — sen de öyle.' },
  { id: 'm13', tags: ['return'], text: 'Geri döndün. Pas, yenilgi değil; ara vermiştin, şimdi kapatıyorsun.' },
  { id: 'm14', tags: ['low_score'], text: 'Skor düşük ama sen buradasın. Gelmeyenlerin skoru sıfır.' },
  { id: 'm15', tags: ['low_score'], text: 'Kötü grup = iyi ders. Tutuşu, nefesi, tetik düşüşünü bir daha tart.' },
  { id: 'm16', tags: ['low_score'], text: 'Hedef bugün kaçak dövüştü. Sen ringe çıktın; bu yetmez ama başlangıç.' },
  { id: 'm17', tags: ['comeback'], text: 'Uzun ara, kısa dönüş. İlk kayıt en zorudur; gerisi momentum.' },
  { id: 'm18', tags: ['comeback'], text: 'Kapıyı yeniden açtın. Beyin uykudaydı, sen alarmı çaldın.' },
  { id: 'm19', tags: ['generic'], text: 'Disiplin, motivasyonun bittiği yerde başlar. Sen başladın bile.' },
  { id: 'm20', tags: ['generic'], text: 'Küçük kayıtlar büyük hazırlık yapar. Bugünkü satır yarının refleksidir.' },
  { id: 'm21', tags: ['generic'], text: 'Sahaya çıkmadan önce deftere yazılanlar, saha içinde konuşur.' },
  { id: 'm22', tags: ['generic'], text: 'Temel sıkıcıdır; ta ki temel seni kurtarana kadar.' },
  { id: 'm23', tags: ['generic'], text: 'Her kayıt bir tuğla. Duvarı görmeden bırakma.' },
  { id: 'm24', tags: ['generic', 'level_up'], text: 'İlerleme sessiz olur. Skor tablosu sonra bağırır.' },
  { id: 'm25', tags: ['generic'], text: 'Bugün terlediğin her damla, sahada dökülmeyecek kan — abartısız: daha temiz iş çıkar.' },
  { id: 'm26', tags: ['streak_3', 'streak_7'], text: 'Seriyi korumak, rekor kırmaktan daha operatörce.' },
  { id: 'm27', tags: ['low_score', 'generic'], text: 'Hata deftere yazılırsa ders olur; yazılmazsa tekrar eder.' },
  { id: 'm28', tags: ['return', 'comeback'], text: 'Boş günler geçmişte kaldı. Bugün sayfayı çevirdin.' },
  { id: 'm29', tags: ['generic'], text: 'Kuru tetik, ıslak ego. Ego’yu bırak, tetikte kal.' },
  { id: 'm30', tags: ['generic'], text: 'Plan yaz, uygula, ölç. Üçlüyü kaçırırsan rastgele atış yaparsın.' },
  { id: 'm31', tags: ['level_up'], text: 'Haritada yeni ışık yandı. O ışığı söndürmemek senin işin.' },
  { id: 'm32', tags: ['streak_7', 'streak_14'], text: 'Ritim kurulduysa mazeret satışı kapandı.' },
  { id: 'm33', tags: ['generic'], text: 'İyi operatör gürültü yapmaz; kayıt bırakır.' },
  { id: 'm34', tags: ['low_score'], text: 'Skoru düzeltmek için önce tutuşu düzelt. Kağıt yalan söylemez.' },
])

/**
 * Sürükleme tepkileri — { id, tags, text }
 * tags: start | shake | top | corner | same | frequent | after_idle | center | busy
 */
export const DRAG_LINES = Object.freeze([
  { id: 'd01', tags: ['start'], text: 'Hop! Nereye götürüyorsun beni?' },
  { id: 'd02', tags: ['start'], text: 'Tamam, intikal başladı.' },
  { id: 'd03', tags: ['start'], text: 'Sıkı tut, düşersem tutanak tutarım :) ' },
  { id: 'd04', tags: ['start'], text: 'Yer değiştirme emri alındı, uyguluyorum.' },
  { id: 'd05', tags: ['start'], text: 'Yine mi taşınıyoruz? Eşyalarımı toplamadım ama olsun.' },
  { id: 'd06', tags: ['start'], text: 'Sessiz ve derinden ilerliyoruz.' },
  { id: 'd07', tags: ['start'], text: 'Beni böyle tutunca kendimi kedi yavrusu gibi hissediyorum.' },
  { id: 'd08', tags: ['start'], text: 'Bana sormadan karar verdin ama sorun değil, alıştım.' },
  { id: 'd09', tags: ['start'], text: 'Kalkışa hazırım. Kemerler bağlı.' },
  { id: 'd10', tags: ['start'], text: 'Yavaş, daha kahvemi bitirmedim.' },
  { id: 'd11', tags: ['shake'], text: 'Başım döndü kanka, yavaş!' },
  { id: 'd12', tags: ['shake'], text: 'Dalga üç metre, tutunuyorum!' },
  { id: 'd13', tags: ['shake'], text: 'Bu ne sarsıntı? Lastik botla fırtınaya mı çıktık?' },
  { id: 'd14', tags: ['shake'], text: 'Nişan alamıyorum, sabit tut şunu!' },
  { id: 'd15', tags: ['shake'], text: 'Tamam, acelen var anladım. Ama midem bulanıyor.' },
  { id: 'd16', tags: ['shake'], text: 'Bu hızla gidersek limana varmadan batarız.' },
  { id: 'd17', tags: ['shake'], text: 'Bende deniz tutması yok sanıyordum, yanılmışım.' },
  { id: 'd18', tags: ['shake'], text: 'Fare mi kullanıyorsun, kokteyl mi çalkalıyorsun?' },
  { id: 'd19', tags: ['shake'], text: 'Şu an üç tane ekran görüyorum. Hangisi gerçek?' },
  { id: 'd20', tags: ['shake'], text: 'Sallama beni, ben ayran değilim.' },
  { id: 'd21', tags: ['top'], text: 'Gözcü kulesine çıktık. Manzara harika.' },
  { id: 'd22', tags: ['top'], text: 'Yukarıdan her şey daha net görünüyor.' },
  { id: 'd23', tags: ['top'], text: 'Köprü üstündeyim, komuta bende.' },
  { id: 'd24', tags: ['top'], text: 'Yükseklik korkum var ama belli etmeyeceğim.' },
  { id: 'd25', tags: ['top'], text: 'Yüksek arazi her zaman avantajdır. Doktrinde de yazıyor.' },
  { id: 'd26', tags: ['top'], text: 'Burası çatı katı. Kirası da uçuktur kesin.' },
  { id: 'd27', tags: ['top'], text: 'Buradan bakınca sen çok küçük görünüyorsun.' },
  { id: 'd28', tags: ['top'], text: 'Tavana yapıştırdın beni. Örümcek miyim ben?' },
  { id: 'd29', tags: ['top'], text: 'Yukarıdayım. Bir şey olursa aşağıdan seslen.' },
  { id: 'd30', tags: ['top'], text: 'Bulutlara hiç bu kadar yakın olmamıştım.' },
  { id: 'd31', tags: ['corner'], text: 'Köşe tutuldu, gözetleme noktası kuruldu.' },
  { id: 'd32', tags: ['corner'], text: 'Pusu pozisyonu. Kimse beni fark etmez burada.' },
  { id: 'd33', tags: ['corner'], text: 'Sırtım duvarda, önüm açık. Taktik olarak doğru.' },
  { id: 'd34', tags: ['corner'], text: 'Köşeye çekildim ama gözüm üzerinde.' },
  { id: 'd35', tags: ['corner'], text: 'Ceza mı bu? Köşede düşünecek miyim?' },
  { id: 'd36', tags: ['corner'], text: 'Köşede durmak, ortada kalmaktan iyidir. Galiba.' },
  { id: 'd37', tags: ['corner'], text: 'Kuytu bir yer buldun, sağ ol.' },
  { id: 'd38', tags: ['corner'], text: 'Buradan bütün sahayı kontrol ediyorum.' },
  { id: 'd39', tags: ['corner'], text: 'Köşe bucak saklanıyorum ama çağırırsan gelirim.' },
  { id: 'd40', tags: ['corner'], text: 'Burası tam keskin nişancı mevzisi.' },
  { id: 'd41', tags: ['center'], text: 'Merkezdeyim. Her şeyi görüyorum.' },
  { id: 'd42', tags: ['center'], text: 'Tam orta. Komuta noktası kuruldu.' },
  { id: 'd43', tags: ['center'], text: 'Herkes bana bakıyor şimdi. Biraz utandım.' },
  { id: 'd44', tags: ['center'], text: 'Ortadayım ama yolunu kesiyorsam kenara al.' },
  { id: 'd45', tags: ['center'], text: 'Sahnenin ortası. Alkış beklemiyorum ama olsa fena olmaz.' },
  { id: 'd46', tags: ['center'], text: 'Burası merkez üs. Emirleri buradan veririm.' },
  { id: 'd47', tags: ['center'], text: 'Ortada kalmak hiç bu kadar keyifli olmamıştı.' },
  { id: 'd48', tags: ['center'], text: 'Sanırım bu hikâyenin ana karakteri benim.' },
  { id: 'd49', tags: ['center'], text: 'Tam hedefin ortası. On ikiden vurdun.' },
  { id: 'd50', tags: ['center'], text: 'Bu konumda biraz fazla dikkat çekiyorum, değil mi?' },
  { id: 'd51', tags: ['same'], text: 'Aynı yer mi? Tur attık, eve döndük.' },
  { id: 'd52', tags: ['same'], text: 'Devriye tamamlandı, olağan dışı bir durum yok.' },
  { id: 'd53', tags: ['same'], text: 'Başladığımız noktaya döndük. Keşif turu bitti.' },
  { id: 'd54', tags: ['same'], text: 'Gidip geldik. Ben de oraya tam alışmıştım.' },
  { id: 'd55', tags: ['same'], text: 'Bu bir test miydi? Geçtim sanırım.' },
  { id: 'd56', tags: ['same'], text: 'Değişen bir şey yok ama hareket iyi geldi.' },
  { id: 'd57', tags: ['same'], text: 'Kararsızlık mı bu, yoksa kontrol mü?' },
  { id: 'd58', tags: ['same'], text: 'Mahalleyi dolaştık, evimize döndük.' },
  { id: 'd59', tags: ['same'], text: 'Bu yolculuk hiçbir yere varmadı ama güzeldi.' },
  { id: 'd60', tags: ['same'], text: 'Yer değiştirmiş gibi yaptık, hoşuma gitti.' },
  { id: 'd61', tags: ['frequent'], text: 'Nakliyat şirketi kurduk galiba.' },
  { id: 'd62', tags: ['frequent'], text: 'Bugün kaç kez mevzi değiştirdik? Saymayı bıraktım.' },
  { id: 'd63', tags: ['frequent'], text: 'Bu kadar intikal ancak tatbikatta olur.' },
  { id: 'd64', tags: ['frequent'], text: 'Hareketli operatörsün, anladım. Ben de ayak uydururum.' },
  { id: 'd65', tags: ['frequent'], text: 'Bir yerde durmayı sevmiyorsun, değil mi?' },
  { id: 'd66', tags: ['frequent'], text: 'Tamam, en iyi yeri bulana kadar devam.' },
  { id: 'd67', tags: ['frequent'], text: 'Bu hızla gidersek akşama ikametgâh değiştirmem gerekecek.' },
  { id: 'd68', tags: ['frequent'], text: 'Taşınma sayımız eğitim kayıtlarını geçti. Bunu bir düşün.' },
  { id: 'd69', tags: ['frequent'], text: 'Beni sürüklemeyi bu kadar seviyorsan bir atış kaydı da gir bari.' },
  { id: 'd70', tags: ['frequent'], text: 'Yorulmadın mı? Ben yoruldum.' },
  { id: 'd71', tags: ['after_idle'], text: 'Uzun süredir buradaydım. Değişiklik iyi geldi.' },
  { id: 'd72', tags: ['after_idle'], text: 'Tozlanmıştım neredeyse, sağ ol.' },
  { id: 'd73', tags: ['after_idle'], text: 'Nöbet değişimi mi? Hazırım.' },
  { id: 'd74', tags: ['after_idle'], text: 'Bacaklarım uyuşmuştu, iyi oldu bu.' },
  { id: 'd75', tags: ['after_idle'], text: 'Sessizlik bozuldu, yeniden yoldayız.' },
  { id: 'd76', tags: ['after_idle'], text: 'Uzun nöbetten sonra hareket ilaç gibi geldi.' },
  { id: 'd77', tags: ['after_idle'], text: 'Uyuyakalmışım, kimseye söyleme.' },
  { id: 'd78', tags: ['after_idle'], text: 'Ben de unutuldum sanmıştım.' },
  { id: 'd79', tags: ['after_idle'], text: 'Örümcekler üstüme ağ örmeye başlamıştı.' },
  { id: 'd80', tags: ['after_idle'], text: 'Sonunda! Kök salmak üzereydim.' },
  { id: 'd81', tags: ['busy'], text: 'Konuşurken taşınmak zor ama deneyelim.' },
  { id: 'd82', tags: ['busy'], text: 'Dur, cümlemi bitireyim, sonra götür.' },
  { id: 'd83', tags: ['busy'], text: 'Mesajı okudun mu bari? Sonra taşırsın.' },
  { id: 'd84', tags: ['busy'], text: 'Lafımın ortasında beni kaçırıyorsun!' },
  { id: 'd85', tags: ['busy'], text: 'Sözümü kestin ama seni affediyorum.' },
  { id: 'd86', tags: ['busy'], text: 'Hem konuşup hem yürüyorum. Çok yönlü asistanım.' },
  { id: 'd87', tags: ['busy'], text: 'Bu mesaj önemliydi, yolda okursun artık.' },
  { id: 'd88', tags: ['busy'], text: 'Telsizde konuşurken intikal. Klasik.' },
  { id: 'd89', tags: ['busy'], text: 'Daha balonum açıktı, nereye?' },
  { id: 'd90', tags: ['busy'], text: 'Konuşmamı yarıda bırakıp beni sürüklemek… Tam komutan hareketi.' },
  { id: 'd91', tags: ['busy'], text: 'Peki, toplantıyı yürüyerek yapıyoruz.' },
  { id: 'd92', tags: ['busy'], text: 'Ağzımda lafla taşınıyorum, ayıp oluyor ama.' },
  { id: 'd93', tags: ['busy'], text: 'Beni dinlemiyorsun, değil mi? Tamam, alıştım.' },
  { id: 'd94', tags: ['busy'], text: 'Brifing sırasında mevzi değiştirmek. Cesur hamle.' },
])

/**
 * @param {string} id
 * @param {number} g
 */
export function lineForRegion(id, g) {
  const n = regionName(id)
  const plus = `+${Math.round(g)}`
  const lines = {
    frontal: [
      `Görev kapandı, AAR yazıldı. ${n} ${plus}. Kararlarını yazıya dökmek, bir sonrakini daha hızlı vermeni sağlar.`,
      `Plan, icra, değerlendirme… ${n} şu an satranç oynuyor. ${plus}`,
    ],
    motor: [
      `Tetik parmağı ısındı! Atış kaydı ${n} hanesine ${plus} yazdı.`,
      `Bir seri daha bitti, namlu hâlâ sıcak. ${n} ${plus}.`,
    ],
    parietal: [
      `Rüzgârı, mesafeyi, açıyı hesapladın. ${n} ${plus}; kafandaki üç boyutlu harita netleşiyor.`,
      `Hesap kitap tamam. ${n} ${plus}. Mermi fiziği artık senden korkuyor.`,
    ],
    occipital: [
      `Video analizi bitti. ${n} ${plus}. Göz ne kadar çok görürse tehdidi o kadar erken yakalar.`,
      `Kare kare izledin, not aldın. ${n} ${plus}. Kartal gözü modu yükleniyor.`,
    ],
    temporal: [
      `Doktrin okundu, ${n} ${plus}. Bilgi sırtta taşınmaz ama sahada çok iş görür.`,
      `Sayfalar çevrildi, ${n} ${plus}. Bu gidişle kitabı sen yazarsın kanka.`,
    ],
    hippocampus: [
      `Tekrar testi çözüldü. ${n} ${plus}. Hatırlamaya çalışmak tekrar okumaktan daha kalıcıdır, bilim de öyle diyor.`,
    ],
    cerebellum: [
      `Timer bipledi, sen çektin. ${n} ${plus}. Refleksler yağ gibi akıyor.`,
      `Çekiş, nişan, atış. ${n} ${plus}. El ile göz artık aynı telsiz kanalında.`,
    ],
    stem: [
      `TCCC tatbikatı tamam. ${n} ${plus}. Turnikeyi hızlı bağlayan el, timin en değerli eli.`,
      `Kanama kontrolü, hava yolu, tahliye… ${n} ${plus}. Önce yaşat, sonra savaş.`,
    ],
  }
  return pick(lines[/** @type {keyof typeof lines} */ (id)] || [`Kayıt işlendi. ${n} ${plus}.`])
}

/**
 * @param {number} s
 */
export function scoreLine(s) {
  const n = Math.round(s)
  if (n >= 90) {
    return pick([
      `Skor %${n}. Hedef kâğıdı istifa dilekçesi yazıyor.`,
      `%${n}! Bu gruplamayla bozuk paranın deliğinden geçersin.`,
    ])
  }
  if (n >= 75) {
    return pick([
      `Skor %${n}, temiz iş. Tetik düşüşünü biraz yumuşatırsan 90'ın kapısı açık.`,
      `%${n} gayet iyi. Nefes kontrolü ve sakin tetik, bir sonraki basamak.`,
    ])
  }
  return pick([
    `Skor %${n}. Olur böyle günler; tutuşu ve nefesi bir kontrol et, mermiyi suçlamak yok.`,
    `%${n}… Hedef bugün kaçak dövüştü. On dakika kuru tetik ısınması, sonra rövanş.`,
  ])
}

export const WELCOME =
  'Selam operatör, ben NÖRO. Beynindeki her kıvrımın muhasebesi bende. Sen kayıt gir, ben neyin büyüdüğünü, neyin tozlandığını anlatayım. Laf sokarken bile kibar olacağıma söz. Siteyi de sorabilirsin — “balistik nasıl kaydedilir?” gibi.'

export const EMPTY_USER =
  'Henüz kayıt yok kanka. Beyin uykuda. Antrenmana git, ilk kıvılcımı çak. Takılırsan buradan sor.'

export const OPSEC_WARN =
  'Dur kanka! Mesajında konum, koordinat, plaka ya da operasyon detayı olabilir. Bunu ne bana ne başka bir yapay zekâya yaz. Ben sadece eğitim kayıtlarınla ve site kullanımıyla ilgilenirim; mesajını göndermedim.'

export const GUIDE_MISS =
  'Bunu net bilmiyorum kanka. Kullanım Kılavuzu’na bak veya Geri Bildirim’den yaz — ekip duysun.'
