import {
  DEFYN_BACKUP_FORMAT,
  DEFYN_BACKUP_VERSION,
  type DefynBackup,
  type DefynBackupData,
} from '../../domain/export/export-format';
import { migrateProgressPhotoToV5, migrateProgressRecordToV5 } from '../../infrastructure/indexed-db/migration-v5';

export interface BackupGateway {
  readAll(): Promise<DefynBackupData>;
  replaceAll(data: DefynBackupData): Promise<void>;
  clearAll(): Promise<void>;
}

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSupportedBackupMediaDataUrl(value: string): boolean {
  // Mirrors the formats accepted by image processing. SVG and arbitrary data URLs
  // are intentionally excluded before any database replacement can begin.
  return /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}

const collectionNames: readonly (keyof DefynBackupData)[] = [
  'profiles',
  'nutritionTargets',
  'foods',
  'recipes',
  'diaryEntries',
  'mealCategories',
  'waterEntries',
  'progressRecords',
  'progressPhotos',
  'preferences',
  'foodPreferences',
  'favoriteMeals',
  'media',
  'trainingProfiles',
  'exercises',
  'exerciseFavorites',
  'workoutPlans',
  'workoutSessions',
  'workoutSetLogs',
  'dailyNutritionSummaries',
  'routineProfiles',
  'routineDays',
  'sleepRecords',
  'reminderSnoozes',
];

export function validateBackup(value: unknown): DefynBackup {
  if (!isRecord(value) || value.format !== DEFYN_BACKUP_FORMAT) {
    throw new BackupValidationError('Este arquivo não é um backup do DEFYN.');
  }
  if (![1, 2, 3, 4, 5, 6, DEFYN_BACKUP_VERSION].includes(Number(value.version))) {
    throw new BackupValidationError('A versão deste backup não é compatível com o aplicativo.');
  }
  if (typeof value.exportedAt !== 'string' || !isRecord(value.data)) {
    throw new BackupValidationError('O backup está incompleto ou corrompido.');
  }
  let candidate: Record<string, unknown> = value;
  if (candidate.version === 1 || candidate.version === 2) {
    const legacyData = candidate.data as Record<string, unknown>;
    candidate = { ...candidate, version: DEFYN_BACKUP_VERSION, data: {
      ...legacyData,
      progressRecords: Array.isArray(legacyData.progressRecords)
        ? legacyData.progressRecords.map((record) => isRecord(record) ? migrateProgressRecordToV5(record as never) : record)
        : [],
      progressPhotos: Array.isArray(legacyData.progressPhotos)
        ? legacyData.progressPhotos.map((photo) => isRecord(photo) ? migrateProgressPhotoToV5(photo as never) : photo)
        : [],
      foodPreferences: Array.isArray(legacyData.foodPreferences) ? legacyData.foodPreferences : [],
      favoriteMeals: Array.isArray(legacyData.favoriteMeals) ? legacyData.favoriteMeals : [],
      media: Array.isArray(legacyData.media) ? legacyData.media : [],
      trainingProfiles: [], exercises: [], exerciseFavorites: [], workoutPlans: [], workoutSessions: [], workoutSetLogs: [],
    } };
  }
  if (candidate.version === 3) {
    const legacyData = candidate.data as Record<string, unknown>;
    candidate = { ...candidate, version: DEFYN_BACKUP_VERSION, data: {
      ...legacyData,
      progressRecords: Array.isArray(legacyData.progressRecords)
        ? legacyData.progressRecords.map((record) => isRecord(record) ? migrateProgressRecordToV5(record as never) : record)
        : [],
      progressPhotos: Array.isArray(legacyData.progressPhotos)
        ? legacyData.progressPhotos.map((photo) => isRecord(photo) ? migrateProgressPhotoToV5(photo as never) : photo)
        : [],
    } };
  }
  if ([1, 2, 3, 4, 5].includes(Number(candidate.version))) {
    const legacyData = candidate.data as Record<string, unknown>;
    candidate = { ...candidate, version: DEFYN_BACKUP_VERSION, data: {
      ...legacyData,
      dailyNutritionSummaries: Array.isArray(legacyData.dailyNutritionSummaries) ? legacyData.dailyNutritionSummaries : [],
    } };
  }
  if (isRecord(candidate.data) && !Array.isArray(candidate.data.dailyNutritionSummaries)) {
    candidate = { ...candidate, data: { ...candidate.data, dailyNutritionSummaries: [] } };
  }
  const candidateData = isRecord(candidate.data) ? candidate.data : undefined;
  if (candidateData && ['routineProfiles', 'routineDays', 'sleepRecords', 'reminderSnoozes'].some((name) => !Array.isArray(candidateData[name]))) {
    candidate = { ...candidate, version: DEFYN_BACKUP_VERSION, data: {
      ...candidateData,
      routineProfiles: [], routineDays: [], sleepRecords: [], reminderSnoozes: [],
    } };
  }
  if (!isRecord(candidate.data)) throw new BackupValidationError('O backup está incompleto ou corrompido.');
  const data = candidate.data;
  for (const name of collectionNames) {
    if (!Array.isArray(data[name])) {
      throw new BackupValidationError(`A coleção ${name} está ausente ou inválida.`);
    }
  }
  const profiles = data.profiles;
  const preferences = data.preferences;
  if (!Array.isArray(profiles) || !Array.isArray(preferences)) {
    throw new BackupValidationError('Perfis ou preferências inválidos.');
  }
  if (!profiles.every((profile) => isRecord(profile) && typeof profile.id === 'string' && typeof profile.name === 'string')) {
    throw new BackupValidationError('A coleção de perfis contém dados inválidos.');
  }
  const profileIds = new Set(profiles.map((profile) => profile.id));
  for (const name of ['routineProfiles', 'routineDays', 'sleepRecords', 'reminderSnoozes'] as const) {
    const collection = data[name] as unknown[];
    if (!collection.every((item) => isRecord(item) && typeof item.id === 'string' && typeof item.profileId === 'string' && profileIds.has(item.profileId))) {
      throw new BackupValidationError(`A coleção ${name} contém dados sem perfil válido.`);
    }
  }
  if (!(data.routineDays as unknown[]).every((item) => isRecord(item) && typeof item.dayOfWeek === 'string' && ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].includes(item.dayOfWeek))) {
    throw new BackupValidationError('A coleção routineDays contém dia inválido.');
  }
  if (!(data.sleepRecords as unknown[]).every((item) => isRecord(item) && typeof item.localDate === 'string' && typeof item.sleepStartedAt === 'string' && typeof item.wokeAt === 'string' && typeof item.durationMinutes === 'number' && item.durationMinutes > 0)) {
    throw new BackupValidationError('A coleção sleepRecords contém registro inválido.');
  }
  const dailyNutritionSummaries = data.dailyNutritionSummaries as unknown[];
  if (!dailyNutritionSummaries.every((item) => isRecord(item) && typeof item.id === 'string' && typeof item.profileId === 'string' && profileIds.has(item.profileId) && typeof item.localDate === 'string' && ['caloriesKcal','proteinG','carbohydratesG','fatG'].every((key) => item[key] === undefined || (typeof item[key] === 'number' && Number.isFinite(item[key]) && item[key] >= 0)))) {
    throw new BackupValidationError('A coleção dailyNutritionSummaries contém resumo inválido.');
  }
  const progressRecords = data.progressRecords as unknown[];
  if (!progressRecords.every((item) => isRecord(item) && typeof item.id === 'string' && typeof item.profileId === 'string' && profileIds.has(item.profileId) && typeof item.localDate === 'string' && typeof item.occurredAt === 'string' && (item.weightKg === undefined || (typeof item.weightKg === 'number' && Number.isFinite(item.weightKg) && item.weightKg > 0)))) {
    throw new BackupValidationError('A coleção progressRecords contém registro corporal inválido.');
  }
  const recordIds = new Set(progressRecords.filter(isRecord).map((item) => item.id));
  const media = data.media as unknown[];
  if (!media.every((item) => isRecord(item) && typeof item.id === 'string' && typeof item.dataUrl === 'string' && isSupportedBackupMediaDataUrl(item.dataUrl) && typeof item.sizeBytes === 'number' && Number.isFinite(item.sizeBytes) && item.sizeBytes >= 0)) {
    throw new BackupValidationError('A coleção media contém arquivo inválido.');
  }
  const mediaIds = new Set(media.filter(isRecord).map((item) => item.id));
  const progressPhotos = data.progressPhotos as unknown[];
  if (!progressPhotos.every((item) => isRecord(item) && typeof item.id === 'string' && typeof item.profileId === 'string' && profileIds.has(item.profileId) && typeof item.localDate === 'string' && typeof item.category === 'string' && ['front','side','back','free'].includes(item.category) && (item.checkInId === undefined || recordIds.has(item.checkInId)) && (item.mediaId === undefined || mediaIds.has(item.mediaId)))) {
    throw new BackupValidationError('A coleção progressPhotos contém foto ou referência inválida.');
  }
  const ownedTrainingCollections = ['trainingProfiles', 'exerciseFavorites', 'workoutPlans', 'workoutSessions', 'workoutSetLogs'] as const;
  for (const name of ownedTrainingCollections) {
    const collection = data[name] as unknown[];
    if (!collection.every((item) => isRecord(item) && typeof item.id === 'string' && typeof item.profileId === 'string' && profileIds.has(item.profileId))) {
      throw new BackupValidationError(`A coleção ${name} contém dados sem perfil válido.`);
    }
  }
  if (!(data.exercises as unknown[]).every((item) => isRecord(item) && typeof item.id === 'string' && item.isCustom === true && typeof item.ownerProfileId === 'string' && profileIds.has(item.ownerProfileId))) {
    throw new BackupValidationError('A coleção exercises contém exercício customizado inválido.');
  }
  const plans = data.workoutPlans as unknown[];
  if (!plans.every((item) => isRecord(item) && Array.isArray(item.versions) && typeof item.currentVersion === 'number')) {
    throw new BackupValidationError('A coleção workoutPlans contém ficha inválida.');
  }
  const planIds = new Set(plans.filter(isRecord).map((item) => item.id));
  const sessions = data.workoutSessions as unknown[];
  if (!sessions.every((item) => isRecord(item) && typeof item.planId === 'string' && planIds.has(item.planId) && Array.isArray(item.exercises) && ['active', 'completed', 'cancelled'].includes(String(item.status)))) {
    throw new BackupValidationError('A coleção workoutSessions contém sessão inválida.');
  }
  const sessionIds = new Set(sessions.filter(isRecord).map((item) => item.id));
  if (!(data.workoutSetLogs as unknown[]).every((item) => isRecord(item) && typeof item.sessionId === 'string' && sessionIds.has(item.sessionId) && typeof item.exerciseId === 'string' && typeof item.setIndex === 'number')) {
    throw new BackupValidationError('A coleção workoutSetLogs contém série inválida.');
  }
  const activePreference = preferences.find(
    (preference) => isRecord(preference) && preference.key === 'activeProfileId',
  );
  if (
    activePreference &&
    (typeof activePreference.value !== 'string' || !profileIds.has(activePreference.value))
  ) {
    throw new BackupValidationError('O perfil ativo do backup não existe na coleção de perfis.');
  }
  return candidate as unknown as DefynBackup;
}

export class BackupService {
  constructor(
    private readonly gateway: BackupGateway,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async export(): Promise<DefynBackup> {
    return {
      format: DEFYN_BACKUP_FORMAT,
      version: DEFYN_BACKUP_VERSION,
      exportedAt: this.now().toISOString(),
      data: await this.gateway.readAll(),
    };
  }

  parse(serialized: string): DefynBackup {
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      throw new BackupValidationError('O arquivo não contém JSON válido.');
    }
    return validateBackup(parsed);
  }

  async restore(backup: DefynBackup): Promise<void> {
    const valid = validateBackup(backup);
    await this.gateway.replaceAll(valid.data);
  }

  async reset(): Promise<void> {
    await this.gateway.clearAll();
  }
}
