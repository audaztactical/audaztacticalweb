/**
 * Türkiye il / ilçe koordinatları — hava durumu sorguları için.
 * Her ilde en az "Merkez"; büyük şehirlerde ek ilçeler.
 */

/** @typedef {{ name: string, lat: number, lon: number }} District */
/** @typedef {{ id: string, name: string, lat: number, lon: number, coastal: boolean, districts: District[] }} Province */

/** @type {Province[]} */
export const TURKEY_PROVINCES = [
  { id: '01', name: 'Adana', lat: 37.0, lon: 35.3213, coastal: true, districts: [{ name: 'Merkez', lat: 37.0, lon: 35.3213 }, { name: 'Seyhan', lat: 36.9914, lon: 35.3308 }, { name: 'Yüreğir', lat: 36.9742, lon: 35.3592 }] },
  { id: '02', name: 'Adıyaman', lat: 37.7648, lon: 38.2786, coastal: false, districts: [{ name: 'Merkez', lat: 37.7648, lon: 38.2786 }] },
  { id: '03', name: 'Afyonkarahisar', lat: 38.7507, lon: 30.5567, coastal: false, districts: [{ name: 'Merkez', lat: 38.7507, lon: 30.5567 }] },
  { id: '04', name: 'Ağrı', lat: 39.7191, lon: 43.0503, coastal: false, districts: [{ name: 'Merkez', lat: 39.7191, lon: 43.0503 }] },
  { id: '05', name: 'Amasya', lat: 40.6499, lon: 35.8353, coastal: false, districts: [{ name: 'Merkez', lat: 40.6499, lon: 35.8353 }] },
  { id: '06', name: 'Ankara', lat: 39.9334, lon: 32.8597, coastal: false, districts: [{ name: 'Merkez', lat: 39.9334, lon: 32.8597 }, { name: 'Çankaya', lat: 39.9208, lon: 32.8541 }, { name: 'Keçiören', lat: 39.976, lon: 32.864 }, { name: 'Yenimahalle', lat: 39.965, lon: 32.7895 }, { name: 'Etimesgut', lat: 39.948, lon: 32.675 }] },
  { id: '07', name: 'Antalya', lat: 36.8969, lon: 30.7133, coastal: true, districts: [{ name: 'Merkez', lat: 36.8969, lon: 30.7133 }, { name: 'Muratpaşa', lat: 36.8841, lon: 30.7056 }, { name: 'Alanya', lat: 36.5444, lon: 31.9954 }, { name: 'Kemer', lat: 36.5971, lon: 30.5604 }] },
  { id: '08', name: 'Artvin', lat: 41.1828, lon: 41.8183, coastal: true, districts: [{ name: 'Merkez', lat: 41.1828, lon: 41.8183 }] },
  { id: '09', name: 'Aydın', lat: 37.856, lon: 27.8416, coastal: true, districts: [{ name: 'Merkez', lat: 37.856, lon: 27.8416 }, { name: 'Kuşadası', lat: 37.8575, lon: 27.2612 }] },
  { id: '10', name: 'Balıkesir', lat: 39.6484, lon: 27.8826, coastal: true, districts: [{ name: 'Merkez', lat: 39.6484, lon: 27.8826 }, { name: 'Bandırma', lat: 40.352, lon: 27.9767 }] },
  { id: '11', name: 'Bilecik', lat: 40.142, lon: 29.9793, coastal: false, districts: [{ name: 'Merkez', lat: 40.142, lon: 29.9793 }] },
  { id: '12', name: 'Bingöl', lat: 38.8855, lon: 40.4966, coastal: false, districts: [{ name: 'Merkez', lat: 38.8855, lon: 40.4966 }] },
  { id: '13', name: 'Bitlis', lat: 38.4006, lon: 42.1095, coastal: false, districts: [{ name: 'Merkez', lat: 38.4006, lon: 42.1095 }] },
  { id: '14', name: 'Bolu', lat: 40.735, lon: 31.6061, coastal: false, districts: [{ name: 'Merkez', lat: 40.735, lon: 31.6061 }] },
  { id: '15', name: 'Burdur', lat: 37.7203, lon: 30.2908, coastal: false, districts: [{ name: 'Merkez', lat: 37.7203, lon: 30.2908 }] },
  { id: '16', name: 'Bursa', lat: 40.1885, lon: 29.061, coastal: true, districts: [{ name: 'Merkez', lat: 40.1885, lon: 29.061 }, { name: 'Nilüfer', lat: 40.21, lon: 28.99 }, { name: 'Osmangazi', lat: 40.195, lon: 29.06 }, { name: 'Mudanya', lat: 40.375, lon: 28.882 }] },
  { id: '17', name: 'Çanakkale', lat: 40.1553, lon: 26.4142, coastal: true, districts: [{ name: 'Merkez', lat: 40.1553, lon: 26.4142 }, { name: 'Gelibolu', lat: 40.41, lon: 26.67 }] },
  { id: '18', name: 'Çankırı', lat: 40.6013, lon: 33.6134, coastal: false, districts: [{ name: 'Merkez', lat: 40.6013, lon: 33.6134 }] },
  { id: '19', name: 'Çorum', lat: 40.5506, lon: 34.9556, coastal: false, districts: [{ name: 'Merkez', lat: 40.5506, lon: 34.9556 }] },
  { id: '20', name: 'Denizli', lat: 37.7765, lon: 29.0864, coastal: false, districts: [{ name: 'Merkez', lat: 37.7765, lon: 29.0864 }] },
  { id: '21', name: 'Diyarbakır', lat: 37.9144, lon: 40.2306, coastal: false, districts: [{ name: 'Merkez', lat: 37.9144, lon: 40.2306 }] },
  { id: '22', name: 'Edirne', lat: 41.6771, lon: 26.5557, coastal: false, districts: [{ name: 'Merkez', lat: 41.6771, lon: 26.5557 }] },
  { id: '23', name: 'Elazığ', lat: 38.681, lon: 39.2264, coastal: false, districts: [{ name: 'Merkez', lat: 38.681, lon: 39.2264 }] },
  { id: '24', name: 'Erzincan', lat: 39.75, lon: 39.5, coastal: false, districts: [{ name: 'Merkez', lat: 39.75, lon: 39.5 }] },
  { id: '25', name: 'Erzurum', lat: 39.9043, lon: 41.2679, coastal: false, districts: [{ name: 'Merkez', lat: 39.9043, lon: 41.2679 }] },
  { id: '26', name: 'Eskişehir', lat: 39.7767, lon: 30.5206, coastal: false, districts: [{ name: 'Merkez', lat: 39.7767, lon: 30.5206 }] },
  { id: '27', name: 'Gaziantep', lat: 37.0662, lon: 37.3833, coastal: false, districts: [{ name: 'Merkez', lat: 37.0662, lon: 37.3833 }] },
  { id: '28', name: 'Giresun', lat: 40.9128, lon: 38.3895, coastal: true, districts: [{ name: 'Merkez', lat: 40.9128, lon: 38.3895 }] },
  { id: '29', name: 'Gümüşhane', lat: 40.4603, lon: 39.4814, coastal: false, districts: [{ name: 'Merkez', lat: 40.4603, lon: 39.4814 }] },
  { id: '30', name: 'Hakkari', lat: 37.5744, lon: 43.7408, coastal: false, districts: [{ name: 'Merkez', lat: 37.5744, lon: 43.7408 }] },
  { id: '31', name: 'Hatay', lat: 36.4018, lon: 36.3498, coastal: true, districts: [{ name: 'Merkez', lat: 36.4018, lon: 36.3498 }, { name: 'İskenderun', lat: 36.5872, lon: 36.1733 }] },
  { id: '32', name: 'Isparta', lat: 37.7648, lon: 30.5566, coastal: false, districts: [{ name: 'Merkez', lat: 37.7648, lon: 30.5566 }] },
  { id: '33', name: 'Mersin', lat: 36.8, lon: 34.6333, coastal: true, districts: [{ name: 'Merkez', lat: 36.8, lon: 34.6333 }, { name: 'Tarsus', lat: 36.9175, lon: 34.8925 }] },
  { id: '34', name: 'İstanbul', lat: 41.0082, lon: 28.9784, coastal: true, districts: [{ name: 'Merkez', lat: 41.0082, lon: 28.9784 }, { name: 'Kadıköy', lat: 40.9927, lon: 29.0277 }, { name: 'Beşiktaş', lat: 41.0422, lon: 29.0067 }, { name: 'Üsküdar', lat: 41.0225, lon: 29.015 }, { name: 'Şişli', lat: 41.0602, lon: 28.9877 }, { name: 'Bakırköy', lat: 40.978, lon: 28.874 }] },
  { id: '35', name: 'İzmir', lat: 38.4237, lon: 27.1428, coastal: true, districts: [{ name: 'Merkez', lat: 38.4237, lon: 27.1428 }, { name: 'Konak', lat: 38.4192, lon: 27.1287 }, { name: 'Bornova', lat: 38.4622, lon: 27.2208 }, { name: 'Karşıyaka', lat: 38.4595, lon: 27.105 }] },
  { id: '36', name: 'Kars', lat: 40.6013, lon: 43.0975, coastal: false, districts: [{ name: 'Merkez', lat: 40.6013, lon: 43.0975 }] },
  { id: '37', name: 'Kastamonu', lat: 41.3887, lon: 33.7827, coastal: true, districts: [{ name: 'Merkez', lat: 41.3887, lon: 33.7827 }] },
  { id: '38', name: 'Kayseri', lat: 38.7312, lon: 35.4787, coastal: false, districts: [{ name: 'Merkez', lat: 38.7312, lon: 35.4787 }] },
  { id: '39', name: 'Kırklareli', lat: 41.7333, lon: 27.2167, coastal: false, districts: [{ name: 'Merkez', lat: 41.7333, lon: 27.2167 }] },
  { id: '40', name: 'Kırşehir', lat: 39.1425, lon: 34.1709, coastal: false, districts: [{ name: 'Merkez', lat: 39.1425, lon: 34.1709 }] },
  { id: '41', name: 'Kocaeli', lat: 40.765, lon: 29.9408, coastal: true, districts: [{ name: 'Merkez', lat: 40.765, lon: 29.9408 }, { name: 'İzmit', lat: 40.765, lon: 29.9408 }, { name: 'Gebze', lat: 40.8027, lon: 29.4306 }] },
  { id: '42', name: 'Konya', lat: 37.8746, lon: 32.4932, coastal: false, districts: [{ name: 'Merkez', lat: 37.8746, lon: 32.4932 }] },
  { id: '43', name: 'Kütahya', lat: 39.4167, lon: 29.9833, coastal: false, districts: [{ name: 'Merkez', lat: 39.4167, lon: 29.9833 }] },
  { id: '44', name: 'Malatya', lat: 38.3552, lon: 38.3095, coastal: false, districts: [{ name: 'Merkez', lat: 38.3552, lon: 38.3095 }] },
  { id: '45', name: 'Manisa', lat: 38.6191, lon: 27.4289, coastal: false, districts: [{ name: 'Merkez', lat: 38.6191, lon: 27.4289 }] },
  { id: '46', name: 'Kahramanmaraş', lat: 37.5858, lon: 36.9371, coastal: false, districts: [{ name: 'Merkez', lat: 37.5858, lon: 36.9371 }] },
  { id: '47', name: 'Mardin', lat: 37.3212, lon: 40.7245, coastal: false, districts: [{ name: 'Merkez', lat: 37.3212, lon: 40.7245 }] },
  { id: '48', name: 'Muğla', lat: 37.2153, lon: 28.3636, coastal: true, districts: [{ name: 'Merkez', lat: 37.2153, lon: 28.3636 }, { name: 'Bodrum', lat: 37.0344, lon: 27.4305 }, { name: 'Marmaris', lat: 36.855, lon: 28.2742 }] },
  { id: '49', name: 'Muş', lat: 38.7432, lon: 41.5065, coastal: false, districts: [{ name: 'Merkez', lat: 38.7432, lon: 41.5065 }] },
  { id: '50', name: 'Nevşehir', lat: 38.6939, lon: 34.6857, coastal: false, districts: [{ name: 'Merkez', lat: 38.6939, lon: 34.6857 }] },
  { id: '51', name: 'Niğde', lat: 37.9667, lon: 34.6833, coastal: false, districts: [{ name: 'Merkez', lat: 37.9667, lon: 34.6833 }] },
  { id: '52', name: 'Ordu', lat: 40.9839, lon: 37.8764, coastal: true, districts: [{ name: 'Merkez', lat: 40.9839, lon: 37.8764 }] },
  { id: '53', name: 'Rize', lat: 41.0201, lon: 40.5234, coastal: true, districts: [{ name: 'Merkez', lat: 41.0201, lon: 40.5234 }] },
  { id: '54', name: 'Sakarya', lat: 40.7569, lon: 30.3781, coastal: true, districts: [{ name: 'Merkez', lat: 40.7569, lon: 30.3781 }, { name: 'Adapazarı', lat: 40.7569, lon: 30.3781 }] },
  { id: '55', name: 'Samsun', lat: 41.2867, lon: 36.33, coastal: true, districts: [{ name: 'Merkez', lat: 41.2867, lon: 36.33 }] },
  { id: '56', name: 'Siirt', lat: 37.9333, lon: 41.95, coastal: false, districts: [{ name: 'Merkez', lat: 37.9333, lon: 41.95 }] },
  { id: '57', name: 'Sinop', lat: 42.0267, lon: 35.1551, coastal: true, districts: [{ name: 'Merkez', lat: 42.0267, lon: 35.1551 }] },
  { id: '58', name: 'Sivas', lat: 39.7477, lon: 37.0179, coastal: false, districts: [{ name: 'Merkez', lat: 39.7477, lon: 37.0179 }] },
  { id: '59', name: 'Tekirdağ', lat: 40.9833, lon: 27.5167, coastal: true, districts: [{ name: 'Merkez', lat: 40.9833, lon: 27.5167 }] },
  { id: '60', name: 'Tokat', lat: 40.3167, lon: 36.55, coastal: false, districts: [{ name: 'Merkez', lat: 40.3167, lon: 36.55 }] },
  { id: '61', name: 'Trabzon', lat: 41.0015, lon: 39.7178, coastal: true, districts: [{ name: 'Merkez', lat: 41.0015, lon: 39.7178 }] },
  { id: '62', name: 'Tunceli', lat: 39.1079, lon: 39.5401, coastal: false, districts: [{ name: 'Merkez', lat: 39.1079, lon: 39.5401 }] },
  { id: '63', name: 'Şanlıurfa', lat: 37.1591, lon: 38.7969, coastal: false, districts: [{ name: 'Merkez', lat: 37.1591, lon: 38.7969 }] },
  { id: '64', name: 'Uşak', lat: 38.6823, lon: 29.4082, coastal: false, districts: [{ name: 'Merkez', lat: 38.6823, lon: 29.4082 }] },
  { id: '65', name: 'Van', lat: 38.4891, lon: 43.4089, coastal: false, districts: [{ name: 'Merkez', lat: 38.4891, lon: 43.4089 }] },
  { id: '66', name: 'Yozgat', lat: 39.8181, lon: 34.8147, coastal: false, districts: [{ name: 'Merkez', lat: 39.8181, lon: 34.8147 }] },
  { id: '67', name: 'Zonguldak', lat: 41.4564, lon: 31.7987, coastal: true, districts: [{ name: 'Merkez', lat: 41.4564, lon: 31.7987 }] },
  { id: '68', name: 'Aksaray', lat: 38.3687, lon: 34.037, coastal: false, districts: [{ name: 'Merkez', lat: 38.3687, lon: 34.037 }] },
  { id: '69', name: 'Bayburt', lat: 40.2552, lon: 40.2249, coastal: false, districts: [{ name: 'Merkez', lat: 40.2552, lon: 40.2249 }] },
  { id: '70', name: 'Karaman', lat: 37.1759, lon: 33.2287, coastal: false, districts: [{ name: 'Merkez', lat: 37.1759, lon: 33.2287 }] },
  { id: '71', name: 'Kırıkkale', lat: 39.8468, lon: 33.5153, coastal: false, districts: [{ name: 'Merkez', lat: 39.8468, lon: 33.5153 }] },
  { id: '72', name: 'Batman', lat: 37.8812, lon: 41.1351, coastal: false, districts: [{ name: 'Merkez', lat: 37.8812, lon: 41.1351 }] },
  { id: '73', name: 'Şırnak', lat: 37.5164, lon: 42.4611, coastal: false, districts: [{ name: 'Merkez', lat: 37.5164, lon: 42.4611 }] },
  { id: '74', name: 'Bartın', lat: 41.6344, lon: 32.3375, coastal: true, districts: [{ name: 'Merkez', lat: 41.6344, lon: 32.3375 }] },
  { id: '75', name: 'Ardahan', lat: 41.1105, lon: 42.7022, coastal: false, districts: [{ name: 'Merkez', lat: 41.1105, lon: 42.7022 }] },
  { id: '76', name: 'Iğdır', lat: 39.9167, lon: 44.0333, coastal: false, districts: [{ name: 'Merkez', lat: 39.9167, lon: 44.0333 }] },
  { id: '77', name: 'Yalova', lat: 40.65, lon: 29.2667, coastal: true, districts: [{ name: 'Merkez', lat: 40.65, lon: 29.2667 }] },
  { id: '78', name: 'Karabük', lat: 41.2061, lon: 32.6204, coastal: false, districts: [{ name: 'Merkez', lat: 41.2061, lon: 32.6204 }] },
  { id: '79', name: 'Kilis', lat: 36.7161, lon: 37.115, coastal: false, districts: [{ name: 'Merkez', lat: 36.7161, lon: 37.115 }] },
  { id: '80', name: 'Osmaniye', lat: 37.0742, lon: 36.2478, coastal: false, districts: [{ name: 'Merkez', lat: 37.0742, lon: 36.2478 }] },
  { id: '81', name: 'Düzce', lat: 40.8438, lon: 31.1565, coastal: false, districts: [{ name: 'Merkez', lat: 40.8438, lon: 31.1565 }] },
]

export const DEFAULT_PROVINCE_ID = '34'
export const DEFAULT_DISTRICT_NAME = 'Merkez'

/** @param {string} provinceId */
export function getProvinceById(provinceId) {
  return TURKEY_PROVINCES.find((p) => p.id === provinceId) ?? TURKEY_PROVINCES[0]
}

/**
 * @param {string} provinceId
 * @param {string} districtName
 */
export function resolveLocation(provinceId, districtName) {
  const province = getProvinceById(provinceId)
  const district = province.districts.find((d) => d.name === districtName) ?? province.districts[0]
  return {
    province,
    district,
    label: `${province.name} / ${district.name}`,
    lat: district.lat,
    lon: district.lon,
    coastal: province.coastal,
  }
}

/** @param {number} lat1 @param {number} lon1 @param {number} lat2 @param {number} lon2 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * GPS koordinatına en yakın il / ilçe eşlemesi.
 * @param {number} lat
 * @param {number} lon
 */
export function findNearestTurkeyLocation(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  let best = /** @type {{ provinceId: string, districtName: string, distanceKm: number } | null} */ (null)
  let bestDist = Infinity

  for (const province of TURKEY_PROVINCES) {
    for (const district of province.districts) {
      const dist = haversineKm(lat, lon, district.lat, district.lon)
      if (dist < bestDist) {
        bestDist = dist
        best = {
          provinceId: province.id,
          districtName: district.name,
          distanceKm: Math.round(dist * 10) / 10,
        }
      }
    }
  }

  return best
}
