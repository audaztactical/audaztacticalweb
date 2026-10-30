/**
 * NÖRO metinleri — prototipten (üç ton: e/s/k).
 */

import { REGIONS } from '../../../lib/neural/neuralConfig'

/** @typedef {'e'|'s'|'k'} NoroTone */

/**
 * @param {NoroTone} tone
 * @param {string} e
 * @param {string} s
 * @param {string} k
 */
export function V(tone, e, s, k) {
  if (tone === 's') return s
  if (tone === 'k') return k
  return e
}

/** @param {string[]} a */
export function pick(a) {
  return a[Math.floor(Math.random() * a.length)]
}

/**
 * @param {string} id
 */
export function regionName(id) {
  return REGIONS[/** @type {keyof typeof REGIONS} */ (id)]?.nameTr ?? id
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

/** Bölge → kısa aktivite adı (öneri satırları) */
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
 * @param {string} id
 * @param {number} g
 * @param {NoroTone} tone
 */
export function lineForRegion(id, g, tone) {
  const n = regionName(id)
  const plus = `+${Math.round(g)}`
  const lines = {
    frontal: [
      `Görev kapandı, AAR yazıldı. ${n} ${plus}. Kararlarını yazıya dökmek, bir sonrakini daha hızlı vermeni sağlar.`,
      `Plan, icra, değerlendirme... ${n} şu an satranç oynuyor. ${plus}`,
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
      `Kanama kontrolü, hava yolu, tahliye... ${n} ${plus}. Önce yaşat, sonra savaş.`,
    ],
  }
  const e = pick(lines[/** @type {keyof typeof lines} */ (id)] || [`Kayıt işlendi. ${n} ${plus}.`])
  const s = `Kayıt kaydedildi: ${n} ${plus}.`
  const k = `Kayıt işlendi. ${n} ${plus}.`
  return V(tone, e, s, k)
}

/**
 * @param {number} s
 * @param {NoroTone} tone
 */
export function scoreLine(s, tone) {
  const n = Math.round(s)
  if (n >= 90) {
    return V(
      tone,
      pick([`Skor %${n}. Hedef kâğıdı istifa dilekçesi yazıyor.`, `%${n}! Bu gruplamayla bozuk paranın deliğinden geçersin.`]),
      `Skor %${n}.`,
      `Skor %${n}. Standardı koru.`,
    )
  }
  if (n >= 75) {
    return V(
      tone,
      pick([
        `Skor %${n}, temiz iş. Tetik düşüşünü biraz yumuşatırsan 90'ın kapısı açık.`,
        `%${n} gayet iyi. Nefes kontrolü ve sakin tetik, bir sonraki basamak.`,
      ]),
      `Skor %${n}.`,
      `Skor %${n}. Hedef 90. Tetik kontrolüne odaklan.`,
    )
  }
  return V(
    tone,
    pick([
      `Skor %${n}. Olur böyle günler; tutuşu ve nefesi bir kontrol et, mermiyi suçlamak yok.`,
      `%${n}... Hedef bugün kaçak dövüştü. On dakika kuru tetik ısınması, sonra rövanş.`,
    ]),
    `Skor %${n}.`,
    `Skor %${n}. Kabul edilemez. Temele dön: tutuş, nefes, tetik.`,
  )
}

export const WELCOME = Object.freeze({
  e: 'Selam operatör, ben NÖRO. Beynindeki her kıvrımın muhasebesi bende. Sen kayıt gir, ben neyin büyüdüğünü, neyin tozlandığını anlatayım. Laf sokarken bile kibar olacağıma söz.',
  s: 'Merhaba. Ben NÖRO, Operatör Beyni asistanıyım. Kayıtların bölgelere puan yazar; ben durumu özetlerim.',
  k: 'NÖRO. Operatör Beyni asistanı. Kayıt gir. Ben raporlarım.',
})

export const EMPTY_USER = Object.freeze({
  e: 'Henüz kayıt yok kanka. Beyin uykuda. Antrenmana git, ilk kıvılcımı çak.',
  s: 'Henüz kayıt yok. Antrenman veya timer ile başla.',
  k: 'Kayıt yok. Antrenmana git. Başla.',
})
