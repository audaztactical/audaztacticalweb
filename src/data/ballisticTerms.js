/**
 * Balistik modülü terim sözlüğü — InfoTooltip ve form etiketleri için.
 * @typedef {Object} BallisticTerm
 * @property {string} termKey
 * @property {string} termEn
 * @property {string} termTr
 * @property {string} definition
 * @property {string} whyItMatters
 */

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
  },
  {
    termKey: 'g1G7DragModel',
    termEn: 'G1 / G7 Drag Model',
    termTr: 'Sürükleme Modeli (G1 / G7)',
    definition:
      'Merminin hava direncinin hangi standart eğriye göre hesaplanacağını belirler. G1 klasik mermiler, G7 modern uzun ve sivri mermiler için daha uygundur.',
    whyItMatters:
      'BC değeri hangi modele göre verildiyse aynı model seçilmelidir. G7 BC ile G1 modeli kullanırsanız sonuçlar ciddi sapar.',
  },
  {
    termKey: 'twistRate',
    termEn: 'Twist Rate',
    termTr: 'Yiv Devri',
    definition:
      'Namlu yivlerinin mermiyi tam bir tur döndürmesi için gereken mesafedir. Örneğin 1:8, merminin 8 inçte bir tam tur attığı anlamına gelir.',
    whyItMatters:
      'Doğru stabil uçuş için mermi ağırlığı ve çapıyla uyumlu yiv devri gerekir. Balistik tabloda dolaylı olarak mermi seçimini doğrular.',
  },
  {
    termKey: 'muzzleVelocity',
    termEn: 'Muzzle Velocity',
    termTr: 'Namlu Çıkış Hızı',
    definition:
      'Merminin namludan ayrıldığı andaki hızıdır. Genellikle fit/saniye (fps) ile ifade edilir.',
    whyItMatters:
      'Tüm yörünge hesabının başlangıç noktasıdır. Birkaç fps bile fark, uzak mesafede düşüş ve rüzgar sapmasını değiştirir.',
  },
  {
    termKey: 'sightHeight',
    termEn: 'Sight Height',
    termTr: 'Optik–Namlu Yükseklik Farkı',
    definition:
      'Nişangah veya optik merkezi ile namlu ekseni arasındaki dikey mesafedir. Genellikle santimetre olarak girilir.',
    whyItMatters:
      'Mermi namlu hattının üstünden çıkar; sıfırlama ve düşüş hesabı bu yüksekliği dikkate almadan doğru olamaz.',
  },
  {
    termKey: 'zeroDistance',
    termEn: 'Zero Distance',
    termTr: 'Sıfırlama Mesafesi',
    definition:
      'Nişangah hattı ile mermi yolunun tekrar kesiştiği mesafedir. Bu mesafede nişan aldığınız noktada mermi hedef hattına gelir.',
    whyItMatters:
      'Sıfırlama mesafesi, namlu açısını ve yakın–orta menzil düşüş tablosunu belirler. Yanlış zero, tüm menzilleri kaydırır.',
  },
  {
    termKey: 'moaMrad',
    termEn: 'MOA / MRAD',
    termTr: 'Açısal Ölçü Birimi',
    definition:
      'Düşüş ve rüzgar sapmasını açı cinsinden ifade eden birimlerdir. MOA (dakika açı) ve MRAD (miliradyan) optiklerde en yaygın ikisidir.',
    whyItMatters:
      'Tablodaki açı değerleri, optiğinizde kaç tık ayar yapacağınızı anlamanızı sağlar. MOA ve MRAD birbirine çevrilemez karıştırılmamalıdır.',
  },
  {
    termKey: 'clickValue',
    termEn: 'Click Value',
    termTr: 'Tık Değeri',
    definition:
      'Optik kadranında bir tık (click) çevirdiğinizde nişangahın kaç MOA veya MRAD kaydığını gösterir. Örneğin 0,25 MOA/tık.',
    whyItMatters:
      'Hesaplanan düzeltmeyi sahada hızlıca optiğe aktarmak için gereklidir. Tık değeri bilinmezse tablo pratikte kullanılamaz.',
  },
  {
    termKey: 'ffpSfp',
    termEn: 'FFP / SFP',
    termTr: 'Ön / Arka Odak Düzlemi',
    definition:
      'FFP (First Focal Plane): reticle büyütme ile birlikte ölçeklenir. SFP (Second Focal Plane): reticle sabit kalır, sadece hedef büyür.',
    whyItMatters:
      'Hangi planda olduğunuz, büyütme değişince mil-dot veya MOA reticle ile anlık nişan düzeltmesini etkiler.',
  },
  {
    termKey: 'reticleType',
    termEn: 'Reticle Type',
    termTr: 'Nişangah Tipi',
    definition:
      'Optik içindeki nişangah desenidir: mil-dot, BDC, MOA tabanlı, Christmas tree vb. Her desen farklı mesafe ve rüzgar okuması sunar.',
    whyItMatters:
      'Profilde reticle tipi, hangi düzeltme yöntemini kullanacağınızı ve tablo birimleriyle uyumu hatırlatır.',
  },
  {
    termKey: 'coriolis',
    termEn: 'Coriolis Effect',
    termTr: 'Coriolis Etkisi (Dünya Dönüşü Sapması)',
    definition:
      'Dünya\'nın dönüşü nedeniyle çok uzun menzillerde merminin hafif yatay ve dikey sapmasıdır. En çok 800 m üzeri ve yüksek enlemde hissedilir.',
    whyItMatters:
      'Elit ve uzun menzil atışlarında birkaç santimetrelik ek sapma üretir. Kapalıyken orta menzil pratik atışları etkilemez.',
  },
  {
    termKey: 'airDensity',
    termEn: 'Air Density (Altitude / Pressure / Humidity)',
    termTr: 'Hava Yoğunluğu Etkisi',
    definition:
      'Sıcaklık, basınç, nem ve rakım havanın yoğunluğunu değiştirir. Yoğun hava mermiyi daha çabuk yavaşlatır.',
    whyItMatters:
      'Aynı mermi yazın dağda da düz ovada da farklı düşer. Gerçek atmosfer girilmezse tablo o günkü koşullara uymaz.',
  },
  {
    termKey: 'crosswind',
    termEn: 'Crosswind Component',
    termTr: 'Rüzgar Dik Bileşeni',
    definition:
      'Rüzgarın mermi yoluna tam dik etkisini gösteren bileşendir. Tam yan rüzgar (90°) en büyük sapmayı üretir.',
    whyItMatters:
      'Yatay rüzgar sapması hesabının temel girdisidir. Hız ve yön yanlışsa windage sütunu güvenilmez olur.',
  },
  {
    termKey: 'pressureType',
    termEn: 'Station vs Sea-Level Pressure',
    termTr: 'İstasyon / Deniz Seviyesi Basıncı',
    definition:
      'İstasyon basıncı: o an bulunduğunuz yerde barometrenin gösterdiği gerçek basınçtır. Deniz seviyesi basıncı (QNH): rakıma göre düzeltilmiş referans basıncıdır.',
    whyItMatters:
      'Yanlış mod seçilirse hava yoğunluğu iki kez veya eksik hesaplanır; menzil ve düşüş ciddi sapar. Dağ/atış sahasında genelde istasyon basıncı kullanılır.',
  },
  {
    termKey: 'launchAngle',
    termEn: 'Launch Angle',
    termTr: 'Namlu Açısı',
    definition:
      'Namlunun yatay çizgiye göre yukarı eğim açısıdır. Sıfırlama mesafesine göre otomatik hesaplanır.',
    whyItMatters:
      'Merminin yörüngesini belirleyen temel açıdır. Optik sıfırlandığında motor bu açıyı arka planda kullanır.',
  },
  {
    termKey: 'timeOfFlight',
    termEn: 'Time of Flight (TOF)',
    termTr: 'Uçuş Süresi',
    definition:
      'Merminin namludan çıkıp hedef menzile ulaşana kadar geçen süredir. Saniye cinsinden gösterilir.',
    whyItMatters:
      'Rüzgar sapması ve hareketli hedef önceliği (lead) hesaplarında süre ne kadar uzunsa etki o kadar büyür.',
  },
  {
    termKey: 'remainingEnergy',
    termEn: 'Remaining Energy',
    termTr: 'Kalan Enerji',
    definition:
      'Merminin hedef menzilde taşıdığı kinetik enerjidir. Genellikle ft·lb veya joule olarak verilir.',
    whyItMatters:
      'Av veya etkisiz hale getirme değerlendirmesinde merminin o mesafede ne kadar “gücü” kaldığını gösterir.',
  },
  {
    termKey: 'machNumber',
    termEn: 'Mach Number',
    termTr: 'Mach Sayısı',
    definition:
      'Mermi hızının o andaki ses hızına oranıdır. Mach 1 ses hızı, üzeri süpersonik, altı subsöniktir.',
    whyItMatters:
      'Hava direnci ses hızı civarında ani değişir. Mach değeri, merminin hangi hız rejiminde uçtuğunu anlamanızı sağlar.',
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
