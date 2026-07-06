/**
 * Firestore veri modelleri — referans (gerçek doğrulama kurallarda ve uygulama kodunda).
 * Timestamp: Firestore FieldValue / Timestamp
 */

/** @typedef {'string'|'number'|'boolean'|'timestamp'|'string[]'|'map'} FieldType */

/**
 * users/{uid}
 */
export const UsersSchema = {
  email: 'string',
  /** Benzersiz operatör kullanıcı adı (küçük harf / normalize edilmiş) */
  username: 'string',
  callsign: 'string',
  displayName: 'string',
  bloodType: 'string',
  status: 'string',
  role: 'string',
  allergies: 'string',
  drugSensitivity: 'string',
  importantNotes: 'string',
  enrolledAt: 'timestamp',
  updatedAt: 'timestamp',
}

/**
 * inventory/{uid} — kullanıcı envanter özeti (tek belge)
 */
export const InventorySummarySchema = {
  ownerId: 'string',
  itemCount: 'number',
  lastSyncAt: 'timestamp',
  updatedAt: 'timestamp',
}

/**
 * inventory/{uid}/items/{itemId}
 */
export const InventoryItemSchema = {
  ownerId: 'string',
  name: 'string',
  /** Legacy: Silah | Mühimmat | Optik | Ekipman */
  category: 'string',
  /** ILWS: P_TFK | T_TAB | AV_TFK | KNT | OPT | MHM */
  tacticalCategory: 'string',
  /** OPTIK | LAZER | FENER | TUTAMAK_SUSTURUCU */
  accessoryKind: 'string',
  technicalDescription: 'string',
  quantity: 'number',
  serial: 'string',
  serialNo: 'string',
  brand: 'string',
  calibre: 'string',
  notes: 'string',
  /** 1–100 silah kondisyon yüzdesi */
  conditionPercent: 'number',
  /** AKTİF | BAKIMDA | GÖREV_DIŞI */
  operationalStatus: 'string',
  attachmentLink: 'string',
  linkedWeaponName: 'string',
  ballisticType: 'string',
  munitionType: 'string',
  ammoType: 'string',
  /** { date, text, status }[] */
  attachmentHistoryEntries: 'string',
  attachmentHistoryCount: 'number',
  weaponType: 'string',
  effectiveRange: 'string',
  total_rounds_fired: 'number',
  manual_rounds_fired: 'number',
  max_barrel_life: 'number',
  attached_accessory_id: 'string',
  mountedOnWeaponId: 'string',
  /** { date, rounds_at_maintenance, maintenanceType, note }[] */
  maintenance_logs: 'string',
  /** Mühimmat birim fiyatı (TRY) */
  unitPrice: 'number',
  weight: 'string',
  lastMaintenanceAt: 'string',
  /** Silah envanter kayıt tarihi (YYYY-MM-DD), oluşturma anında kilitlenir */
  created_at: 'string',
  /** Dashboard SİSTEM_GÜNLÜĞÜ — son audit */
  auditLogCode: 'string',
  auditLogMsg: 'string',
  /** Silah (P_TFK/T_TAB/AV_TFK/KNT) — balistik opsiyonel */
  barrelLength: 'number|null',
  twistRate: 'string|null',
  muzzleVelocity: 'number|null',
  sightHeightDefault: 'number|null',
  /** Optik (OPT + OPTIK) — balistik opsiyonel */
  clickUnitSystem: 'string|null',
  magnification: 'string|null',
  clickValueMoa: 'number|null',
  clickValueMrad: 'number|null',
  ffpSfp: 'string|null',
  reticleType: 'string|null',
  /** Mühimmat (MHM) — balistik opsiyonel */
  bulletWeight: 'number|null',
  bulletDiameter: 'number|null',
  ballisticCoefficient: 'number|null',
  bcModel: 'string|null',
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
}

/**
 * envanter/{itemId} — legacy / toplu giriş kalemleri
 */
export const EnvanterLegacySchema = {
  ownerId: 'string',
  name: 'string',
  quantity: 'number',
  serial: 'string',
  category: 'string',
  source: 'string',
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
}

/**
 * doktrinler/{docId}
 */
export const DoctrinesSchema = {
  title: 'string',
  teaser: 'string',
  body: 'string',
  category: 'string',
  isPublic: 'boolean',
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
}

/**
 * missions/{missionId} — AAR alanları şema genişlemesi (Firestore)
 * @see Missions.jsx
 */
export const MissionsSchema = {
  ownerId: 'string',
  title: 'string',
  description: 'string',
  /** Kısa debriefing (OP_ADI dışında) */
  debriefingNotes: 'string',
  status: 'string',
  visibility: 'string',
  assigneeIds: 'string[]',
  dueAt: 'timestamp',
  /** cqb | milsim | sabotaj | real */
  missionType: 'string',
  /** success | partial | failure | planning */
  aarOutcome: 'string',
  hitsCount: 'number',
  casualtiesCount: 'number',
  terrainRegion: 'string',
  /** Operasyon başlangıç (boşsa filtre/süre için createdAt) */
  startedAt: 'timestamp',
  /** Operasyon bitiş */
  endedAt: 'timestamp',
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
}

/**
 * range_logs/{uid}/entries/{entryId} — atış / range log (useAudazData('range_logs'))
 */
export const RangeLogEntrySchema = {
  ownerId: 'string',
  status: 'string',
  weaponInventoryId: 'string',
  weaponLabel: 'string',
  ammoInventoryId: 'string',
  unitPrice: 'number',
  totalCost: 'number',
  distanceM: 'number',
  roundsTotal: 'number',
  hits: 'number',
  accuracy: 'number',
  shootType: 'string',
  kind: 'string',
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
}

/**
 * trainings/{trainingId} — antrenman / atış günlüğü vb. (dataManager + useAudazData)
 */
export const TrainingsSchema = {
  ownerId: 'string',
  title: 'string',
  notes: 'string',
  status: 'string',
  discipline: 'string',
  performedAt: 'timestamp',
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
}

/**
 * health_records/{uid} — özet
 */
export const HealthRecordsSummarySchema = {
  ownerId: 'string',
  bloodType: 'string',
  lastTcccAt: 'timestamp',
  updatedAt: 'timestamp',
}

/**
 * health_records/{uid}/records/{recordId}
 */
export const HealthRecordEntrySchema = {
  ownerId: 'string',
  type: 'string',
  notes: 'string',
  severity: 'string',
  recordedAt: 'timestamp',
  updatedAt: 'timestamp',
}

/**
 * egitim_videolari/{docId}
 */
export const TrainingVideosSchema = {
  title: 'string',
  url: 'string',
  createdAt: 'timestamp',
}

/**
 * usernames/{normalizedUsername} — { uid }
 */
export const UsernamesMapSchema = {
  uid: 'string',
}

/**
 * ballistic_profiles/{uid}/profiles/{profileId}
 */
export const BallisticProfileSchema = {
  profileName: 'string',
  linkedWeaponId: 'string|null',
  linkedOpticId: 'string|null',
  linkedAmmoId: 'string|null',
  /** { barrelLength, twistRate, sightHeight, zeroDistance } */
  weapon: 'map',
  /** { magnification, clickUnitSystem, clickValueMoa, clickValueMrad, ffpSfp, reticleType } */
  optic: 'map',
  /** { bulletWeight, bulletDiameter, muzzleVelocity, ballisticCoefficient, bcModel } */
  ammo: 'map',
  /** { coriolisEnabled, latitude, azimuthDegrees, pressureType } */
  advanced: 'map',
  ownerId: 'string',
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
  status: 'string',
}

/** @typedef {Object} BallisticProfileWeaponFields
 * @property {number|null} barrelLength — inç
 * @property {string|null} twistRate — örn. "1:8"
 * @property {number} sightHeight — cm
 * @property {number} zeroDistance — m
 */

/** @typedef {Object} BallisticProfileOpticFields
 * @property {'MOA'|'MRAD'|null} clickUnitSystem
 * @property {string|null} magnification
 * @property {number|null} clickValueMoa
 * @property {number|null} clickValueMrad
 * @property {'FFP'|'SFP'|null} ffpSfp
 * @property {string|null} reticleType
 */

/** @typedef {Object} BallisticProfileAmmoFields
 * @property {number} bulletWeight — grain
 * @property {number} bulletDiameter — inç
 * @property {number} muzzleVelocity — fps
 * @property {number} ballisticCoefficient
 * @property {'G1'|'G7'} bcModel
 */

/** @typedef {Object} BallisticProfileAdvancedFields
 * @property {boolean} coriolisEnabled
 * @property {number|null} latitude
 * @property {number|null} azimuthDegrees
 * @property {'station'|'sea-level'} pressureType
 */

/** @typedef {Object} BallisticProfileDocument
 * @property {string} [id]
 * @property {string} profileName
 * @property {string|null} linkedWeaponId
 * @property {string|null} linkedOpticId
 * @property {string|null} linkedAmmoId
 * @property {BallisticProfileWeaponFields} weapon
 * @property {BallisticProfileOpticFields} optic
 * @property {BallisticProfileAmmoFields} ammo
 * @property {BallisticProfileAdvancedFields} advanced
 * @property {string} [ownerId]
 * @property {import('firebase/firestore').Timestamp} [createdAt]
 * @property {import('firebase/firestore').Timestamp} [updatedAt]
 * @property {string} [status]
 */

/** Tüm koleksiyon adları */
export const COLLECTIONS = {
  users: 'users',
  usernames: 'usernames',
  inventory: 'inventory',
  inventoryItems: 'items',
  ballisticProfiles: 'ballistic_profiles',
  ballisticProfileItems: 'profiles',
  envanter: 'envanter',
  doktrinler: 'doktrinler',
  missions: 'missions',
  trainings: 'trainings',
  healthRecords: 'health_records',
  rangeLogs: 'range_logs',
  rangeLogEntries: 'entries',
  egitimVideolari: 'egitim_videolari',
}
