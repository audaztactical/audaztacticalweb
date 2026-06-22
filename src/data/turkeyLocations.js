/**
 * Türkiye il / ilçe koordinatları — otomatik üretilmiş veri dosyası.
 * Üretim: scripts/build-turkey-locations.mjs
 * İl/ilçe adları: TurkiyeAPI 2025 (https://github.com/ubeydeozdmr/turkiye-api) — 81 il, 973 ilçe
 * İlçe koordinatları: Open-Meteo Geocoding API (https://open-meteo.com/en/docs/geocoding-api)
 * coastal: TurkiyeAPI isCoastal (28 kıyı ili)
 * Yeniden üretmek için: node scripts/build-turkey-locations.mjs
 */

/** @typedef {{ name: string, lat: number, lon: number }} District */
/** @typedef {{ id: string, name: string, lat: number, lon: number, coastal: boolean, districts: District[] }} Province */

/** @type {Province[]} */
export const TURKEY_PROVINCES = [
  {
    "id": "01",
    "name": "Adana",
    "lat": 36.98636,
    "lon": 35.325286,
    "coastal": true,
    "districts": [
      {
        "name": "Aladağ",
        "lat": 37.5485,
        "lon": 35.39603
      },
      {
        "name": "Ceyhan",
        "lat": 37.02472,
        "lon": 35.8175
      },
      {
        "name": "Çukurova",
        "lat": 36.9863599,
        "lon": 35.3252861
      },
      {
        "name": "Feke",
        "lat": 37.81446,
        "lon": 35.91233
      },
      {
        "name": "İmamoğlu",
        "lat": 37.26506,
        "lon": 35.65717
      },
      {
        "name": "Karaisalı",
        "lat": 37.25667,
        "lon": 35.05889
      },
      {
        "name": "Karataş",
        "lat": 36.56357,
        "lon": 35.38207
      },
      {
        "name": "Kozan",
        "lat": 37.45517,
        "lon": 35.81573
      },
      {
        "name": "Pozantı",
        "lat": 37.42778,
        "lon": 34.87167
      },
      {
        "name": "Saimbeyli",
        "lat": 37.98632,
        "lon": 36.09056
      },
      {
        "name": "Sarıçam",
        "lat": 37.15172,
        "lon": 35.50769
      },
      {
        "name": "Seyhan",
        "lat": 36.98747,
        "lon": 35.30592
      },
      {
        "name": "Tufanbeyli",
        "lat": 38.26333,
        "lon": 36.22056
      },
      {
        "name": "Yumurtalık",
        "lat": 36.76863,
        "lon": 35.78938
      },
      {
        "name": "Yüreğir",
        "lat": 36.97439,
        "lon": 35.35916
      }
    ]
  },
  {
    "id": "02",
    "name": "Adıyaman",
    "lat": 37.760299,
    "lon": 38.277299,
    "coastal": false,
    "districts": [
      {
        "name": "Besni",
        "lat": 37.69278,
        "lon": 37.86111
      },
      {
        "name": "Çelikhan",
        "lat": 38.0256,
        "lon": 38.23665
      },
      {
        "name": "Gerger",
        "lat": 38.02807,
        "lon": 39.03418
      },
      {
        "name": "Gölbaşı",
        "lat": 37.78361,
        "lon": 37.63667
      },
      {
        "name": "Kahta",
        "lat": 37.78552,
        "lon": 38.6237
      },
      {
        "name": "Merkez",
        "lat": 37.7602985,
        "lon": 38.2772986
      },
      {
        "name": "Samsat",
        "lat": 37.58194,
        "lon": 38.47417
      },
      {
        "name": "Sincik",
        "lat": 38.03645,
        "lon": 38.61257
      },
      {
        "name": "Tut",
        "lat": 37.79529,
        "lon": 37.9161
      }
    ]
  },
  {
    "id": "03",
    "name": "Afyonkarahisar",
    "lat": 38.75686,
    "lon": 30.538704,
    "coastal": false,
    "districts": [
      {
        "name": "Başmakçı",
        "lat": 37.89722,
        "lon": 30.01167
      },
      {
        "name": "Bayat",
        "lat": 38.98306,
        "lon": 30.92472
      },
      {
        "name": "Bolvadin",
        "lat": 38.71111,
        "lon": 31.04861
      },
      {
        "name": "Çay",
        "lat": 38.59167,
        "lon": 31.02861
      },
      {
        "name": "Çobanlar",
        "lat": 38.70139,
        "lon": 30.78278
      },
      {
        "name": "Dazkırı",
        "lat": 37.91861,
        "lon": 29.86056
      },
      {
        "name": "Dinar",
        "lat": 38.065,
        "lon": 30.16557
      },
      {
        "name": "Emirdağ",
        "lat": 39.01972,
        "lon": 31.15
      },
      {
        "name": "Evciler",
        "lat": 38.04139,
        "lon": 29.88667
      },
      {
        "name": "Hocalar",
        "lat": 38.57824,
        "lon": 29.96768
      },
      {
        "name": "İhsaniye",
        "lat": 39.02916,
        "lon": 30.41639
      },
      {
        "name": "İscehisar",
        "lat": 38.86194,
        "lon": 30.75028
      },
      {
        "name": "Kızılören",
        "lat": 38.25806,
        "lon": 30.15167
      },
      {
        "name": "Merkez",
        "lat": 38.7568597,
        "lon": 30.5387044
      },
      {
        "name": "Sandıklı",
        "lat": 38.46472,
        "lon": 30.26946
      },
      {
        "name": "Sinanpaşa",
        "lat": 38.74444,
        "lon": 30.24278
      },
      {
        "name": "Sultandağı",
        "lat": 38.53111,
        "lon": 31.22806
      },
      {
        "name": "Şuhut",
        "lat": 38.53111,
        "lon": 30.54583
      }
    ]
  },
  {
    "id": "04",
    "name": "Ağrı",
    "lat": 39.719125,
    "lon": 43.050489,
    "coastal": false,
    "districts": [
      {
        "name": "Diyadin",
        "lat": 39.54056,
        "lon": 43.67135
      },
      {
        "name": "Doğubayazıt",
        "lat": 39.54694,
        "lon": 44.08417
      },
      {
        "name": "Eleşkirt",
        "lat": 39.79803,
        "lon": 42.67574
      },
      {
        "name": "Hamur",
        "lat": 39.60561,
        "lon": 42.985
      },
      {
        "name": "Merkez",
        "lat": 39.719125,
        "lon": 43.0504894
      },
      {
        "name": "Patnos",
        "lat": 39.22493,
        "lon": 42.85693
      },
      {
        "name": "Taşlıçay",
        "lat": 39.62966,
        "lon": 43.36878
      },
      {
        "name": "Tutak",
        "lat": 39.53854,
        "lon": 42.76587
      }
    ]
  },
  {
    "id": "05",
    "name": "Amasya",
    "lat": 40.650325,
    "lon": 35.832915,
    "coastal": false,
    "districts": [
      {
        "name": "Göynücek",
        "lat": 40.39917,
        "lon": 35.525
      },
      {
        "name": "Gümüşhacıköy",
        "lat": 40.87306,
        "lon": 35.21472
      },
      {
        "name": "Hamamözü",
        "lat": 40.78476,
        "lon": 35.0258
      },
      {
        "name": "Merkez",
        "lat": 40.6503248,
        "lon": 35.8329148
      },
      {
        "name": "Merzifon",
        "lat": 40.87333,
        "lon": 35.46306
      },
      {
        "name": "Suluova",
        "lat": 40.83129,
        "lon": 35.64788
      },
      {
        "name": "Taşova",
        "lat": 40.75972,
        "lon": 36.3225
      }
    ]
  },
  {
    "id": "06",
    "name": "Ankara",
    "lat": 39.920776,
    "lon": 32.85405,
    "coastal": false,
    "districts": [
      {
        "name": "Akyurt",
        "lat": 40.13512,
        "lon": 33.08614
      },
      {
        "name": "Altındağ",
        "lat": 39.96673,
        "lon": 32.92254
      },
      {
        "name": "Ayaş",
        "lat": 40.01933,
        "lon": 32.33221
      },
      {
        "name": "Bala",
        "lat": 39.55422,
        "lon": 33.12344
      },
      {
        "name": "Beypazarı",
        "lat": 40.1675,
        "lon": 31.92111
      },
      {
        "name": "Çamlıdere",
        "lat": 40.48958,
        "lon": 32.47499
      },
      {
        "name": "Çankaya",
        "lat": 39.9179,
        "lon": 32.86268
      },
      {
        "name": "Çubuk",
        "lat": 40.23861,
        "lon": 33.03222
      },
      {
        "name": "Elmadağ",
        "lat": 39.92083,
        "lon": 33.23083
      },
      {
        "name": "Etimesgut",
        "lat": 39.95328,
        "lon": 32.63285
      },
      {
        "name": "Evren",
        "lat": 39.02402,
        "lon": 33.80626
      },
      {
        "name": "Gölbaşı",
        "lat": 39.79043,
        "lon": 32.80903
      },
      {
        "name": "Güdül",
        "lat": 40.21051,
        "lon": 32.24552
      },
      {
        "name": "Haymana",
        "lat": 39.43212,
        "lon": 32.49732
      },
      {
        "name": "Kahramankazan",
        "lat": 39.9207759,
        "lon": 32.8540497
      },
      {
        "name": "Kalecik",
        "lat": 40.09722,
        "lon": 33.40833
      },
      {
        "name": "Keçiören",
        "lat": 40.00132,
        "lon": 32.87238
      },
      {
        "name": "Kızılcahamam",
        "lat": 40.46972,
        "lon": 32.65056
      },
      {
        "name": "Mamak",
        "lat": 39.94044,
        "lon": 32.91012
      },
      {
        "name": "Nallıhan",
        "lat": 40.18593,
        "lon": 31.35179
      },
      {
        "name": "Polatlı",
        "lat": 39.57715,
        "lon": 32.14132
      },
      {
        "name": "Pursaklar",
        "lat": 40.03203,
        "lon": 32.89528
      },
      {
        "name": "Sincan",
        "lat": 39.9723,
        "lon": 32.58414
      },
      {
        "name": "Şereflikoçhisar",
        "lat": 38.93925,
        "lon": 33.5386
      },
      {
        "name": "Yenimahalle",
        "lat": 39.97787,
        "lon": 32.80147
      }
    ]
  },
  {
    "id": "07",
    "name": "Antalya",
    "lat": 36.886573,
    "lon": 30.703024,
    "coastal": true,
    "districts": [
      {
        "name": "Akseki",
        "lat": 37.04861,
        "lon": 31.79
      },
      {
        "name": "Aksu",
        "lat": 36.94108,
        "lon": 30.82396
      },
      {
        "name": "Alanya",
        "lat": 36.54375,
        "lon": 31.99982
      },
      {
        "name": "Demre",
        "lat": 36.24444,
        "lon": 29.985
      },
      {
        "name": "Döşemealtı",
        "lat": 37.02333,
        "lon": 30.60247
      },
      {
        "name": "Elmalı",
        "lat": 36.73583,
        "lon": 29.91775
      },
      {
        "name": "Finike",
        "lat": 36.295,
        "lon": 30.14056
      },
      {
        "name": "Gazipaşa",
        "lat": 36.26942,
        "lon": 32.31792
      },
      {
        "name": "Gündoğmuş",
        "lat": 36.81339,
        "lon": 31.99971
      },
      {
        "name": "İbradı",
        "lat": 37.09694,
        "lon": 31.59917
      },
      {
        "name": "Kaş",
        "lat": 36.20176,
        "lon": 29.63766
      },
      {
        "name": "Kemer",
        "lat": 36.59778,
        "lon": 30.56056
      },
      {
        "name": "Kepez",
        "lat": 36.91579,
        "lon": 30.70782
      },
      {
        "name": "Konyaaltı",
        "lat": 36.86644,
        "lon": 30.63031
      },
      {
        "name": "Korkuteli",
        "lat": 37.06498,
        "lon": 30.19565
      },
      {
        "name": "Kumluca",
        "lat": 36.37028,
        "lon": 30.28694
      },
      {
        "name": "Manavgat",
        "lat": 36.78672,
        "lon": 31.44086
      },
      {
        "name": "Muratpaşa",
        "lat": 36.89157,
        "lon": 30.76498
      },
      {
        "name": "Serik",
        "lat": 36.91748,
        "lon": 31.10463
      }
    ]
  },
  {
    "id": "08",
    "name": "Artvin",
    "lat": 41.183081,
    "lon": 41.828745,
    "coastal": true,
    "districts": [
      {
        "name": "Ardanuç",
        "lat": 41.11955,
        "lon": 42.06882
      },
      {
        "name": "Arhavi",
        "lat": 41.35121,
        "lon": 41.30456
      },
      {
        "name": "Borçka",
        "lat": 41.35792,
        "lon": 41.66579
      },
      {
        "name": "Hopa",
        "lat": 41.39046,
        "lon": 41.41966
      },
      {
        "name": "Kemalpaşa",
        "lat": 41.48336,
        "lon": 41.5275
      },
      {
        "name": "Merkez",
        "lat": 41.1830811,
        "lon": 41.8287448
      },
      {
        "name": "Murgul",
        "lat": 41.28049,
        "lon": 41.56438
      },
      {
        "name": "Şavşat",
        "lat": 41.25336,
        "lon": 42.35531
      },
      {
        "name": "Yusufeli",
        "lat": 40.82042,
        "lon": 41.53743
      }
    ]
  },
  {
    "id": "09",
    "name": "Aydın",
    "lat": 37.848377,
    "lon": 27.843588,
    "coastal": true,
    "districts": [
      {
        "name": "Bozdoğan",
        "lat": 37.67134,
        "lon": 28.31395
      },
      {
        "name": "Buharkent",
        "lat": 37.96397,
        "lon": 28.7427
      },
      {
        "name": "Çine",
        "lat": 37.61266,
        "lon": 28.05912
      },
      {
        "name": "Didim",
        "lat": 37.38496,
        "lon": 27.25643
      },
      {
        "name": "Efeler",
        "lat": 37.8483767,
        "lon": 27.8435878
      },
      {
        "name": "Germencik",
        "lat": 37.87056,
        "lon": 27.60283
      },
      {
        "name": "İncirliova",
        "lat": 37.85222,
        "lon": 27.72361
      },
      {
        "name": "Karacasu",
        "lat": 37.72816,
        "lon": 28.60569
      },
      {
        "name": "Karpuzlu",
        "lat": 37.55861,
        "lon": 27.83528
      },
      {
        "name": "Koçarlı",
        "lat": 37.76113,
        "lon": 27.70583
      },
      {
        "name": "Köşk",
        "lat": 37.85333,
        "lon": 28.05167
      },
      {
        "name": "Kuşadası",
        "lat": 37.86014,
        "lon": 27.25713
      },
      {
        "name": "Kuyucak",
        "lat": 37.9133,
        "lon": 28.45917
      },
      {
        "name": "Nazilli",
        "lat": 37.91631,
        "lon": 28.32225
      },
      {
        "name": "Söke",
        "lat": 37.7482,
        "lon": 27.40614
      },
      {
        "name": "Sultanhisar",
        "lat": 37.88989,
        "lon": 28.15436
      },
      {
        "name": "Yenipazar",
        "lat": 37.82332,
        "lon": 28.19573
      }
    ]
  },
  {
    "id": "10",
    "name": "Balıkesir",
    "lat": 39.647392,
    "lon": 27.887979,
    "coastal": true,
    "districts": [
      {
        "name": "Altıeylül",
        "lat": 39.6473917,
        "lon": 27.8879787
      },
      {
        "name": "Ayvalık",
        "lat": 39.31927,
        "lon": 26.69341
      },
      {
        "name": "Balya",
        "lat": 39.74861,
        "lon": 27.57889
      },
      {
        "name": "Bandırma",
        "lat": 40.35222,
        "lon": 27.97667
      },
      {
        "name": "Bigadiç",
        "lat": 39.3925,
        "lon": 28.13111
      },
      {
        "name": "Burhaniye",
        "lat": 39.50041,
        "lon": 26.97269
      },
      {
        "name": "Dursunbey",
        "lat": 39.58596,
        "lon": 28.62568
      },
      {
        "name": "Edremit",
        "lat": 39.59611,
        "lon": 27.02444
      },
      {
        "name": "Erdek",
        "lat": 40.3996,
        "lon": 27.79348
      },
      {
        "name": "Gömeç",
        "lat": 39.39016,
        "lon": 26.84127
      },
      {
        "name": "Gönen",
        "lat": 40.1049,
        "lon": 27.65399
      },
      {
        "name": "Havran",
        "lat": 39.55833,
        "lon": 27.09833
      },
      {
        "name": "İvrindi",
        "lat": 39.58389,
        "lon": 27.48639
      },
      {
        "name": "Karesi",
        "lat": 39.6473917,
        "lon": 27.8879787
      },
      {
        "name": "Kepsut",
        "lat": 39.68889,
        "lon": 28.15222
      },
      {
        "name": "Manyas",
        "lat": 40.04639,
        "lon": 27.97
      },
      {
        "name": "Marmara",
        "lat": 40.58633,
        "lon": 27.55541
      },
      {
        "name": "Savaştepe",
        "lat": 39.38319,
        "lon": 27.65612
      },
      {
        "name": "Sındırgı",
        "lat": 39.24128,
        "lon": 28.17842
      },
      {
        "name": "Susurluk",
        "lat": 39.91361,
        "lon": 28.15778
      }
    ]
  },
  {
    "id": "11",
    "name": "Bilecik",
    "lat": 40.14351,
    "lon": 29.975291,
    "coastal": false,
    "districts": [
      {
        "name": "Bozüyük",
        "lat": 39.90778,
        "lon": 30.03667
      },
      {
        "name": "Gölpazarı",
        "lat": 40.28472,
        "lon": 30.31722
      },
      {
        "name": "İnhisar",
        "lat": 40.04932,
        "lon": 30.38521
      },
      {
        "name": "Merkez",
        "lat": 40.1435101,
        "lon": 29.9752911
      },
      {
        "name": "Osmaneli",
        "lat": 40.35722,
        "lon": 30.01417
      },
      {
        "name": "Pazaryeri",
        "lat": 39.99395,
        "lon": 29.90424
      },
      {
        "name": "Söğüt",
        "lat": 40.0143,
        "lon": 30.18486
      },
      {
        "name": "Yenipazar",
        "lat": 40.17833,
        "lon": 30.52
      }
    ]
  },
  {
    "id": "12",
    "name": "Bingöl",
    "lat": 38.886127,
    "lon": 40.497233,
    "coastal": false,
    "districts": [
      {
        "name": "Adaklı",
        "lat": 39.2262,
        "lon": 40.48283
      },
      {
        "name": "Genç",
        "lat": 38.74773,
        "lon": 40.55343
      },
      {
        "name": "Karlıova",
        "lat": 39.29044,
        "lon": 41.00594
      },
      {
        "name": "Kiğı",
        "lat": 39.31361,
        "lon": 40.35028
      },
      {
        "name": "Merkez",
        "lat": 38.8861265,
        "lon": 40.4972333
      },
      {
        "name": "Solhan",
        "lat": 38.96525,
        "lon": 41.05443
      },
      {
        "name": "Yayladere",
        "lat": 39.22614,
        "lon": 40.0695
      },
      {
        "name": "Yedisu",
        "lat": 39.43277,
        "lon": 40.53368
      }
    ]
  },
  {
    "id": "13",
    "name": "Bitlis",
    "lat": 38.402054,
    "lon": 42.108457,
    "coastal": false,
    "districts": [
      {
        "name": "Adilcevaz",
        "lat": 38.79911,
        "lon": 42.73159
      },
      {
        "name": "Ahlat",
        "lat": 38.7489,
        "lon": 42.48007
      },
      {
        "name": "Güroymak",
        "lat": 38.5758,
        "lon": 42.01558
      },
      {
        "name": "Hizan",
        "lat": 38.22498,
        "lon": 42.4183
      },
      {
        "name": "Merkez",
        "lat": 38.4020539,
        "lon": 42.1084568
      },
      {
        "name": "Mutki",
        "lat": 38.40624,
        "lon": 41.92018
      },
      {
        "name": "Tatvan",
        "lat": 38.49221,
        "lon": 42.28269
      }
    ]
  },
  {
    "id": "14",
    "name": "Bolu",
    "lat": 40.733295,
    "lon": 31.611048,
    "coastal": false,
    "districts": [
      {
        "name": "Dörtdivan",
        "lat": 40.72052,
        "lon": 32.06314
      },
      {
        "name": "Gerede",
        "lat": 40.80083,
        "lon": 32.19694
      },
      {
        "name": "Göynük",
        "lat": 40.40028,
        "lon": 30.78833
      },
      {
        "name": "Kıbrıscık",
        "lat": 40.40778,
        "lon": 31.85194
      },
      {
        "name": "Mengen",
        "lat": 40.93877,
        "lon": 32.07642
      },
      {
        "name": "Merkez",
        "lat": 40.7332953,
        "lon": 31.6110479
      },
      {
        "name": "Mudurnu",
        "lat": 40.473,
        "lon": 31.20755
      },
      {
        "name": "Seben",
        "lat": 40.41134,
        "lon": 31.57359
      },
      {
        "name": "Yeniçağa",
        "lat": 40.77115,
        "lon": 32.03375
      }
    ]
  },
  {
    "id": "15",
    "name": "Burdur",
    "lat": 37.724839,
    "lon": 30.288729,
    "coastal": false,
    "districts": [
      {
        "name": "Ağlasun",
        "lat": 37.64944,
        "lon": 30.53417
      },
      {
        "name": "Altınyayla",
        "lat": 36.99722,
        "lon": 29.54579
      },
      {
        "name": "Bucak",
        "lat": 37.45917,
        "lon": 30.595
      },
      {
        "name": "Çavdır",
        "lat": 37.155,
        "lon": 29.69389
      },
      {
        "name": "Çeltikçi",
        "lat": 37.52947,
        "lon": 30.48028
      },
      {
        "name": "Gölhisar",
        "lat": 37.1459,
        "lon": 29.50876
      },
      {
        "name": "Karamanlı",
        "lat": 37.37301,
        "lon": 29.82308
      },
      {
        "name": "Kemer",
        "lat": 37.35222,
        "lon": 30.06306
      },
      {
        "name": "Merkez",
        "lat": 37.7248394,
        "lon": 30.2887286
      },
      {
        "name": "Tefenni",
        "lat": 37.30968,
        "lon": 29.77538
      },
      {
        "name": "Yeşilova",
        "lat": 37.50806,
        "lon": 29.75472
      }
    ]
  },
  {
    "id": "16",
    "name": "Bursa",
    "lat": 40.182573,
    "lon": 29.067504,
    "coastal": true,
    "districts": [
      {
        "name": "Büyükorhan",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "Gemlik",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "Gürsu",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "Harmancık",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "İnegöl",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "İznik",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "Karacabey",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "Keles",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "Kestel",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "Mudanya",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "Mustafakemalpaşa",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "Nilüfer",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "Orhaneli",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "Orhangazi",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "Osmangazi",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "Yenişehir",
        "lat": 40.1825734,
        "lon": 29.0675039
      },
      {
        "name": "Yıldırım",
        "lat": 40.1825734,
        "lon": 29.0675039
      }
    ]
  },
  {
    "id": "17",
    "name": "Çanakkale",
    "lat": 40.146271,
    "lon": 26.402889,
    "coastal": true,
    "districts": [
      {
        "name": "Ayvacık",
        "lat": 39.60111,
        "lon": 26.40472
      },
      {
        "name": "Bayramiç",
        "lat": 39.80862,
        "lon": 26.60983
      },
      {
        "name": "Biga",
        "lat": 40.22806,
        "lon": 27.24222
      },
      {
        "name": "Bozcaada",
        "lat": 39.835,
        "lon": 26.06972
      },
      {
        "name": "Çan",
        "lat": 40.03328,
        "lon": 27.05236
      },
      {
        "name": "Eceabat",
        "lat": 40.18416,
        "lon": 26.3574
      },
      {
        "name": "Ezine",
        "lat": 39.78561,
        "lon": 26.34083
      },
      {
        "name": "Gelibolu",
        "lat": 40.40836,
        "lon": 26.67174
      },
      {
        "name": "Gökçeada",
        "lat": 40.20107,
        "lon": 25.90902
      },
      {
        "name": "Lapseki",
        "lat": 40.34417,
        "lon": 26.68556
      },
      {
        "name": "Merkez",
        "lat": 40.12954,
        "lon": 26.42075
      },
      {
        "name": "Yenice",
        "lat": 39.93083,
        "lon": 27.25806
      }
    ]
  },
  {
    "id": "18",
    "name": "Çankırı",
    "lat": 40.597195,
    "lon": 33.62127,
    "coastal": false,
    "districts": [
      {
        "name": "Atkaracalar",
        "lat": 40.81593,
        "lon": 33.07556
      },
      {
        "name": "Bayramören",
        "lat": 40.94329,
        "lon": 33.203
      },
      {
        "name": "Çerkeş",
        "lat": 40.81164,
        "lon": 32.89358
      },
      {
        "name": "Eldivan",
        "lat": 40.52975,
        "lon": 33.49903
      },
      {
        "name": "Ilgaz",
        "lat": 40.92511,
        "lon": 33.62586
      },
      {
        "name": "Kızılırmak",
        "lat": 40.34556,
        "lon": 33.98639
      },
      {
        "name": "Korgun",
        "lat": 40.73479,
        "lon": 33.51844
      },
      {
        "name": "Kurşunlu",
        "lat": 40.84101,
        "lon": 33.26028
      },
      {
        "name": "Merkez",
        "lat": 40.5971947,
        "lon": 33.6212704
      },
      {
        "name": "Orta",
        "lat": 40.6242,
        "lon": 33.10928
      },
      {
        "name": "Şabanözü",
        "lat": 40.48249,
        "lon": 33.28352
      },
      {
        "name": "Yapraklı",
        "lat": 40.75785,
        "lon": 33.77819
      }
    ]
  },
  {
    "id": "19",
    "name": "Çorum",
    "lat": 40.549911,
    "lon": 34.953734,
    "coastal": false,
    "districts": [
      {
        "name": "Alaca",
        "lat": 40.16833,
        "lon": 34.8425
      },
      {
        "name": "Bayat",
        "lat": 40.64583,
        "lon": 34.26139
      },
      {
        "name": "Boğazkale",
        "lat": 40.02191,
        "lon": 34.60947
      },
      {
        "name": "Dodurga",
        "lat": 40.85489,
        "lon": 34.80703
      },
      {
        "name": "İskilip",
        "lat": 40.73528,
        "lon": 34.47389
      },
      {
        "name": "Kargı",
        "lat": 41.13373,
        "lon": 34.48744
      },
      {
        "name": "Laçin",
        "lat": 40.77486,
        "lon": 34.88068
      },
      {
        "name": "Mecitözü",
        "lat": 40.52,
        "lon": 35.29528
      },
      {
        "name": "Merkez",
        "lat": 40.5499106,
        "lon": 34.9537344
      },
      {
        "name": "Oğuzlar",
        "lat": 40.75353,
        "lon": 34.70275
      },
      {
        "name": "Ortaköy",
        "lat": 40.27352,
        "lon": 35.25175
      },
      {
        "name": "Osmancık",
        "lat": 40.97818,
        "lon": 34.8047
      },
      {
        "name": "Sungurlu",
        "lat": 40.1675,
        "lon": 34.37389
      },
      {
        "name": "Uğurludağ",
        "lat": 40.44631,
        "lon": 34.45259
      }
    ]
  },
  {
    "id": "20",
    "name": "Denizli",
    "lat": 37.782788,
    "lon": 29.096648,
    "coastal": false,
    "districts": [
      {
        "name": "Acıpayam",
        "lat": 37.42385,
        "lon": 29.34941
      },
      {
        "name": "Babadağ",
        "lat": 37.80764,
        "lon": 28.85665
      },
      {
        "name": "Baklan",
        "lat": 37.97694,
        "lon": 29.60861
      },
      {
        "name": "Bekilli",
        "lat": 38.23105,
        "lon": 29.4197
      },
      {
        "name": "Beyağaç",
        "lat": 37.23526,
        "lon": 28.89612
      },
      {
        "name": "Bozkurt",
        "lat": 37.82417,
        "lon": 29.60972
      },
      {
        "name": "Buldan",
        "lat": 38.045,
        "lon": 28.83056
      },
      {
        "name": "Çal",
        "lat": 38.08361,
        "lon": 29.39889
      },
      {
        "name": "Çameli",
        "lat": 37.07611,
        "lon": 29.34472
      },
      {
        "name": "Çardak",
        "lat": 37.82694,
        "lon": 29.66833
      },
      {
        "name": "Çivril",
        "lat": 38.30139,
        "lon": 29.73861
      },
      {
        "name": "Güney",
        "lat": 38.15444,
        "lon": 29.06778
      },
      {
        "name": "Honaz",
        "lat": 37.7573,
        "lon": 29.26996
      },
      {
        "name": "Kale",
        "lat": 37.43917,
        "lon": 28.84528
      },
      {
        "name": "Merkezefendi",
        "lat": 37.80544,
        "lon": 29.04236
      },
      {
        "name": "Pamukkale",
        "lat": 37.7912,
        "lon": 29.10141
      },
      {
        "name": "Sarayköy",
        "lat": 37.92448,
        "lon": 28.92516
      },
      {
        "name": "Serinhisar",
        "lat": 37.58105,
        "lon": 29.26639
      },
      {
        "name": "Tavas",
        "lat": 37.57351,
        "lon": 29.07058
      }
    ]
  },
  {
    "id": "21",
    "name": "Diyarbakır",
    "lat": 37.916222,
    "lon": 40.236354,
    "coastal": false,
    "districts": [
      {
        "name": "Bağlar",
        "lat": 37.91375,
        "lon": 40.20584
      },
      {
        "name": "Bismil",
        "lat": 37.84514,
        "lon": 40.65931
      },
      {
        "name": "Çermik",
        "lat": 38.13538,
        "lon": 39.445
      },
      {
        "name": "Çınar",
        "lat": 37.72226,
        "lon": 40.40696
      },
      {
        "name": "Çüngüş",
        "lat": 38.20798,
        "lon": 39.28554
      },
      {
        "name": "Dicle",
        "lat": 38.36571,
        "lon": 40.0645
      },
      {
        "name": "Eğil",
        "lat": 38.25748,
        "lon": 40.07435
      },
      {
        "name": "Ergani",
        "lat": 38.26899,
        "lon": 39.75446
      },
      {
        "name": "Hani",
        "lat": 38.40741,
        "lon": 40.38578
      },
      {
        "name": "Hazro",
        "lat": 38.24903,
        "lon": 40.77129
      },
      {
        "name": "Kayapınar",
        "lat": 37.93733,
        "lon": 40.17756
      },
      {
        "name": "Kocaköy",
        "lat": 38.28889,
        "lon": 40.49786
      },
      {
        "name": "Kulp",
        "lat": 38.49754,
        "lon": 41.00668
      },
      {
        "name": "Lice",
        "lat": 38.45821,
        "lon": 40.63888
      },
      {
        "name": "Silvan",
        "lat": 38.13708,
        "lon": 41.00817
      },
      {
        "name": "Sur",
        "lat": 37.91351,
        "lon": 40.22859
      },
      {
        "name": "Yenişehir",
        "lat": 37.94146,
        "lon": 40.13801
      }
    ]
  },
  {
    "id": "22",
    "name": "Edirne",
    "lat": 41.675933,
    "lon": 26.558723,
    "coastal": true,
    "districts": [
      {
        "name": "Enez",
        "lat": 40.72472,
        "lon": 26.0825
      },
      {
        "name": "Havsa",
        "lat": 41.54898,
        "lon": 26.82207
      },
      {
        "name": "İpsala",
        "lat": 40.92115,
        "lon": 26.38273
      },
      {
        "name": "Keşan",
        "lat": 40.85525,
        "lon": 26.63266
      },
      {
        "name": "Lalapaşa",
        "lat": 41.83951,
        "lon": 26.73561
      },
      {
        "name": "Meriç",
        "lat": 41.19183,
        "lon": 26.42097
      },
      {
        "name": "Merkez",
        "lat": 41.6759327,
        "lon": 26.5587225
      },
      {
        "name": "Süloğlu",
        "lat": 41.76901,
        "lon": 26.90999
      },
      {
        "name": "Uzunköprü",
        "lat": 41.26914,
        "lon": 26.68598
      }
    ]
  },
  {
    "id": "23",
    "name": "Elazığ",
    "lat": 38.674716,
    "lon": 39.222714,
    "coastal": false,
    "districts": [
      {
        "name": "Ağın",
        "lat": 38.94383,
        "lon": 38.71499
      },
      {
        "name": "Alacakaya",
        "lat": 38.46201,
        "lon": 39.86234
      },
      {
        "name": "Arıcak",
        "lat": 38.5634,
        "lon": 40.1248
      },
      {
        "name": "Baskil",
        "lat": 38.56866,
        "lon": 38.81634
      },
      {
        "name": "Karakoçan",
        "lat": 38.95178,
        "lon": 40.02706
      },
      {
        "name": "Keban",
        "lat": 38.7938,
        "lon": 38.73517
      },
      {
        "name": "Kovancılar",
        "lat": 38.71882,
        "lon": 39.86268
      },
      {
        "name": "Maden",
        "lat": 38.38669,
        "lon": 39.66408
      },
      {
        "name": "Merkez",
        "lat": 38.6747164,
        "lon": 39.2227135
      },
      {
        "name": "Palu",
        "lat": 38.69135,
        "lon": 39.91984
      },
      {
        "name": "Sivrice",
        "lat": 38.44223,
        "lon": 39.30938
      }
    ]
  },
  {
    "id": "24",
    "name": "Erzincan",
    "lat": 39.746755,
    "lon": 39.49103,
    "coastal": false,
    "districts": [
      {
        "name": "Çayırlı",
        "lat": 39.80775,
        "lon": 40.028
      },
      {
        "name": "İliç",
        "lat": 39.45654,
        "lon": 38.56474
      },
      {
        "name": "Kemah",
        "lat": 39.59606,
        "lon": 39.02329
      },
      {
        "name": "Kemaliye",
        "lat": 39.26288,
        "lon": 38.49674
      },
      {
        "name": "Merkez",
        "lat": 39.7467552,
        "lon": 39.49103
      },
      {
        "name": "Otlukbeli",
        "lat": 39.97,
        "lon": 40.01872
      },
      {
        "name": "Refahiye",
        "lat": 39.89315,
        "lon": 38.76607
      },
      {
        "name": "Tercan",
        "lat": 39.77709,
        "lon": 40.37783
      },
      {
        "name": "Üzümlü",
        "lat": 39.7467552,
        "lon": 39.49103
      }
    ]
  },
  {
    "id": "25",
    "name": "Erzurum",
    "lat": 39.90632,
    "lon": 41.272772,
    "coastal": false,
    "districts": [
      {
        "name": "Aşkale",
        "lat": 39.92083,
        "lon": 40.695
      },
      {
        "name": "Aziziye",
        "lat": 39.80601,
        "lon": 41.38271
      },
      {
        "name": "Çat",
        "lat": 39.60641,
        "lon": 40.96844
      },
      {
        "name": "Hınıs",
        "lat": 39.35766,
        "lon": 41.69253
      },
      {
        "name": "Horasan",
        "lat": 40.03885,
        "lon": 42.16366
      },
      {
        "name": "İspir",
        "lat": 40.47981,
        "lon": 40.99373
      },
      {
        "name": "Karaçoban",
        "lat": 39.34364,
        "lon": 42.09918
      },
      {
        "name": "Karayazı",
        "lat": 39.69604,
        "lon": 42.14277
      },
      {
        "name": "Köprüköy",
        "lat": 39.966,
        "lon": 41.86844
      },
      {
        "name": "Narman",
        "lat": 40.34449,
        "lon": 41.86088
      },
      {
        "name": "Oltu",
        "lat": 40.53945,
        "lon": 41.98722
      },
      {
        "name": "Olur",
        "lat": 40.82165,
        "lon": 42.13055
      },
      {
        "name": "Palandöken",
        "lat": 39.88898,
        "lon": 41.28055
      },
      {
        "name": "Pasinler",
        "lat": 39.97975,
        "lon": 41.66997
      },
      {
        "name": "Pazaryolu",
        "lat": 40.41142,
        "lon": 40.7678
      },
      {
        "name": "Şenkaya",
        "lat": 40.55652,
        "lon": 42.34266
      },
      {
        "name": "Tekman",
        "lat": 39.64111,
        "lon": 41.50542
      },
      {
        "name": "Tortum",
        "lat": 40.28892,
        "lon": 41.54096
      },
      {
        "name": "Uzundere",
        "lat": 40.53218,
        "lon": 41.53832
      },
      {
        "name": "Yakutiye",
        "lat": 39.89821,
        "lon": 41.26916
      }
    ]
  },
  {
    "id": "26",
    "name": "Eskişehir",
    "lat": 39.774394,
    "lon": 30.519116,
    "coastal": false,
    "districts": [
      {
        "name": "Alpu",
        "lat": 39.76903,
        "lon": 30.9606
      },
      {
        "name": "Beylikova",
        "lat": 39.68694,
        "lon": 31.20556
      },
      {
        "name": "Çifteler",
        "lat": 39.38306,
        "lon": 31.03917
      },
      {
        "name": "Günyüzü",
        "lat": 39.38345,
        "lon": 31.80995
      },
      {
        "name": "Han",
        "lat": 39.15917,
        "lon": 30.86139
      },
      {
        "name": "İnönü",
        "lat": 39.81534,
        "lon": 30.14549
      },
      {
        "name": "Mahmudiye",
        "lat": 39.49778,
        "lon": 30.98722
      },
      {
        "name": "Mihalgazi",
        "lat": 40.02621,
        "lon": 30.57707
      },
      {
        "name": "Mihalıççık",
        "lat": 39.86594,
        "lon": 31.49572
      },
      {
        "name": "Odunpazarı",
        "lat": 39.76821,
        "lon": 30.53538
      },
      {
        "name": "Sarıcakaya",
        "lat": 40.03686,
        "lon": 30.62675
      },
      {
        "name": "Seyitgazi",
        "lat": 39.44472,
        "lon": 30.69472
      },
      {
        "name": "Sivrihisar",
        "lat": 39.45037,
        "lon": 31.53409
      },
      {
        "name": "Tepebaşı",
        "lat": 39.81091,
        "lon": 30.52551
      }
    ]
  },
  {
    "id": "27",
    "name": "Gaziantep",
    "lat": 37.062832,
    "lon": 37.379262,
    "coastal": false,
    "districts": [
      {
        "name": "Araban",
        "lat": 37.42667,
        "lon": 37.689
      },
      {
        "name": "İslahiye",
        "lat": 37.025,
        "lon": 36.63056
      },
      {
        "name": "Karkamış",
        "lat": 36.83452,
        "lon": 37.9983
      },
      {
        "name": "Nizip",
        "lat": 37.00972,
        "lon": 37.79417
      },
      {
        "name": "Nurdağı",
        "lat": 37.16821,
        "lon": 36.73623
      },
      {
        "name": "Oğuzeli",
        "lat": 36.96572,
        "lon": 37.51339
      },
      {
        "name": "Şahinbey",
        "lat": 37.04836,
        "lon": 37.34371
      },
      {
        "name": "Şehitkamil",
        "lat": 37.07962,
        "lon": 37.38003
      },
      {
        "name": "Yavuzeli",
        "lat": 37.31772,
        "lon": 37.56824
      }
    ]
  },
  {
    "id": "28",
    "name": "Giresun",
    "lat": 40.917445,
    "lon": 38.384786,
    "coastal": true,
    "districts": [
      {
        "name": "Alucra",
        "lat": 40.32021,
        "lon": 38.7641
      },
      {
        "name": "Bulancak",
        "lat": 40.93805,
        "lon": 38.23148
      },
      {
        "name": "Çamoluk",
        "lat": 40.12732,
        "lon": 38.73006
      },
      {
        "name": "Çanakçı",
        "lat": 40.91139,
        "lon": 38.98813
      },
      {
        "name": "Dereli",
        "lat": 40.7389,
        "lon": 38.44337
      },
      {
        "name": "Doğankent",
        "lat": 40.8075,
        "lon": 38.91722
      },
      {
        "name": "Espiye",
        "lat": 40.94705,
        "lon": 38.70299
      },
      {
        "name": "Eynesil",
        "lat": 41.06436,
        "lon": 39.14274
      },
      {
        "name": "Görele",
        "lat": 41.03083,
        "lon": 39.00306
      },
      {
        "name": "Güce",
        "lat": 40.8932,
        "lon": 38.7982
      },
      {
        "name": "Keşap",
        "lat": 40.91032,
        "lon": 38.5013
      },
      {
        "name": "Merkez",
        "lat": 40.9174453,
        "lon": 38.3847864
      },
      {
        "name": "Piraziz",
        "lat": 40.95178,
        "lon": 38.124
      },
      {
        "name": "Şebinkarahisar",
        "lat": 40.9174453,
        "lon": 38.3847864
      },
      {
        "name": "Tirebolu",
        "lat": 41.00694,
        "lon": 38.81389
      },
      {
        "name": "Yağlıdere",
        "lat": 40.85672,
        "lon": 38.62035
      }
    ]
  },
  {
    "id": "29",
    "name": "Gümüşhane",
    "lat": 40.461784,
    "lon": 39.475734,
    "coastal": false,
    "districts": [
      {
        "name": "Kelkit",
        "lat": 40.12682,
        "lon": 39.43424
      },
      {
        "name": "Köse",
        "lat": 40.20692,
        "lon": 39.64626
      },
      {
        "name": "Kürtün",
        "lat": 40.69516,
        "lon": 39.09468
      },
      {
        "name": "Merkez",
        "lat": 40.4617844,
        "lon": 39.4757339
      },
      {
        "name": "Şiran",
        "lat": 40.19064,
        "lon": 39.11747
      },
      {
        "name": "Torul",
        "lat": 40.55071,
        "lon": 39.28344
      }
    ]
  },
  {
    "id": "30",
    "name": "Hakkari",
    "lat": 37.576696,
    "lon": 43.737786,
    "coastal": false,
    "districts": [
      {
        "name": "Çukurca",
        "lat": 37.5766959,
        "lon": 43.7377862
      },
      {
        "name": "Derecik",
        "lat": 37.5766959,
        "lon": 43.7377862
      },
      {
        "name": "Merkez",
        "lat": 37.5766959,
        "lon": 43.7377862
      },
      {
        "name": "Şemdinli",
        "lat": 37.5766959,
        "lon": 43.7377862
      },
      {
        "name": "Yüksekova",
        "lat": 37.5766959,
        "lon": 43.7377862
      }
    ]
  },
  {
    "id": "31",
    "name": "Hatay",
    "lat": 36.202547,
    "lon": 36.160291,
    "coastal": true,
    "districts": [
      {
        "name": "Altınözü",
        "lat": 36.11554,
        "lon": 36.24827
      },
      {
        "name": "Antakya",
        "lat": 36.20655,
        "lon": 36.15722
      },
      {
        "name": "Arsuz",
        "lat": 36.41305,
        "lon": 35.89033
      },
      {
        "name": "Belen",
        "lat": 36.48866,
        "lon": 36.19489
      },
      {
        "name": "Defne",
        "lat": 36.2025471,
        "lon": 36.1602908
      },
      {
        "name": "Dörtyol",
        "lat": 36.83917,
        "lon": 36.23025
      },
      {
        "name": "Erzin",
        "lat": 36.95348,
        "lon": 36.19839
      },
      {
        "name": "Hassa",
        "lat": 36.79944,
        "lon": 36.51778
      },
      {
        "name": "İskenderun",
        "lat": 36.58718,
        "lon": 36.17347
      },
      {
        "name": "Kırıkhan",
        "lat": 36.49939,
        "lon": 36.35755
      },
      {
        "name": "Kumlu",
        "lat": 36.36353,
        "lon": 36.45502
      },
      {
        "name": "Payas",
        "lat": 36.756,
        "lon": 36.21432
      },
      {
        "name": "Reyhanlı",
        "lat": 36.26791,
        "lon": 36.56747
      },
      {
        "name": "Samandağ",
        "lat": 36.08747,
        "lon": 35.96812
      },
      {
        "name": "Yayladağı",
        "lat": 35.9025,
        "lon": 36.06272
      }
    ]
  },
  {
    "id": "32",
    "name": "Isparta",
    "lat": 37.763672,
    "lon": 30.555057,
    "coastal": false,
    "districts": [
      {
        "name": "Aksu",
        "lat": 37.79889,
        "lon": 31.07111
      },
      {
        "name": "Atabey",
        "lat": 37.95083,
        "lon": 30.63861
      },
      {
        "name": "Eğirdir",
        "lat": 37.87462,
        "lon": 30.85042
      },
      {
        "name": "Gelendost",
        "lat": 38.12083,
        "lon": 31.01528
      },
      {
        "name": "Gönen",
        "lat": 37.95639,
        "lon": 30.5114
      },
      {
        "name": "Keçiborlu",
        "lat": 37.9425,
        "lon": 30.30222
      },
      {
        "name": "Merkez",
        "lat": 37.7636722,
        "lon": 30.5550569
      },
      {
        "name": "Senirkent",
        "lat": 38.10444,
        "lon": 30.54861
      },
      {
        "name": "Sütçüler",
        "lat": 37.49737,
        "lon": 30.97727
      },
      {
        "name": "Şarkikaraağaç",
        "lat": 38.07944,
        "lon": 31.36639
      },
      {
        "name": "Uluborlu",
        "lat": 38.07825,
        "lon": 30.45019
      },
      {
        "name": "Yalvaç",
        "lat": 38.29556,
        "lon": 31.17778
      },
      {
        "name": "Yenişarbademli",
        "lat": 37.70778,
        "lon": 31.38639
      }
    ]
  },
  {
    "id": "33",
    "name": "Mersin",
    "lat": 36.797838,
    "lon": 34.629839,
    "coastal": true,
    "districts": [
      {
        "name": "Akdeniz",
        "lat": 36.09718,
        "lon": 33.05306
      },
      {
        "name": "Anamur",
        "lat": 36.07508,
        "lon": 32.83691
      },
      {
        "name": "Aydıncık",
        "lat": 36.1437,
        "lon": 33.32016
      },
      {
        "name": "Bozyazı",
        "lat": 36.1082,
        "lon": 32.96113
      },
      {
        "name": "Çamlıyayla",
        "lat": 37.16652,
        "lon": 34.59296
      },
      {
        "name": "Erdemli",
        "lat": 36.60498,
        "lon": 34.30836
      },
      {
        "name": "Gülnar",
        "lat": 36.34148,
        "lon": 33.39921
      },
      {
        "name": "Mezitli",
        "lat": 36.74541,
        "lon": 34.52256
      },
      {
        "name": "Mut",
        "lat": 36.64389,
        "lon": 33.43885
      },
      {
        "name": "Silifke",
        "lat": 36.37778,
        "lon": 33.93444
      },
      {
        "name": "Tarsus",
        "lat": 36.91766,
        "lon": 34.89277
      },
      {
        "name": "Toroslar",
        "lat": 36.82971,
        "lon": 34.6132
      },
      {
        "name": "Yenişehir",
        "lat": 36.8,
        "lon": 34.56667
      }
    ]
  },
  {
    "id": "34",
    "name": "İstanbul",
    "lat": 41.006381,
    "lon": 28.975872,
    "coastal": true,
    "districts": [
      {
        "name": "Adalar",
        "lat": 40.86778,
        "lon": 29.13306
      },
      {
        "name": "Arnavutköy",
        "lat": 41.18355,
        "lon": 28.7402
      },
      {
        "name": "Ataşehir",
        "lat": 40.9833,
        "lon": 29.1167
      },
      {
        "name": "Avcılar",
        "lat": 41.006381,
        "lon": 28.9758715
      },
      {
        "name": "Bağcılar",
        "lat": 41.03903,
        "lon": 28.85671
      },
      {
        "name": "Bahçelievler",
        "lat": 41.00231,
        "lon": 28.8598
      },
      {
        "name": "Bakırköy",
        "lat": 40.98936,
        "lon": 28.87121
      },
      {
        "name": "Başakşehir",
        "lat": 41.106,
        "lon": 28.791
      },
      {
        "name": "Bayrampaşa",
        "lat": 41.0523,
        "lon": 28.89894
      },
      {
        "name": "Beşiktaş",
        "lat": 41.04541,
        "lon": 29.00991
      },
      {
        "name": "Beykoz",
        "lat": 41.14389,
        "lon": 29.09056
      },
      {
        "name": "Beylikdüzü",
        "lat": 40.982,
        "lon": 28.6399
      },
      {
        "name": "Beyoğlu",
        "lat": 41.03694,
        "lon": 28.9775
      },
      {
        "name": "Büyükçekmece",
        "lat": 41.02072,
        "lon": 28.58502
      },
      {
        "name": "Çatalca",
        "lat": 41.14073,
        "lon": 28.45967
      },
      {
        "name": "Çekmeköy",
        "lat": 41.04118,
        "lon": 29.17838
      },
      {
        "name": "Esenler",
        "lat": 41.0435,
        "lon": 28.87619
      },
      {
        "name": "Esenyurt",
        "lat": 41.02697,
        "lon": 28.67732
      },
      {
        "name": "Eyüpsultan",
        "lat": 41.05877,
        "lon": 28.92305
      },
      {
        "name": "Fatih",
        "lat": 41.0225,
        "lon": 28.94083
      },
      {
        "name": "Gaziosmanpaşa",
        "lat": 41.07696,
        "lon": 28.90009
      },
      {
        "name": "Güngören",
        "lat": 41.006381,
        "lon": 28.9758715
      },
      {
        "name": "Kadıköy",
        "lat": 41.006381,
        "lon": 28.9758715
      },
      {
        "name": "Kağıthane",
        "lat": 41.07944,
        "lon": 28.96472
      },
      {
        "name": "Kartal",
        "lat": 40.90495,
        "lon": 29.18861
      },
      {
        "name": "Küçükçekmece",
        "lat": 40.99104,
        "lon": 28.77123
      },
      {
        "name": "Maltepe",
        "lat": 40.93567,
        "lon": 29.15507
      },
      {
        "name": "Pendik",
        "lat": 40.8775,
        "lon": 29.2725
      },
      {
        "name": "Sancaktepe",
        "lat": 41.00244,
        "lon": 29.23187
      },
      {
        "name": "Sarıyer",
        "lat": 41.16667,
        "lon": 29.05
      },
      {
        "name": "Silivri",
        "lat": 41.07393,
        "lon": 28.24644
      },
      {
        "name": "Sultanbeyli",
        "lat": 40.96072,
        "lon": 29.27067
      },
      {
        "name": "Sultangazi",
        "lat": 41.10652,
        "lon": 28.86847
      },
      {
        "name": "Şile",
        "lat": 41.17891,
        "lon": 29.61085
      },
      {
        "name": "Şişli",
        "lat": 41.06046,
        "lon": 28.98717
      },
      {
        "name": "Tuzla",
        "lat": 41.006381,
        "lon": 28.9758715
      },
      {
        "name": "Ümraniye",
        "lat": 41.03291,
        "lon": 29.10137
      },
      {
        "name": "Üsküdar",
        "lat": 41.02274,
        "lon": 29.01366
      },
      {
        "name": "Zeytinburnu",
        "lat": 40.99441,
        "lon": 28.90417
      }
    ]
  },
  {
    "id": "35",
    "name": "İzmir",
    "lat": 38.419254,
    "lon": 27.128469,
    "coastal": true,
    "districts": [
      {
        "name": "Aliağa",
        "lat": 38.79975,
        "lon": 26.97203
      },
      {
        "name": "Balçova",
        "lat": 38.39201,
        "lon": 27.04258
      },
      {
        "name": "Bayındır",
        "lat": 38.21741,
        "lon": 27.64744
      },
      {
        "name": "Bayraklı",
        "lat": 38.46717,
        "lon": 27.16384
      },
      {
        "name": "Bergama",
        "lat": 39.12074,
        "lon": 27.18052
      },
      {
        "name": "Beydağ",
        "lat": 38.08593,
        "lon": 28.20843
      },
      {
        "name": "Bornova",
        "lat": 38.47921,
        "lon": 27.2399
      },
      {
        "name": "Buca",
        "lat": 38.3983,
        "lon": 27.16662
      },
      {
        "name": "Çeşme",
        "lat": 38.32614,
        "lon": 26.30574
      },
      {
        "name": "Çiğli",
        "lat": 38.49645,
        "lon": 27.07029
      },
      {
        "name": "Dikili",
        "lat": 39.071,
        "lon": 26.89017
      },
      {
        "name": "Foça",
        "lat": 38.6703,
        "lon": 26.75656
      },
      {
        "name": "Gaziemir",
        "lat": 38.32392,
        "lon": 27.12918
      },
      {
        "name": "Güzelbahçe",
        "lat": 38.36042,
        "lon": 26.88654
      },
      {
        "name": "Karabağlar",
        "lat": 38.382,
        "lon": 27.132
      },
      {
        "name": "Karaburun",
        "lat": 38.6364,
        "lon": 26.51094
      },
      {
        "name": "Karşıyaka",
        "lat": 38.45772,
        "lon": 27.1142
      },
      {
        "name": "Kemalpaşa",
        "lat": 38.43641,
        "lon": 27.25991
      },
      {
        "name": "Kınık",
        "lat": 39.08722,
        "lon": 27.38333
      },
      {
        "name": "Kiraz",
        "lat": 38.23056,
        "lon": 28.20444
      },
      {
        "name": "Konak",
        "lat": 38.4,
        "lon": 27.1
      },
      {
        "name": "Menderes",
        "lat": 38.24963,
        "lon": 27.13429
      },
      {
        "name": "Menemen",
        "lat": 38.60754,
        "lon": 27.06938
      },
      {
        "name": "Narlıdere",
        "lat": 38.39392,
        "lon": 27.0128
      },
      {
        "name": "Ödemiş",
        "lat": 38.2278,
        "lon": 27.96955
      },
      {
        "name": "Seferihisar",
        "lat": 38.1975,
        "lon": 26.83881
      },
      {
        "name": "Selçuk",
        "lat": 37.95137,
        "lon": 27.36849
      },
      {
        "name": "Tire",
        "lat": 38.08877,
        "lon": 27.73508
      },
      {
        "name": "Torbalı",
        "lat": 38.182,
        "lon": 27.335
      },
      {
        "name": "Urla",
        "lat": 38.32292,
        "lon": 26.76403
      }
    ]
  },
  {
    "id": "36",
    "name": "Kars",
    "lat": 40.607076,
    "lon": 43.094752,
    "coastal": false,
    "districts": [
      {
        "name": "Akyaka",
        "lat": 40.74093,
        "lon": 43.61432
      },
      {
        "name": "Arpaçay",
        "lat": 40.84522,
        "lon": 43.32747
      },
      {
        "name": "Digor",
        "lat": 40.36896,
        "lon": 43.40997
      },
      {
        "name": "Kağızman",
        "lat": 40.15669,
        "lon": 43.13424
      },
      {
        "name": "Merkez",
        "lat": 40.6070761,
        "lon": 43.0947521
      },
      {
        "name": "Sarıkamış",
        "lat": 40.32769,
        "lon": 42.58705
      },
      {
        "name": "Selim",
        "lat": 40.45772,
        "lon": 42.78287
      },
      {
        "name": "Susuz",
        "lat": 40.7791,
        "lon": 43.12769
      }
    ]
  },
  {
    "id": "37",
    "name": "Kastamonu",
    "lat": 41.376536,
    "lon": 33.777009,
    "coastal": true,
    "districts": [
      {
        "name": "Abana",
        "lat": 41.97858,
        "lon": 34.011
      },
      {
        "name": "Ağlı",
        "lat": 41.68602,
        "lon": 33.55383
      },
      {
        "name": "Araç",
        "lat": 41.24222,
        "lon": 33.32767
      },
      {
        "name": "Azdavay",
        "lat": 41.64267,
        "lon": 33.3
      },
      {
        "name": "Bozkurt",
        "lat": 41.95769,
        "lon": 34.01087
      },
      {
        "name": "Cide",
        "lat": 41.89211,
        "lon": 33.00439
      },
      {
        "name": "Çatalzeytin",
        "lat": 41.95314,
        "lon": 34.21627
      },
      {
        "name": "Daday",
        "lat": 41.47866,
        "lon": 33.46667
      },
      {
        "name": "Devrekani",
        "lat": 41.60303,
        "lon": 33.83922
      },
      {
        "name": "Doğanyurt",
        "lat": 42.00457,
        "lon": 33.46029
      },
      {
        "name": "Hanönü",
        "lat": 41.62705,
        "lon": 34.46667
      },
      {
        "name": "İhsangazi",
        "lat": 41.20432,
        "lon": 33.55455
      },
      {
        "name": "İnebolu",
        "lat": 41.97893,
        "lon": 33.76012
      },
      {
        "name": "Küre",
        "lat": 41.80578,
        "lon": 33.71161
      },
      {
        "name": "Merkez",
        "lat": 41.3765359,
        "lon": 33.7770087
      },
      {
        "name": "Pınarbaşı",
        "lat": 41.60388,
        "lon": 33.11099
      },
      {
        "name": "Seydiler",
        "lat": 41.62005,
        "lon": 33.71815
      },
      {
        "name": "Şenpazar",
        "lat": 41.8089,
        "lon": 33.23135
      },
      {
        "name": "Taşköprü",
        "lat": 41.5098,
        "lon": 34.21414
      },
      {
        "name": "Tosya",
        "lat": 41.01545,
        "lon": 34.04013
      }
    ]
  },
  {
    "id": "38",
    "name": "Kayseri",
    "lat": 38.721901,
    "lon": 35.487321,
    "coastal": false,
    "districts": [
      {
        "name": "Akkışla",
        "lat": 39.00222,
        "lon": 36.17381
      },
      {
        "name": "Bünyan",
        "lat": 38.8463,
        "lon": 35.86033
      },
      {
        "name": "Develi",
        "lat": 38.39056,
        "lon": 35.49222
      },
      {
        "name": "Felahiye",
        "lat": 39.09056,
        "lon": 35.56722
      },
      {
        "name": "Hacılar",
        "lat": 38.64631,
        "lon": 35.44937
      },
      {
        "name": "İncesu",
        "lat": 38.6224,
        "lon": 35.18261
      },
      {
        "name": "Kocasinan",
        "lat": 38.77147,
        "lon": 35.5725
      },
      {
        "name": "Melikgazi",
        "lat": 38.75,
        "lon": 35.45
      },
      {
        "name": "Özvatan",
        "lat": 39.1069,
        "lon": 35.69994
      },
      {
        "name": "Pınarbaşı",
        "lat": 38.72285,
        "lon": 36.39314
      },
      {
        "name": "Sarıoğlan",
        "lat": 39.07694,
        "lon": 35.96671
      },
      {
        "name": "Sarız",
        "lat": 38.47917,
        "lon": 36.49898
      },
      {
        "name": "Talas",
        "lat": 38.6908,
        "lon": 35.5538
      },
      {
        "name": "Tomarza",
        "lat": 38.44722,
        "lon": 35.79917
      },
      {
        "name": "Yahyalı",
        "lat": 38.10228,
        "lon": 35.35704
      },
      {
        "name": "Yeşilhisar",
        "lat": 38.35232,
        "lon": 35.08873
      }
    ]
  },
  {
    "id": "39",
    "name": "Kırklareli",
    "lat": 41.737022,
    "lon": 27.223552,
    "coastal": true,
    "districts": [
      {
        "name": "Babaeski",
        "lat": 41.42809,
        "lon": 27.0966
      },
      {
        "name": "Demirköy",
        "lat": 41.82413,
        "lon": 27.76515
      },
      {
        "name": "Kofçaz",
        "lat": 41.94481,
        "lon": 27.15829
      },
      {
        "name": "Lüleburgaz",
        "lat": 41.40173,
        "lon": 27.35746
      },
      {
        "name": "Merkez",
        "lat": 41.7370223,
        "lon": 27.2235523
      },
      {
        "name": "Pehlivanköy",
        "lat": 41.34812,
        "lon": 26.92522
      },
      {
        "name": "Pınarhisar",
        "lat": 41.6271,
        "lon": 27.51481
      },
      {
        "name": "Vize",
        "lat": 41.57629,
        "lon": 27.76732
      }
    ]
  },
  {
    "id": "40",
    "name": "Kırşehir",
    "lat": 39.146114,
    "lon": 34.160559,
    "coastal": false,
    "districts": [
      {
        "name": "Akçakent",
        "lat": 39.62278,
        "lon": 34.09583
      },
      {
        "name": "Akpınar",
        "lat": 39.45005,
        "lon": 33.96484
      },
      {
        "name": "Boztepe",
        "lat": 39.26972,
        "lon": 34.26111
      },
      {
        "name": "Çiçekdağı",
        "lat": 39.60694,
        "lon": 34.40861
      },
      {
        "name": "Kaman",
        "lat": 39.3575,
        "lon": 33.72389
      },
      {
        "name": "Merkez",
        "lat": 39.1461142,
        "lon": 34.1605587
      },
      {
        "name": "Mucur",
        "lat": 39.06147,
        "lon": 34.38286
      }
    ]
  },
  {
    "id": "41",
    "name": "Kocaeli",
    "lat": 40.765389,
    "lon": 29.940736,
    "coastal": true,
    "districts": [
      {
        "name": "Başiskele",
        "lat": 40.7653892,
        "lon": 29.9407361
      },
      {
        "name": "Çayırova",
        "lat": 40.83444,
        "lon": 29.4
      },
      {
        "name": "Darıca",
        "lat": 40.77973,
        "lon": 29.39454
      },
      {
        "name": "Derince",
        "lat": 40.75694,
        "lon": 29.81472
      },
      {
        "name": "Dilovası",
        "lat": 40.7653892,
        "lon": 29.9407361
      },
      {
        "name": "Gebze",
        "lat": 40.80276,
        "lon": 29.43068
      },
      {
        "name": "Gölcük",
        "lat": 40.71501,
        "lon": 29.81824
      },
      {
        "name": "İzmit",
        "lat": 40.76499,
        "lon": 29.92928
      },
      {
        "name": "Kandıra",
        "lat": 41.07,
        "lon": 30.15262
      },
      {
        "name": "Karamürsel",
        "lat": 40.69129,
        "lon": 29.61649
      },
      {
        "name": "Kartepe",
        "lat": 40.7522,
        "lon": 30.02349
      },
      {
        "name": "Körfez",
        "lat": 40.76704,
        "lon": 29.78275
      }
    ]
  },
  {
    "id": "42",
    "name": "Konya",
    "lat": 37.872734,
    "lon": 32.492438,
    "coastal": false,
    "districts": [
      {
        "name": "Ahırlı",
        "lat": 37.23874,
        "lon": 32.11881
      },
      {
        "name": "Akören",
        "lat": 37.45345,
        "lon": 32.3707
      },
      {
        "name": "Akşehir",
        "lat": 38.3575,
        "lon": 31.41639
      },
      {
        "name": "Altınekin",
        "lat": 38.30778,
        "lon": 32.86861
      },
      {
        "name": "Beyşehir",
        "lat": 37.67735,
        "lon": 31.72458
      },
      {
        "name": "Bozkır",
        "lat": 37.18963,
        "lon": 32.24736
      },
      {
        "name": "Cihanbeyli",
        "lat": 38.66072,
        "lon": 32.92437
      },
      {
        "name": "Çeltik",
        "lat": 39.02444,
        "lon": 31.79056
      },
      {
        "name": "Çumra",
        "lat": 37.5732,
        "lon": 32.77446
      },
      {
        "name": "Derbent",
        "lat": 38.01422,
        "lon": 32.01639
      },
      {
        "name": "Derebucak",
        "lat": 37.39179,
        "lon": 31.50918
      },
      {
        "name": "Doğanhisar",
        "lat": 38.1463,
        "lon": 31.67648
      },
      {
        "name": "Emirgazi",
        "lat": 37.90222,
        "lon": 33.83722
      },
      {
        "name": "Ereğli",
        "lat": 37.51333,
        "lon": 34.04672
      },
      {
        "name": "Güneysınır",
        "lat": 37.26944,
        "lon": 32.72898
      },
      {
        "name": "Hadim",
        "lat": 36.98776,
        "lon": 32.45674
      },
      {
        "name": "Halkapınar",
        "lat": 37.43394,
        "lon": 34.18743
      },
      {
        "name": "Hüyük",
        "lat": 37.95388,
        "lon": 31.59639
      },
      {
        "name": "Ilgın",
        "lat": 38.27917,
        "lon": 31.91389
      },
      {
        "name": "Kadınhanı",
        "lat": 38.23972,
        "lon": 32.21139
      },
      {
        "name": "Karapınar",
        "lat": 37.71596,
        "lon": 33.55064
      },
      {
        "name": "Karatay",
        "lat": 37.86726,
        "lon": 32.52863
      },
      {
        "name": "Kulu",
        "lat": 39.09513,
        "lon": 33.07989
      },
      {
        "name": "Meram",
        "lat": 37.82985,
        "lon": 32.46777
      },
      {
        "name": "Sarayönü",
        "lat": 38.26201,
        "lon": 32.40457
      },
      {
        "name": "Selçuklu",
        "lat": 37.8842,
        "lon": 32.49222
      },
      {
        "name": "Seydişehir",
        "lat": 37.41926,
        "lon": 31.84527
      },
      {
        "name": "Taşkent",
        "lat": 36.9243,
        "lon": 32.49131
      },
      {
        "name": "Tuzlukçu",
        "lat": 38.47778,
        "lon": 31.62639
      },
      {
        "name": "Yalıhüyük",
        "lat": 37.30077,
        "lon": 32.08548
      },
      {
        "name": "Yunak",
        "lat": 38.81418,
        "lon": 31.73223
      }
    ]
  },
  {
    "id": "43",
    "name": "Kütahya",
    "lat": 39.419911,
    "lon": 29.985789,
    "coastal": false,
    "districts": [
      {
        "name": "Altıntaş",
        "lat": 39.05972,
        "lon": 30.10917
      },
      {
        "name": "Aslanapa",
        "lat": 39.21581,
        "lon": 29.8699
      },
      {
        "name": "Çavdarhisar",
        "lat": 39.19344,
        "lon": 29.61915
      },
      {
        "name": "Domaniç",
        "lat": 39.80194,
        "lon": 29.60918
      },
      {
        "name": "Dumlupınar",
        "lat": 38.85408,
        "lon": 29.9772
      },
      {
        "name": "Emet",
        "lat": 39.343,
        "lon": 29.25847
      },
      {
        "name": "Gediz",
        "lat": 38.99389,
        "lon": 29.39131
      },
      {
        "name": "Hisarcık",
        "lat": 39.25057,
        "lon": 29.23116
      },
      {
        "name": "Merkez",
        "lat": 39.4199106,
        "lon": 29.9857886
      },
      {
        "name": "Pazarlar",
        "lat": 38.995,
        "lon": 29.12583
      },
      {
        "name": "Simav",
        "lat": 39.0882,
        "lon": 28.97767
      },
      {
        "name": "Şaphane",
        "lat": 39.0273,
        "lon": 29.22218
      },
      {
        "name": "Tavşanlı",
        "lat": 39.54237,
        "lon": 29.49866
      }
    ]
  },
  {
    "id": "44",
    "name": "Malatya",
    "lat": 38.348715,
    "lon": 38.319067,
    "coastal": false,
    "districts": [
      {
        "name": "Akçadağ",
        "lat": 38.33899,
        "lon": 37.97021
      },
      {
        "name": "Arapgir",
        "lat": 39.04117,
        "lon": 38.49516
      },
      {
        "name": "Arguvan",
        "lat": 38.77375,
        "lon": 38.26328
      },
      {
        "name": "Battalgazi",
        "lat": 38.42286,
        "lon": 38.3585
      },
      {
        "name": "Darende",
        "lat": 38.54583,
        "lon": 37.50583
      },
      {
        "name": "Doğanşehir",
        "lat": 38.08574,
        "lon": 37.87116
      },
      {
        "name": "Doğanyol",
        "lat": 38.30746,
        "lon": 39.03431
      },
      {
        "name": "Hekimhan",
        "lat": 38.81622,
        "lon": 37.92882
      },
      {
        "name": "Kale",
        "lat": 38.41538,
        "lon": 38.77092
      },
      {
        "name": "Kuluncak",
        "lat": 38.87656,
        "lon": 37.66279
      },
      {
        "name": "Pütürge",
        "lat": 38.19923,
        "lon": 38.86296
      },
      {
        "name": "Yazıhan",
        "lat": 38.59292,
        "lon": 38.17327
      },
      {
        "name": "Yeşilyurt",
        "lat": 38.29602,
        "lon": 38.24526
      }
    ]
  },
  {
    "id": "45",
    "name": "Manisa",
    "lat": 38.612579,
    "lon": 27.433397,
    "coastal": false,
    "districts": [
      {
        "name": "Ahmetli",
        "lat": 38.5196,
        "lon": 27.93865
      },
      {
        "name": "Akhisar",
        "lat": 38.91852,
        "lon": 27.84006
      },
      {
        "name": "Alaşehir",
        "lat": 38.35083,
        "lon": 28.51718
      },
      {
        "name": "Demirci",
        "lat": 39.04607,
        "lon": 28.65889
      },
      {
        "name": "Gölmarmara",
        "lat": 38.71389,
        "lon": 27.91417
      },
      {
        "name": "Gördes",
        "lat": 38.93278,
        "lon": 28.28942
      },
      {
        "name": "Kırkağaç",
        "lat": 39.10638,
        "lon": 27.66925
      },
      {
        "name": "Köprübaşı",
        "lat": 38.74972,
        "lon": 28.40472
      },
      {
        "name": "Kula",
        "lat": 38.54726,
        "lon": 28.64976
      },
      {
        "name": "Salihli",
        "lat": 38.48258,
        "lon": 28.14774
      },
      {
        "name": "Sarıgöl",
        "lat": 38.23953,
        "lon": 28.69663
      },
      {
        "name": "Saruhanlı",
        "lat": 38.73455,
        "lon": 27.56811
      },
      {
        "name": "Selendi",
        "lat": 38.74444,
        "lon": 28.86778
      },
      {
        "name": "Soma",
        "lat": 39.18554,
        "lon": 27.60945
      },
      {
        "name": "Şehzadeler",
        "lat": 38.6125793,
        "lon": 27.4333969
      },
      {
        "name": "Turgutlu",
        "lat": 38.49533,
        "lon": 27.6997
      },
      {
        "name": "Yunusemre",
        "lat": 38.6125793,
        "lon": 27.4333969
      }
    ]
  },
  {
    "id": "46",
    "name": "Kahramanmaraş",
    "lat": 37.581274,
    "lon": 36.927509,
    "coastal": false,
    "districts": [
      {
        "name": "Afşin",
        "lat": 38.24769,
        "lon": 36.91399
      },
      {
        "name": "Andırın",
        "lat": 37.57757,
        "lon": 36.35492
      },
      {
        "name": "Çağlayancerit",
        "lat": 37.74523,
        "lon": 37.28618
      },
      {
        "name": "Dulkadiroğlu",
        "lat": 37.5812744,
        "lon": 36.927509
      },
      {
        "name": "Ekinözü",
        "lat": 38.05974,
        "lon": 37.18786
      },
      {
        "name": "Elbistan",
        "lat": 38.20591,
        "lon": 37.1983
      },
      {
        "name": "Göksun",
        "lat": 38.02096,
        "lon": 36.4973
      },
      {
        "name": "Nurhak",
        "lat": 37.96366,
        "lon": 37.44047
      },
      {
        "name": "Onikişubat",
        "lat": 37.5812744,
        "lon": 36.927509
      },
      {
        "name": "Pazarcık",
        "lat": 37.48685,
        "lon": 37.29961
      },
      {
        "name": "Türkoğlu",
        "lat": 37.38649,
        "lon": 36.84262
      }
    ]
  },
  {
    "id": "47",
    "name": "Mardin",
    "lat": 37.313258,
    "lon": 40.735438,
    "coastal": false,
    "districts": [
      {
        "name": "Artuklu",
        "lat": 37.3132581,
        "lon": 40.7354383
      },
      {
        "name": "Dargeçit",
        "lat": 37.54616,
        "lon": 41.71652
      },
      {
        "name": "Derik",
        "lat": 37.36336,
        "lon": 40.26473
      },
      {
        "name": "Kızıltepe",
        "lat": 37.18836,
        "lon": 40.57723
      },
      {
        "name": "Mazıdağı",
        "lat": 37.47801,
        "lon": 40.48152
      },
      {
        "name": "Midyat",
        "lat": 37.41908,
        "lon": 41.33909
      },
      {
        "name": "Nusaybin",
        "lat": 37.07028,
        "lon": 41.21465
      },
      {
        "name": "Ömerli",
        "lat": 37.39903,
        "lon": 40.95442
      },
      {
        "name": "Savur",
        "lat": 37.53544,
        "lon": 40.87876
      },
      {
        "name": "Yeşilli",
        "lat": 37.33813,
        "lon": 40.81739
      }
    ]
  },
  {
    "id": "48",
    "name": "Muğla",
    "lat": 37.215178,
    "lon": 28.363733,
    "coastal": true,
    "districts": [
      {
        "name": "Bodrum",
        "lat": 37.03833,
        "lon": 27.42917
      },
      {
        "name": "Dalaman",
        "lat": 36.76591,
        "lon": 28.8028
      },
      {
        "name": "Datça",
        "lat": 36.73778,
        "lon": 27.68417
      },
      {
        "name": "Fethiye",
        "lat": 36.64038,
        "lon": 29.12758
      },
      {
        "name": "Kavaklıdere",
        "lat": 37.44463,
        "lon": 28.36276
      },
      {
        "name": "Köyceğiz",
        "lat": 36.92204,
        "lon": 28.71792
      },
      {
        "name": "Marmaris",
        "lat": 36.855,
        "lon": 28.27417
      },
      {
        "name": "Menteşe",
        "lat": 37.11667,
        "lon": 28.26667
      },
      {
        "name": "Milas",
        "lat": 37.31639,
        "lon": 27.78389
      },
      {
        "name": "Ortaca",
        "lat": 36.83915,
        "lon": 28.76457
      },
      {
        "name": "Seydikemer",
        "lat": 37.2151784,
        "lon": 28.363733
      },
      {
        "name": "Ula",
        "lat": 37.10491,
        "lon": 28.41667
      },
      {
        "name": "Yatağan",
        "lat": 37.34025,
        "lon": 28.14279
      }
    ]
  },
  {
    "id": "49",
    "name": "Muş",
    "lat": 38.732222,
    "lon": 41.489893,
    "coastal": false,
    "districts": [
      {
        "name": "Bulanık",
        "lat": 39.08656,
        "lon": 42.27158
      },
      {
        "name": "Hasköy",
        "lat": 38.68231,
        "lon": 41.67851
      },
      {
        "name": "Korkut",
        "lat": 38.7339,
        "lon": 41.78396
      },
      {
        "name": "Malazgirt",
        "lat": 39.1465,
        "lon": 42.53536
      },
      {
        "name": "Merkez",
        "lat": 38.7322221,
        "lon": 41.4898925
      },
      {
        "name": "Varto",
        "lat": 39.17375,
        "lon": 41.45402
      }
    ]
  },
  {
    "id": "50",
    "name": "Nevşehir",
    "lat": 38.625039,
    "lon": 34.715069,
    "coastal": false,
    "districts": [
      {
        "name": "Acıgöl",
        "lat": 38.55028,
        "lon": 34.50917
      },
      {
        "name": "Avanos",
        "lat": 38.715,
        "lon": 34.84667
      },
      {
        "name": "Derinkuyu",
        "lat": 38.3751,
        "lon": 34.73419
      },
      {
        "name": "Gülşehir",
        "lat": 38.74594,
        "lon": 34.62524
      },
      {
        "name": "Hacıbektaş",
        "lat": 38.94077,
        "lon": 34.5577
      },
      {
        "name": "Kozaklı",
        "lat": 39.22139,
        "lon": 34.85056
      },
      {
        "name": "Merkez",
        "lat": 38.6250389,
        "lon": 34.7150685
      },
      {
        "name": "Ürgüp",
        "lat": 38.6296,
        "lon": 34.91199
      }
    ]
  },
  {
    "id": "51",
    "name": "Niğde",
    "lat": 37.969849,
    "lon": 34.67645,
    "coastal": false,
    "districts": [
      {
        "name": "Altunhisar",
        "lat": 37.99159,
        "lon": 34.37334
      },
      {
        "name": "Bor",
        "lat": 37.89056,
        "lon": 34.55889
      },
      {
        "name": "Çamardı",
        "lat": 37.83222,
        "lon": 34.98139
      },
      {
        "name": "Çiftlik",
        "lat": 38.1758,
        "lon": 34.48535
      },
      {
        "name": "Merkez",
        "lat": 37.969849,
        "lon": 34.6764495
      },
      {
        "name": "Ulukışla",
        "lat": 38.05506,
        "lon": 34.31076
      }
    ]
  },
  {
    "id": "52",
    "name": "Ordu",
    "lat": 40.98523,
    "lon": 37.879773,
    "coastal": true,
    "districts": [
      {
        "name": "Akkuş",
        "lat": 40.79306,
        "lon": 37.01639
      },
      {
        "name": "Altınordu",
        "lat": 40.98404,
        "lon": 37.87348
      },
      {
        "name": "Aybastı",
        "lat": 40.68667,
        "lon": 37.39917
      },
      {
        "name": "Çamaş",
        "lat": 40.902,
        "lon": 37.52786
      },
      {
        "name": "Çatalpınar",
        "lat": 40.87899,
        "lon": 37.45351
      },
      {
        "name": "Çaybaşı",
        "lat": 41.01711,
        "lon": 37.09796
      },
      {
        "name": "Fatsa",
        "lat": 41.02886,
        "lon": 37.49977
      },
      {
        "name": "Gölköy",
        "lat": 40.68689,
        "lon": 37.61544
      },
      {
        "name": "Gülyalı",
        "lat": 40.96153,
        "lon": 38.04937
      },
      {
        "name": "Gürgentepe",
        "lat": 40.78995,
        "lon": 37.60073
      },
      {
        "name": "İkizce",
        "lat": 41.05833,
        "lon": 37.08028
      },
      {
        "name": "Kabadüz",
        "lat": 40.86096,
        "lon": 37.8847
      },
      {
        "name": "Kabataş",
        "lat": 40.75,
        "lon": 37.45
      },
      {
        "name": "Korgan",
        "lat": 40.82472,
        "lon": 37.34667
      },
      {
        "name": "Kumru",
        "lat": 40.87444,
        "lon": 37.26389
      },
      {
        "name": "Mesudiye",
        "lat": 40.45446,
        "lon": 37.77353
      },
      {
        "name": "Perşembe",
        "lat": 41.06556,
        "lon": 37.77139
      },
      {
        "name": "Ulubey",
        "lat": 40.86863,
        "lon": 37.75405
      },
      {
        "name": "Ünye",
        "lat": 41.14049,
        "lon": 37.28851
      }
    ]
  },
  {
    "id": "53",
    "name": "Rize",
    "lat": 41.024825,
    "lon": 40.519914,
    "coastal": true,
    "districts": [
      {
        "name": "Ardeşen",
        "lat": 41.19064,
        "lon": 40.97935
      },
      {
        "name": "Çamlıhemşin",
        "lat": 41.04765,
        "lon": 40.99996
      },
      {
        "name": "Çayeli",
        "lat": 41.08609,
        "lon": 40.72213
      },
      {
        "name": "Derepazarı",
        "lat": 41.02398,
        "lon": 40.42332
      },
      {
        "name": "Fındıklı",
        "lat": 41.269,
        "lon": 41.14002
      },
      {
        "name": "Güneysu",
        "lat": 40.9813,
        "lon": 40.60465
      },
      {
        "name": "Hemşin",
        "lat": 41.04777,
        "lon": 40.8984
      },
      {
        "name": "İkizdere",
        "lat": 40.77484,
        "lon": 40.55227
      },
      {
        "name": "İyidere",
        "lat": 41.01192,
        "lon": 40.36185
      },
      {
        "name": "Kalkandere",
        "lat": 40.92046,
        "lon": 40.43692
      },
      {
        "name": "Merkez",
        "lat": 41.0248249,
        "lon": 40.5199142
      },
      {
        "name": "Pazar",
        "lat": 41.18019,
        "lon": 40.88663
      }
    ]
  },
  {
    "id": "54",
    "name": "Sakarya",
    "lat": 40.772629,
    "lon": 30.403858,
    "coastal": true,
    "districts": [
      {
        "name": "Adapazarı",
        "lat": 40.78056,
        "lon": 30.40333
      },
      {
        "name": "Akyazı",
        "lat": 40.685,
        "lon": 30.62222
      },
      {
        "name": "Arifiye",
        "lat": 40.70036,
        "lon": 30.35076
      },
      {
        "name": "Erenler",
        "lat": 40.75504,
        "lon": 30.39344
      },
      {
        "name": "Ferizli",
        "lat": 40.94082,
        "lon": 30.48583
      },
      {
        "name": "Geyve",
        "lat": 40.5075,
        "lon": 30.2925
      },
      {
        "name": "Hendek",
        "lat": 40.79944,
        "lon": 30.74806
      },
      {
        "name": "Karapürçek",
        "lat": 40.64194,
        "lon": 30.53944
      },
      {
        "name": "Karasu",
        "lat": 41.10442,
        "lon": 30.69664
      },
      {
        "name": "Kaynarca",
        "lat": 41.03083,
        "lon": 30.3075
      },
      {
        "name": "Kocaali",
        "lat": 41.05336,
        "lon": 30.85278
      },
      {
        "name": "Pamukova",
        "lat": 40.5081,
        "lon": 30.16732
      },
      {
        "name": "Sapanca",
        "lat": 40.69141,
        "lon": 30.26738
      },
      {
        "name": "Serdivan",
        "lat": 40.77376,
        "lon": 30.38006
      },
      {
        "name": "Söğütlü",
        "lat": 40.9059,
        "lon": 30.47448
      },
      {
        "name": "Taraklı",
        "lat": 40.39694,
        "lon": 30.49278
      }
    ]
  },
  {
    "id": "55",
    "name": "Samsun",
    "lat": 41.294615,
    "lon": 36.33206,
    "coastal": true,
    "districts": [
      {
        "name": "19 Mayıs",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Alaçam",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Asarcık",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Atakum",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Ayvacık",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Bafra",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Canik",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Çarşamba",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Havza",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "İlkadım",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Kavak",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Ladik",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Salıpazarı",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Tekkeköy",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Terme",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Vezirköprü",
        "lat": 41.2946149,
        "lon": 36.3320596
      },
      {
        "name": "Yakakent",
        "lat": 41.2946149,
        "lon": 36.3320596
      }
    ]
  },
  {
    "id": "56",
    "name": "Siirt",
    "lat": 37.927362,
    "lon": 41.94218,
    "coastal": false,
    "districts": [
      {
        "name": "Baykan",
        "lat": 38.15754,
        "lon": 41.7733
      },
      {
        "name": "Eruh",
        "lat": 37.74183,
        "lon": 42.17422
      },
      {
        "name": "Kurtalan",
        "lat": 37.92533,
        "lon": 41.68493
      },
      {
        "name": "Merkez",
        "lat": 37.9273623,
        "lon": 41.94218
      },
      {
        "name": "Pervari",
        "lat": 37.93573,
        "lon": 42.54927
      },
      {
        "name": "Şirvan",
        "lat": 38.06251,
        "lon": 42.02517
      },
      {
        "name": "Tillo",
        "lat": 37.94911,
        "lon": 42.0121
      }
    ]
  },
  {
    "id": "57",
    "name": "Sinop",
    "lat": 42.02658,
    "lon": 35.151151,
    "coastal": true,
    "districts": [
      {
        "name": "Ayancık",
        "lat": 41.94472,
        "lon": 34.58611
      },
      {
        "name": "Boyabat",
        "lat": 41.46889,
        "lon": 34.76667
      },
      {
        "name": "Dikmen",
        "lat": 41.65,
        "lon": 35.26667
      },
      {
        "name": "Durağan",
        "lat": 41.41583,
        "lon": 35.05444
      },
      {
        "name": "Erfelek",
        "lat": 41.87926,
        "lon": 34.91838
      },
      {
        "name": "Gerze",
        "lat": 41.80361,
        "lon": 35.20111
      },
      {
        "name": "Merkez",
        "lat": 42.0265798,
        "lon": 35.1511512
      },
      {
        "name": "Saraydüzü",
        "lat": 41.32865,
        "lon": 34.84686
      },
      {
        "name": "Türkeli",
        "lat": 41.94764,
        "lon": 34.33861
      }
    ]
  },
  {
    "id": "58",
    "name": "Sivas",
    "lat": 39.750357,
    "lon": 37.014517,
    "coastal": false,
    "districts": [
      {
        "name": "Akıncılar",
        "lat": 40.07172,
        "lon": 38.3433
      },
      {
        "name": "Altınyayla",
        "lat": 39.27249,
        "lon": 36.75098
      },
      {
        "name": "Divriği",
        "lat": 39.371,
        "lon": 38.1137
      },
      {
        "name": "Doğanşar",
        "lat": 40.20841,
        "lon": 37.53123
      },
      {
        "name": "Gemerek",
        "lat": 39.18342,
        "lon": 36.07189
      },
      {
        "name": "Gölova",
        "lat": 40.06194,
        "lon": 38.60667
      },
      {
        "name": "Gürün",
        "lat": 38.72225,
        "lon": 37.27097
      },
      {
        "name": "Hafik",
        "lat": 39.85639,
        "lon": 37.38639
      },
      {
        "name": "İmranlı",
        "lat": 39.87544,
        "lon": 38.11358
      },
      {
        "name": "Kangal",
        "lat": 39.23354,
        "lon": 37.39111
      },
      {
        "name": "Koyulhisar",
        "lat": 40.30184,
        "lon": 37.82336
      },
      {
        "name": "Merkez",
        "lat": 39.7503574,
        "lon": 37.0145173
      },
      {
        "name": "Suşehri",
        "lat": 40.16005,
        "lon": 38.08413
      },
      {
        "name": "Şarkışla",
        "lat": 39.35186,
        "lon": 36.40976
      },
      {
        "name": "Ulaş",
        "lat": 39.44492,
        "lon": 37.039
      },
      {
        "name": "Yıldızeli",
        "lat": 39.86639,
        "lon": 36.59889
      },
      {
        "name": "Zara",
        "lat": 39.89778,
        "lon": 37.75833
      }
    ]
  },
  {
    "id": "59",
    "name": "Tekirdağ",
    "lat": 40.978121,
    "lon": 27.51078,
    "coastal": true,
    "districts": [
      {
        "name": "Çerkezköy",
        "lat": 41.28629,
        "lon": 27.99939
      },
      {
        "name": "Çorlu",
        "lat": 41.16069,
        "lon": 27.80093
      },
      {
        "name": "Ergene",
        "lat": 40.9781214,
        "lon": 27.5107799
      },
      {
        "name": "Hayrabolu",
        "lat": 41.21311,
        "lon": 27.10688
      },
      {
        "name": "Kapaklı",
        "lat": 41.32912,
        "lon": 27.98064
      },
      {
        "name": "Malkara",
        "lat": 40.89105,
        "lon": 26.90201
      },
      {
        "name": "Marmaraereğlisi",
        "lat": 40.9781214,
        "lon": 27.5107799
      },
      {
        "name": "Muratlı",
        "lat": 41.17216,
        "lon": 27.4992
      },
      {
        "name": "Saray",
        "lat": 41.44249,
        "lon": 27.92062
      },
      {
        "name": "Süleymanpaşa",
        "lat": 40.9781214,
        "lon": 27.5107799
      },
      {
        "name": "Şarköy",
        "lat": 40.61395,
        "lon": 27.11563
      }
    ]
  },
  {
    "id": "60",
    "name": "Tokat",
    "lat": 40.323353,
    "lon": 36.552162,
    "coastal": false,
    "districts": [
      {
        "name": "Almus",
        "lat": 40.37583,
        "lon": 36.90444
      },
      {
        "name": "Artova",
        "lat": 40.11578,
        "lon": 36.3001
      },
      {
        "name": "Başçiftlik",
        "lat": 40.54694,
        "lon": 37.16917
      },
      {
        "name": "Erbaa",
        "lat": 40.66889,
        "lon": 36.5675
      },
      {
        "name": "Merkez",
        "lat": 40.3233534,
        "lon": 36.552162
      },
      {
        "name": "Niksar",
        "lat": 40.59167,
        "lon": 36.95167
      },
      {
        "name": "Pazar",
        "lat": 40.27652,
        "lon": 36.28347
      },
      {
        "name": "Reşadiye",
        "lat": 40.39194,
        "lon": 37.3375
      },
      {
        "name": "Sulusaray",
        "lat": 39.99389,
        "lon": 36.08404
      },
      {
        "name": "Turhal",
        "lat": 40.3875,
        "lon": 36.08111
      },
      {
        "name": "Yeşilyurt",
        "lat": 40.0064,
        "lon": 36.22069
      },
      {
        "name": "Zile",
        "lat": 40.30306,
        "lon": 35.88639
      }
    ]
  },
  {
    "id": "61",
    "name": "Trabzon",
    "lat": 41.005461,
    "lon": 39.730146,
    "coastal": true,
    "districts": [
      {
        "name": "Akçaabat",
        "lat": 41.02121,
        "lon": 39.57146
      },
      {
        "name": "Araklı",
        "lat": 40.93854,
        "lon": 40.05842
      },
      {
        "name": "Arsin",
        "lat": 40.95271,
        "lon": 39.92674
      },
      {
        "name": "Beşikdüzü",
        "lat": 41.05202,
        "lon": 39.23294
      },
      {
        "name": "Çarşıbaşı",
        "lat": 41.08278,
        "lon": 39.38278
      },
      {
        "name": "Çaykara",
        "lat": 40.74267,
        "lon": 40.23175
      },
      {
        "name": "Dernekpazarı",
        "lat": 40.79658,
        "lon": 40.2446
      },
      {
        "name": "Düzköy",
        "lat": 40.87461,
        "lon": 39.41536
      },
      {
        "name": "Hayrat",
        "lat": 40.8853,
        "lon": 40.36495
      },
      {
        "name": "Köprübaşı",
        "lat": 40.80692,
        "lon": 40.11439
      },
      {
        "name": "Maçka",
        "lat": 40.81072,
        "lon": 39.60465
      },
      {
        "name": "Of",
        "lat": 40.94055,
        "lon": 40.25918
      },
      {
        "name": "Ortahisar",
        "lat": 41.0054605,
        "lon": 39.7301463
      },
      {
        "name": "Sürmene",
        "lat": 40.90588,
        "lon": 40.12792
      },
      {
        "name": "Şalpazarı",
        "lat": 40.93826,
        "lon": 39.19006
      },
      {
        "name": "Tonya",
        "lat": 40.88402,
        "lon": 39.28486
      },
      {
        "name": "Vakfıkebir",
        "lat": 41.04583,
        "lon": 39.27639
      },
      {
        "name": "Yomra",
        "lat": 40.95326,
        "lon": 39.85546
      }
    ]
  },
  {
    "id": "62",
    "name": "Tunceli",
    "lat": 39.106064,
    "lon": 39.548269,
    "coastal": false,
    "districts": [
      {
        "name": "Çemişgezek",
        "lat": 39.05539,
        "lon": 38.90754
      },
      {
        "name": "Hozat",
        "lat": 39.10029,
        "lon": 39.20816
      },
      {
        "name": "Mazgirt",
        "lat": 39.01783,
        "lon": 39.60064
      },
      {
        "name": "Merkez",
        "lat": 39.1060641,
        "lon": 39.5482693
      },
      {
        "name": "Nazımiye",
        "lat": 39.17986,
        "lon": 39.82843
      },
      {
        "name": "Ovacık",
        "lat": 39.35259,
        "lon": 39.2089
      },
      {
        "name": "Pertek",
        "lat": 38.86574,
        "lon": 39.32273
      },
      {
        "name": "Pülümür",
        "lat": 39.1060641,
        "lon": 39.5482693
      }
    ]
  },
  {
    "id": "63",
    "name": "Şanlıurfa",
    "lat": 37.159624,
    "lon": 38.791929,
    "coastal": false,
    "districts": [
      {
        "name": "Akçakale",
        "lat": 36.71111,
        "lon": 38.9475
      },
      {
        "name": "Birecik",
        "lat": 37.02577,
        "lon": 37.97841
      },
      {
        "name": "Bozova",
        "lat": 37.3625,
        "lon": 38.52667
      },
      {
        "name": "Ceylanpınar",
        "lat": 36.84722,
        "lon": 40.05
      },
      {
        "name": "Eyyübiye",
        "lat": 37.1596239,
        "lon": 38.791929
      },
      {
        "name": "Halfeti",
        "lat": 37.24529,
        "lon": 37.86874
      },
      {
        "name": "Haliliye",
        "lat": 37.1596239,
        "lon": 38.791929
      },
      {
        "name": "Harran",
        "lat": 36.86,
        "lon": 39.03139
      },
      {
        "name": "Hilvan",
        "lat": 37.58687,
        "lon": 38.95505
      },
      {
        "name": "Karaköprü",
        "lat": 37.20361,
        "lon": 38.79944
      },
      {
        "name": "Siverek",
        "lat": 37.75503,
        "lon": 39.31667
      },
      {
        "name": "Suruç",
        "lat": 36.97612,
        "lon": 38.42533
      },
      {
        "name": "Viranşehir",
        "lat": 37.22349,
        "lon": 39.75519
      }
    ]
  },
  {
    "id": "64",
    "name": "Uşak",
    "lat": 38.67404,
    "lon": 29.405842,
    "coastal": false,
    "districts": [
      {
        "name": "Banaz",
        "lat": 38.73707,
        "lon": 29.75194
      },
      {
        "name": "Eşme",
        "lat": 38.39976,
        "lon": 28.96905
      },
      {
        "name": "Karahallı",
        "lat": 38.32083,
        "lon": 29.53028
      },
      {
        "name": "Merkez",
        "lat": 38.6740401,
        "lon": 29.4058419
      },
      {
        "name": "Sivaslı",
        "lat": 38.49944,
        "lon": 29.68361
      },
      {
        "name": "Ulubey",
        "lat": 38.41987,
        "lon": 29.29129
      }
    ]
  },
  {
    "id": "65",
    "name": "Van",
    "lat": 38.500875,
    "lon": 43.394605,
    "coastal": false,
    "districts": [
      {
        "name": "Bahçesaray",
        "lat": 38.1246,
        "lon": 42.79825
      },
      {
        "name": "Başkale",
        "lat": 38.04526,
        "lon": 44.01718
      },
      {
        "name": "Çaldıran",
        "lat": 39.14317,
        "lon": 43.91068
      },
      {
        "name": "Çatak",
        "lat": 38.00293,
        "lon": 43.05243
      },
      {
        "name": "Edremit",
        "lat": 38.42069,
        "lon": 43.25889
      },
      {
        "name": "Erciş",
        "lat": 39.02587,
        "lon": 43.35964
      },
      {
        "name": "Gevaş",
        "lat": 38.2921,
        "lon": 43.10189
      },
      {
        "name": "Gürpınar",
        "lat": 38.32372,
        "lon": 43.40991
      },
      {
        "name": "İpekyolu",
        "lat": 38.500875,
        "lon": 43.3946051
      },
      {
        "name": "Muradiye",
        "lat": 38.98568,
        "lon": 43.7531
      },
      {
        "name": "Özalp",
        "lat": 38.65455,
        "lon": 43.98869
      },
      {
        "name": "Saray",
        "lat": 38.64691,
        "lon": 44.16116
      },
      {
        "name": "Tuşba",
        "lat": 38.500875,
        "lon": 43.3946051
      }
    ]
  },
  {
    "id": "66",
    "name": "Yozgat",
    "lat": 39.822197,
    "lon": 34.808097,
    "coastal": false,
    "districts": [
      {
        "name": "Akdağmadeni",
        "lat": 39.66028,
        "lon": 35.88361
      },
      {
        "name": "Aydıncık",
        "lat": 40.12727,
        "lon": 35.28765
      },
      {
        "name": "Boğazlıyan",
        "lat": 39.18877,
        "lon": 35.24537
      },
      {
        "name": "Çandır",
        "lat": 39.24446,
        "lon": 35.51396
      },
      {
        "name": "Çayıralan",
        "lat": 39.30278,
        "lon": 35.64389
      },
      {
        "name": "Çekerek",
        "lat": 40.07306,
        "lon": 35.49472
      },
      {
        "name": "Kadışehri",
        "lat": 39.99568,
        "lon": 35.79193
      },
      {
        "name": "Merkez",
        "lat": 39.8221974,
        "lon": 34.8080972
      },
      {
        "name": "Saraykent",
        "lat": 39.69361,
        "lon": 35.51111
      },
      {
        "name": "Sarıkaya",
        "lat": 39.49361,
        "lon": 35.37694
      },
      {
        "name": "Sorgun",
        "lat": 39.81012,
        "lon": 35.18596
      },
      {
        "name": "Şefaatli",
        "lat": 39.8221974,
        "lon": 34.8080972
      },
      {
        "name": "Yenifakılı",
        "lat": 39.21142,
        "lon": 35.00036
      },
      {
        "name": "Yerköy",
        "lat": 39.63806,
        "lon": 34.46722
      }
    ]
  },
  {
    "id": "67",
    "name": "Zonguldak",
    "lat": 41.452677,
    "lon": 31.787598,
    "coastal": true,
    "districts": [
      {
        "name": "Alaplı",
        "lat": 41.1814,
        "lon": 31.38514
      },
      {
        "name": "Çaycuma",
        "lat": 41.42639,
        "lon": 32.07556
      },
      {
        "name": "Devrek",
        "lat": 41.21917,
        "lon": 31.95583
      },
      {
        "name": "Ereğli",
        "lat": 41.28261,
        "lon": 31.41806
      },
      {
        "name": "Gökçebey",
        "lat": 41.30583,
        "lon": 32.14234
      },
      {
        "name": "Kilimli",
        "lat": 41.49111,
        "lon": 31.83861
      },
      {
        "name": "Kozlu",
        "lat": 41.43194,
        "lon": 31.74583
      },
      {
        "name": "Merkez",
        "lat": 41.4526765,
        "lon": 31.787598
      }
    ]
  },
  {
    "id": "68",
    "name": "Aksaray",
    "lat": 38.370542,
    "lon": 34.026907,
    "coastal": false,
    "districts": [
      {
        "name": "Ağaçören",
        "lat": 38.87484,
        "lon": 33.91674
      },
      {
        "name": "Eskil",
        "lat": 38.40167,
        "lon": 33.41306
      },
      {
        "name": "Gülağaç",
        "lat": 38.39576,
        "lon": 34.34576
      },
      {
        "name": "Güzelyurt",
        "lat": 38.27722,
        "lon": 34.37194
      },
      {
        "name": "Merkez",
        "lat": 38.3705416,
        "lon": 34.026907
      },
      {
        "name": "Ortaköy",
        "lat": 38.73728,
        "lon": 34.03866
      },
      {
        "name": "Sarıyahşi",
        "lat": 38.98349,
        "lon": 33.84136
      },
      {
        "name": "Sultanhanı",
        "lat": 38.2471,
        "lon": 33.54961
      }
    ]
  },
  {
    "id": "69",
    "name": "Bayburt",
    "lat": 40.255161,
    "lon": 40.220504,
    "coastal": false,
    "districts": [
      {
        "name": "Aydıntepe",
        "lat": 40.38325,
        "lon": 40.14272
      },
      {
        "name": "Demirözü",
        "lat": 40.16023,
        "lon": 39.89239
      },
      {
        "name": "Merkez",
        "lat": 40.2551608,
        "lon": 40.2205036
      }
    ]
  },
  {
    "id": "70",
    "name": "Karaman",
    "lat": 37.18085,
    "lon": 33.219455,
    "coastal": false,
    "districts": [
      {
        "name": "Ayrancı",
        "lat": 37.36127,
        "lon": 33.6883
      },
      {
        "name": "Başyayla",
        "lat": 36.75337,
        "lon": 32.68018
      },
      {
        "name": "Ermenek",
        "lat": 36.64043,
        "lon": 32.89179
      },
      {
        "name": "Kazımkarabekir",
        "lat": 37.23028,
        "lon": 32.95889
      },
      {
        "name": "Merkez",
        "lat": 36.69848,
        "lon": 32.61814
      },
      {
        "name": "Sarıveliler",
        "lat": 36.69759,
        "lon": 32.61673
      }
    ]
  },
  {
    "id": "71",
    "name": "Kırıkkale",
    "lat": 39.841048,
    "lon": 33.505854,
    "coastal": false,
    "districts": [
      {
        "name": "Bahşılı",
        "lat": 39.80017,
        "lon": 33.43701
      },
      {
        "name": "Balışeyh",
        "lat": 39.91411,
        "lon": 33.72333
      },
      {
        "name": "Çelebi",
        "lat": 39.46418,
        "lon": 33.5241
      },
      {
        "name": "Delice",
        "lat": 39.95371,
        "lon": 34.02587
      },
      {
        "name": "Karakeçili",
        "lat": 39.59417,
        "lon": 33.37778
      },
      {
        "name": "Keskin",
        "lat": 39.67306,
        "lon": 33.61361
      },
      {
        "name": "Merkez",
        "lat": 39.84104835,
        "lon": 33.5058536
      },
      {
        "name": "Sulakyurt",
        "lat": 40.15733,
        "lon": 33.716
      },
      {
        "name": "Yahşihan",
        "lat": 39.85028,
        "lon": 33.45294
      }
    ]
  },
  {
    "id": "72",
    "name": "Batman",
    "lat": 37.883574,
    "lon": 41.127757,
    "coastal": false,
    "districts": [
      {
        "name": "Beşiri",
        "lat": 37.91573,
        "lon": 41.2865
      },
      {
        "name": "Gercüş",
        "lat": 37.56249,
        "lon": 41.37753
      },
      {
        "name": "Hasankeyf",
        "lat": 37.70612,
        "lon": 41.4048
      },
      {
        "name": "Kozluk",
        "lat": 38.19118,
        "lon": 41.47775
      },
      {
        "name": "Merkez",
        "lat": 37.8835738,
        "lon": 41.1277565
      },
      {
        "name": "Sason",
        "lat": 38.32767,
        "lon": 41.41377
      }
    ]
  },
  {
    "id": "73",
    "name": "Şırnak",
    "lat": 37.521958,
    "lon": 42.457031,
    "coastal": false,
    "districts": [
      {
        "name": "Beytüşşebap",
        "lat": 37.56318,
        "lon": 43.16583
      },
      {
        "name": "Cizre",
        "lat": 37.33024,
        "lon": 42.18484
      },
      {
        "name": "Güçlükonak",
        "lat": 37.46957,
        "lon": 41.90593
      },
      {
        "name": "İdil",
        "lat": 37.33481,
        "lon": 41.88944
      },
      {
        "name": "Merkez",
        "lat": 37.5219577,
        "lon": 42.4570311
      },
      {
        "name": "Silopi",
        "lat": 37.24379,
        "lon": 42.46345
      },
      {
        "name": "Uludere",
        "lat": 37.44074,
        "lon": 42.85236
      }
    ]
  },
  {
    "id": "74",
    "name": "Bartın",
    "lat": 41.635046,
    "lon": 32.336621,
    "coastal": true,
    "districts": [
      {
        "name": "Amasra",
        "lat": 41.74633,
        "lon": 32.38633
      },
      {
        "name": "Kurucaşile",
        "lat": 41.83781,
        "lon": 32.71621
      },
      {
        "name": "Merkez",
        "lat": 41.6350461,
        "lon": 32.3366205
      },
      {
        "name": "Ulus",
        "lat": 41.58417,
        "lon": 32.64139
      }
    ]
  },
  {
    "id": "75",
    "name": "Ardahan",
    "lat": 41.110297,
    "lon": 42.703559,
    "coastal": false,
    "districts": [
      {
        "name": "Çıldır",
        "lat": 41.12525,
        "lon": 43.13645
      },
      {
        "name": "Damal",
        "lat": 41.34145,
        "lon": 42.8368
      },
      {
        "name": "Göle",
        "lat": 40.78746,
        "lon": 42.60603
      },
      {
        "name": "Hanak",
        "lat": 41.23344,
        "lon": 42.84037
      },
      {
        "name": "Merkez",
        "lat": 41.1102966,
        "lon": 42.7035585
      },
      {
        "name": "Posof",
        "lat": 41.51111,
        "lon": 42.72917
      }
    ]
  },
  {
    "id": "76",
    "name": "Iğdır",
    "lat": 39.921878,
    "lon": 44.046796,
    "coastal": false,
    "districts": [
      {
        "name": "Aralık",
        "lat": 39.87278,
        "lon": 44.51917
      },
      {
        "name": "Karakoyunlu",
        "lat": 39.87036,
        "lon": 43.63014
      },
      {
        "name": "Merkez",
        "lat": 39.9218784,
        "lon": 44.0467957
      },
      {
        "name": "Tuzluca",
        "lat": 40.03871,
        "lon": 43.65208
      }
    ]
  },
  {
    "id": "77",
    "name": "Yalova",
    "lat": 40.658253,
    "lon": 29.269992,
    "coastal": true,
    "districts": [
      {
        "name": "Altınova",
        "lat": 40.69495,
        "lon": 29.50986
      },
      {
        "name": "Armutlu",
        "lat": 40.51944,
        "lon": 28.82806
      },
      {
        "name": "Çınarcık",
        "lat": 40.64538,
        "lon": 29.1245
      },
      {
        "name": "Çiftlikköy",
        "lat": 40.66028,
        "lon": 29.32361
      },
      {
        "name": "Merkez",
        "lat": 40.6582529,
        "lon": 29.2699916
      },
      {
        "name": "Termal",
        "lat": 40.60739,
        "lon": 29.17306
      }
    ]
  },
  {
    "id": "78",
    "name": "Karabük",
    "lat": 41.19554,
    "lon": 32.623115,
    "coastal": false,
    "districts": [
      {
        "name": "Eflani",
        "lat": 41.42289,
        "lon": 32.95761
      },
      {
        "name": "Eskipazar",
        "lat": 40.94298,
        "lon": 32.53091
      },
      {
        "name": "Merkez",
        "lat": 41.1955402,
        "lon": 32.6231154
      },
      {
        "name": "Ovacık",
        "lat": 41.07661,
        "lon": 32.91994
      },
      {
        "name": "Safranbolu",
        "lat": 41.25083,
        "lon": 32.69417
      },
      {
        "name": "Yenice",
        "lat": 41.19962,
        "lon": 32.33133
      }
    ]
  },
  {
    "id": "79",
    "name": "Kilis",
    "lat": 36.716555,
    "lon": 37.114607,
    "coastal": false,
    "districts": [
      {
        "name": "Elbeyli",
        "lat": 36.67417,
        "lon": 37.46667
      },
      {
        "name": "Merkez",
        "lat": 36.7165552,
        "lon": 37.1146069
      },
      {
        "name": "Musabeyli",
        "lat": 36.88639,
        "lon": 36.91861
      },
      {
        "name": "Polateli",
        "lat": 36.84137,
        "lon": 37.14407
      }
    ]
  },
  {
    "id": "80",
    "name": "Osmaniye",
    "lat": 37.073359,
    "lon": 36.250767,
    "coastal": false,
    "districts": [
      {
        "name": "Bahçe",
        "lat": 37.20422,
        "lon": 36.175
      },
      {
        "name": "Düziçi",
        "lat": 37.24216,
        "lon": 36.45484
      },
      {
        "name": "Hasanbeyli",
        "lat": 37.12838,
        "lon": 36.54608
      },
      {
        "name": "Kadirli",
        "lat": 37.37389,
        "lon": 36.09611
      },
      {
        "name": "Merkez",
        "lat": 37.0733588,
        "lon": 36.2507673
      },
      {
        "name": "Sumbas",
        "lat": 37.4513,
        "lon": 36.02349
      },
      {
        "name": "Toprakkale",
        "lat": 37.06855,
        "lon": 36.14661
      }
    ]
  },
  {
    "id": "81",
    "name": "Düzce",
    "lat": 40.839153,
    "lon": 31.159536,
    "coastal": true,
    "districts": [
      {
        "name": "Akçakoca",
        "lat": 41.08935,
        "lon": 31.12362
      },
      {
        "name": "Cumayeri",
        "lat": 40.87389,
        "lon": 30.95091
      },
      {
        "name": "Çilimli",
        "lat": 40.89361,
        "lon": 31.04917
      },
      {
        "name": "Gölyaka",
        "lat": 40.7769,
        "lon": 30.99587
      },
      {
        "name": "Gümüşova",
        "lat": 40.84694,
        "lon": 30.94111
      },
      {
        "name": "Kaynaşlı",
        "lat": 40.76917,
        "lon": 31.32211
      },
      {
        "name": "Merkez",
        "lat": 40.77353,
        "lon": 31.31945
      },
      {
        "name": "Yığılca",
        "lat": 40.95983,
        "lon": 31.44355
      }
    ]
  }
]
