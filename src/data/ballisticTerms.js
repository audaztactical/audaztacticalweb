/**
 * Balistik modülü terim sözlüğü — InfoTooltip ve form etiketleri için.
 * @typedef {Object} BallisticTerm
 * @property {string} termKey
 * @property {string} termEn
 * @property {string} termTr
 * @property {string} definition
 * @property {string} whyItMatters
 * @property {string} [actionAdvice]
 */

/** Tam Tablo sütunları + PDF terim bölümü için kullanılan anahtarlar. */
export const TABLE_COLUMN_TERM_KEYS = [
  'distance',
  'drop',
  'windage',
  'timeOfFlight',
  'velocity',
  'remainingEnergy',
  'moaClicks',
  'mradClicks',
  'machNumber',
]

/** @type {BallisticTerm[]} */
export const BALLISTIC_TERMS = [
  {
    termKey: 'bc',
    termEn: 'BC (Ballistic Coefficient)',
    termTr: 'Balistik Katsayı',
    definition:
      'Merminin havada ne kadar iyi kayacağını gösteren bir sayıdır. Yüksek BC, merminin rüzgâr ve hava direncine daha az etkilenmesi demektir.',
    whyItMatters:
      'Düşüş, rüzgar sapması ve menzilde kalan hız hesaplarında doğrudan kullanılır. Yanlış BC girilirse tablo tamamen şaşar.',
    actionAdvice:
      'Üretici veya mühimmat kutusundaki BC değerini doğru drag modeli (G1/G7) ile girin; emin değilseniz aynı kalibre için doğrulanmış bir referans profille karşılaştırın.',
  },
  {
    termKey: 'g1G7DragModel',
    termEn: 'G1 / G7 Drag Model',
    termTr: 'Sürükleme Modeli (G1 / G7)',
    definition:
      'Merminin hava direncinin hangi standart eğriye göre hesaplanacağını belirler. G1 klasik mermiler, G7 modern uzun ve sivri mermiler için daha uygundur.',
    whyItMatters:
      'BC değeri hangi modele göre verildiyse aynı model seçilmelidir. G7 BC ile G1 modeli kullanırsanız sonuçlar ciddi sapar.',
    actionAdvice:
      'BC hangi standartta verildiyse aynı modeli seçin; modern uzun mermilerde genelde G7 daha doğru sonuç verir.',
  },
  {
    termKey: 'twistRate',
    termEn: 'Twist Rate',
    termTr: 'Yiv Devri',
    definition:
      'Namlu yivlerinin mermiyi tam bir tur döndürmesi için gereken mesafedir. Örneğin 1:8, merminin 8 inçte bir tam tur attığı anlamına gelir.',
    whyItMatters:
      'Doğru stabil uçuş için mermi ağırlığı ve çapıyla uyumlu yiv devri gerekir. Balistik tabloda dolaylı olarak mermi seçimini doğrular.',
    actionAdvice:
      'Silahınızın namlu işaretlemesindeki yiv devrini girin; ağır mermi kullanıyorsanız daha hızlı (kısa) devrin uyumlu olduğundan emin olun.',
  },
  {
    termKey: 'muzzleVelocity',
    termEn: 'Muzzle Velocity',
    termTr: 'Namlu Çıkış Hızı',
    definition:
      'Merminin namludan ayrıldığı andaki hızıdır. Genellikle fit/saniye (fps) ile ifade edilir.',
    whyItMatters:
      'Tüm yörünge hesabının başlangıç noktasıdır. Birkaç fps bile fark, uzak mesafede düşüş ve rüzgar sapmasını değiştirir.',
    actionAdvice:
      'Kronograf ölçümünüz varsa onu kullanın; yoksa fabrika verisini girin ve sahadaki gerçek hızla periyodik olarak doğrulayın.',
  },
  {
    termKey: 'sightHeight',
    termEn: 'Sight Height',
    termTr: 'Optik–Namlu Yükseklik Farkı',
    definition:
      'Nişangah veya optik merkezi ile namlu ekseni arasındaki dikey mesafedir. Genellikle santimetre olarak girilir.',
    whyItMatters:
      'Mermi namlu hattının üstünden çıkar; sıfırlama ve düşüş hesabı bu yüksekliği dikkate almadan doğru olamaz.',
    actionAdvice:
      'Optik merkezi ile namlu ekseni arasındaki dikey mesafeyi cetvelle ölçüp santimetre cinsinden girin.',
  },
  {
    termKey: 'zeroDistance',
    termEn: 'Zero Distance',
    termTr: 'Sıfırlama Mesafesi',
    definition:
      'Nişangah hattı ile mermi yolunun tekrar kesiştiği mesafedir. Bu mesafede nişan aldığınız noktada mermi hedef hattına gelir.',
    whyItMatters:
      'Sıfırlama mesafesi, namlu açısını ve yakın–orta menzil düşüş tablosunu belirler. Yanlış zero, tüm menzilleri kaydırır.',
    actionAdvice:
      'Sahada gerçekten sıfırladığınız mesafeyi girin; farklı mühimmat veya optik değişince zero mesafesini yeniden doğrulayın.',
  },
  {
    termKey: 'moaMrad',
    termEn: 'MOA / MRAD',
    termTr: 'Açısal Ölçü Birimi',
    definition:
      'Düşüş ve rüzgar sapmasını açı cinsinden ifade eden birimlerdir. MOA (dakika açı) ve MRAD (miliradyan) optiklerde en yaygın ikisidir.',
    whyItMatters:
      'Tablodaki açı değerleri, optiğinizde kaç tık ayar yapacağınızı anlamanızı sağlar. MOA ve MRAD birbirine çevrilemez karıştırılmamalıdır.',
    actionAdvice:
      'Optiğiniz MOA ise MOA sütununu, MRAD ise MRAD sütununu kullanın; birimleri karıştırmayın.',
  },
  {
    termKey: 'clickValue',
    termEn: 'Click Value',
    termTr: 'Tık Değeri',
    definition:
      'Optik kadranında bir tık (click) çevirdiğinizde nişangahın kaç MOA veya MRAD kaydığını gösterir. Örneğin 0,25 MOA/tık.',
    whyItMatters:
      'Hesaplanan düzeltmeyi sahada hızlıca optiğe aktarmak için gereklidir. Tık değeri bilinmezse tablo pratikte kullanılamaz.',
    actionAdvice:
      'Optik kutusundaki tık değerini profile girin; tablodaki açıyı tık değerinize bölerek kaç tık çevireceğinizi hesaplayın.',
  },
  {
    termKey: 'ffpSfp',
    termEn: 'FFP / SFP',
    termTr: 'Ön / Arka Odak Düzlemi',
    definition:
      'FFP (First Focal Plane): reticle büyütme ile birlikte ölçeklenir. SFP (Second Focal Plane): reticle sabit kalır, sadece hedef büyür.',
    whyItMatters:
      'Hangi planda olduğunuz, büyütme değişince mil-dot veya MOA reticle ile anlık nişan düzeltmesini etkiler.',
    actionAdvice:
      'SFP optikte reticle düzeltmelerini yalnızca belirli büyütmede uygulayın; FFP’de büyütme fark etmez.',
  },
  {
    termKey: 'reticleType',
    termEn: 'Reticle Type',
    termTr: 'Nişangah Tipi',
    definition:
      'Optik içindeki nişangah desenidir: mil-dot, BDC, MOA tabanlı, Christmas tree vb. Her desen farklı mesafe ve rüzgar okuması sunar.',
    whyItMatters:
      'Profilde reticle tipi, hangi düzeltme yöntemini kullanacağınızı ve tablo birimleriyle uyumu hatırlatır.',
    actionAdvice:
      'Reticle tipinize uygun okuma yöntemini (mil, MOA, BDC) kullanın; tablo değerlerini reticle subtension’ına göre uygulayın.',
  },
  {
    termKey: 'coriolis',
    termEn: 'Coriolis Effect',
    termTr: 'Coriolis Etkisi (Dünya Dönüşü Sapması)',
    definition:
      'Dünya\'nın dönüşü nedeniyle çok uzun menzillerde merminin hafif yatay ve dikey sapmasıdır. En çok 800 m üzeri ve yüksek enlemde hissedilir.',
    whyItMatters:
      'Elit ve uzun menzil atışlarında birkaç santimetrelik ek sapma üretir. Kapalıyken orta menzil pratik atışları etkilemez.',
    actionAdvice:
      '800 m üzeri keskin atışlarda enlem ve atış yönünü girin; orta menzil pratik atışlarda kapalı bırakabilirsiniz.',
  },
  {
    termKey: 'airDensity',
    termEn: 'Air Density (Altitude / Pressure / Humidity)',
    termTr: 'Hava Yoğunluğu Etkisi',
    definition:
      'Sıcaklık, basınç, nem ve rakım havanın yoğunluğunu değiştirir. Yoğun hava mermiyi daha çabuk yavaşlatır.',
    whyItMatters:
      'Aynı mermi yazın dağda da düz ovada da farklı düşer. Gerçek atmosfer girilmezse tablo o günkü koşullara uymaz.',
    actionAdvice:
      'Atış günü gerçek sıcaklık, basınç ve rakımı girin; mümkünse saha barometresi veya hava istasyonu verisini kullanın.',
  },
  {
    termKey: 'crosswind',
    termEn: 'Crosswind Component',
    termTr: 'Rüzgar Dik Bileşeni',
    definition:
      'Rüzgarın mermi yoluna tam dik etkisini gösteren bileşendir. Tam yan rüzgar (90°) en büyük sapmayı üretir.',
    whyItMatters:
      'Yatay rüzgar sapması hesabının temel girdisidir. Hız ve yön yanlışsa windage sütunu güvenilmez olur.',
    actionAdvice:
      'Sahada rüzgarı Kestrel, bayrak veya vejetasyon hareketiyle ölçün; tablo sapmasını optikte veya nişan noktasında ters yönde uygulayın.',
  },
  {
    termKey: 'pressureType',
    termEn: 'Station vs Sea-Level Pressure',
    termTr: 'İstasyon / Deniz Seviyesi Basıncı',
    definition:
      'İstasyon basıncı: o an bulunduğunuz yerde barometrenin gösterdiği gerçek basınçtır. Deniz seviyesi basıncı (QNH): rakıma göre düzeltilmiş referans basıncıdır.',
    whyItMatters:
      'Yanlış mod seçilirse hava yoğunluğu iki kez veya eksik hesaplanır; menzil ve düşüş ciddi sapar. Dağ/atış sahasında genelde istasyon basıncı kullanılır.',
    actionAdvice:
      'Barometre doğrudan sahadaki basıncı gösteriyorsa “İstasyon” seçin; QNH/metar verisi kullanıyorsanız kaynağa uygun modu seçin.',
  },
  {
    termKey: 'launchAngle',
    termEn: 'Launch Angle',
    termTr: 'Namlu Açısı',
    definition:
      'Namlunun yatay çizgiye göre yukarı eğim açısıdır. Sıfırlama mesafesine göre otomatik hesaplanır.',
    whyItMatters:
      'Merminin yörüngesini belirleyen temel açıdır. Optik sıfırlandığında motor bu açıyı arka planda kullanır.',
    actionAdvice:
      'Bu değer otomatik hesaplanır; sıfırlama mesafeniz doğruysa ek ayar gerekmez.',
  },
  {
    termKey: 'distance',
    termEn: 'Distance',
    termTr: 'Mesafe',
    definition:
      'Hedefin namlu ağzından metre cinsinden uzaklığıdır. Tablodaki her satır farklı bir menzili temsil eder.',
    whyItMatters:
      'Tüm düşüş, rüzgar, hız ve enerji değerleri bu menzile göre hesaplanır; menzil seçimi tablonun temelidir.',
    actionAdvice:
      'Atış yapacağınız gerçek mesafeyi lazer veya harita ile ölçün; tabloda en yakın hesaplanmış satırı referans alın.',
  },
  {
    termKey: 'drop',
    termEn: 'Bullet Drop',
    termTr: 'Düşüş',
    definition:
      'Merminin nişangah hattının altında kaldığı dikey mesafedir. Santimetre cinsinden gösterilir.',
    whyItMatters:
      'Uzak menzilde nişan noktasını ne kadar yukarı almanız veya optiği ne kadar ayarlamanız gerektiğini gösterir.',
    actionAdvice:
      'Bu düşüş kadar nişan noktanızı yukarı alın veya dürbününüzü aynı miktarda yukarı ayarlayın.',
  },
  {
    termKey: 'windage',
    termEn: 'Windage',
    termTr: 'Rüzgar Sapması',
    definition:
      'Rüzgarın mermiyi yatay düzlemde ne kadar saptırdığını gösterir. Santimetre cinsinden verilir.',
    whyItMatters:
      'Yan rüzgarlı koşullarda isabet için yatay düzeltme yapmanızı sağlar; sapma mesafe ve uçuş süresi arttıkça büyür.',
    actionAdvice:
      'Bu sapma kadar dürbününüzü rüzgar yönünün tersine çevirin veya nişan noktanızı rüzgarın geldiği yöne kaydırın.',
  },
  {
    termKey: 'timeOfFlight',
    termEn: 'Time of Flight (TOF)',
    termTr: 'Uçuş Süresi',
    definition:
      'Merminin namludan çıkıp hedef menzile ulaşana kadar geçen süredir. Saniye cinsinden gösterilir.',
    whyItMatters:
      'Rüzgar sapması ve hareketli hedef önceliği (lead) hesaplarında süre ne kadar uzunsa etki o kadar büyür.',
    actionAdvice:
      'Hareketli hedeflerde bu süre kadar öndeleme (lead) payı bırakın; rüzgar değişimlerinde uzun TOF daha fazla sapma üretir.',
  },
  {
    termKey: 'velocity',
    termEn: 'Remaining Velocity',
    termTr: 'Kalan Hız',
    definition:
      'Merminin hedef menzildeki hızıdır. Fit/saniye (fps) olarak gösterilir.',
    whyItMatters:
      'Hız düştükçe rüzgar etkisi ve düşüş artar; transonik bölgede stabilite de değişebilir.',
    actionAdvice:
      'Hız hızla düşüyorsa o menzilde rüzgar ve düşüş düzeltmelerine ekstra dikkat edin; avcılıkta etkili menzil sınırını buna göre belirleyin.',
  },
  {
    termKey: 'remainingEnergy',
    termEn: 'Remaining Energy',
    termTr: 'Kalan Enerji',
    definition:
      'Merminin hedef menzilde taşıdığı kinetik enerjidir. Genellikle ft·lb veya joule olarak verilir.',
    whyItMatters:
      'Av veya etkisiz hale getirme değerlendirmesinde merminin o mesafede ne kadar “gücü” kaldığını gösterir.',
    actionAdvice:
      'Enerji düştükçe durdurucu etki azalır; avcılıkta etkili menzil sınırını buna göre belirleyin.',
  },
  {
    termKey: 'moaClicks',
    termEn: 'MOA Drop Correction',
    termTr: 'MOA Düzeltmesi',
    definition:
      'Hedef menzilde merminin nişangah hattının altında kalması için gereken açısal düzeltmedir. MOA (dakika açı) cinsinden verilir.',
    whyItMatters:
      'MOA tıklı optiklerde düşüşü doğrudan kadran ayarına çevirmenizi sağlar.',
    actionAdvice:
      'Dürbününüzü bu MOA değeri kadar yukarı çevirin (click değeriniz farklıysa MOA’yı click sayısına bölün).',
  },
  {
    termKey: 'mradClicks',
    termEn: 'MRAD Drop Correction',
    termTr: 'MRAD Düzeltmesi',
    definition:
      'Hedef menzilde merminin nişangah hattının altında kalması için gereken miliradyan cinsinden açısal düzeltmedir.',
    whyItMatters:
      'MRAD/mil tabanlı optiklerde düşüş düzeltmesini hızlıca uygulamanızı sağlar.',
    actionAdvice:
      'MRAD optikte bu değer kadar yukarı ayar yapın; tık değeriniz 0,1 MRAD ise değeri 0,1’e bölerek tık sayısını bulun.',
  },
  {
    termKey: 'machNumber',
    termEn: 'Mach Number',
    termTr: 'Mach Sayısı',
    definition:
      'Mermi hızının o andaki ses hızına oranıdır. Mach 1 ses hızı, üzeri süpersonik, altı subsöniktir.',
    whyItMatters:
      'Hava direnci ses hızı civarında ani değişir. Mach değeri, merminin hangi hız rejiminde uçtuğunu anlamanızı sağlar.',
    actionAdvice:
      '1.0’a yakın (transonik bölge) mermi kararsızlaşabilir; bu mesafede hassasiyet düşebilir, dikkatli olun.',
  },
]

/** @type {Map<string, BallisticTerm>} */
const TERM_MAP = new Map(BALLISTIC_TERMS.map((t) => [t.termKey, t]))

/**
 * @param {string} termKey
 * @returns {BallisticTerm | undefined}
 */
export function getBallisticTerm(termKey) {
  return TERM_MAP.get(termKey)
}

export default BALLISTIC_TERMS
