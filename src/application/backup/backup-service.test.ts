import { describe, expect, it } from 'vitest';
import type { BackupGateway } from './backup-service';
import { BackupService, BackupValidationError, validateBackup } from './backup-service';
import type { DefynBackupData } from '../../domain/export/export-format';
import type { Food } from '../../domain/food/food';

class MemoryBackupGateway implements BackupGateway {
  constructor(public data: DefynBackupData) {}
  readAll() { return Promise.resolve(structuredClone(this.data)); }
  replaceAll(data: DefynBackupData) { this.data = structuredClone(data); return Promise.resolve(); }
}

describe('backup e restauração', () => {
  it('exporta formato e versão válidos com todos os stores', async () => {
    const backup = await new BackupService(new MemoryBackupGateway(dataFixture()), fixedNow).export();
    expect(backup.format).toBe('defyn-backup');
    expect(backup.version).toBe(5);
    expect(backup.exportedAt).toBe('2026-08-21T12:00:00.000Z');
    expect(backup.data.profiles).toHaveLength(1);
    expect(backup.data.waterEntries).toHaveLength(1);
  });

  it('faz round-trip exportar → serializar → importar preservando dados', async () => {
    const source = new MemoryBackupGateway(dataFixture());
    const service = new BackupService(source, fixedNow);
    const serialized = JSON.stringify(await service.export());
    const destination = new MemoryBackupGateway(emptyData());
    const restoreService = new BackupService(destination, fixedNow);
    await restoreService.restore(restoreService.parse(serialized));
    expect(destination.data).toEqual(source.data);
  });

  it('rejeita JSON inválido', () => {
    expect(() => new BackupService(new MemoryBackupGateway(emptyData())).parse('{')).toThrow(BackupValidationError);
  });

  it('rejeita formato e versão incompatíveis', () => {
    expect(() => validateBackup({ format: 'outro', version: 1 })).toThrow(/não é um backup/);
    expect(() => validateBackup({ format: 'defyn-backup', version: 99, exportedAt: '', data: {} })).toThrow(/versão/);
  });

  it('rejeita perfil ativo que não existe', async () => {
    const backup = await new BackupService(new MemoryBackupGateway(dataFixture()), fixedNow).export();
    backup.data.preferences = [{ key: 'activeProfileId', value: 'missing' }];
    expect(() => validateBackup(backup)).toThrow(/perfil ativo/);
  });

  it('migra backup v1 preenchendo novas coleções', () => {
    const legacy = { format: 'defyn-backup', version: 1, exportedAt: fixedNow().toISOString(), data: { ...emptyData() } } as unknown as Record<string, unknown>;
    const data = (legacy.data as Record<string, unknown>); delete data.foodPreferences; delete data.favoriteMeals; delete data.media;
    const migrated = validateBackup(legacy);
    expect(migrated.version).toBe(5); expect(migrated.data.media).toEqual([]); expect(migrated.data.workoutSessions).toEqual([]);
  });

  it('migra backup v2 sem inventar dados de treino', () => {
    const legacy = { format: 'defyn-backup', version: 2, exportedAt: fixedNow().toISOString(), data: { ...dataFixture() } } as unknown as Record<string, unknown>;
    const data = legacy.data as Record<string, unknown>;
    delete data.trainingProfiles; delete data.exercises; delete data.exerciseFavorites; delete data.workoutPlans; delete data.workoutSessions; delete data.workoutSetLogs;
    const migrated = validateBackup(legacy);
    expect(migrated.version).toBe(5);
    expect(migrated.data.trainingProfiles).toEqual([]);
  });

  it('migra backup v3 para o modelo corporal atual', () => {
    const legacy = { format: 'defyn-backup', version: 3, exportedAt: fixedNow().toISOString(), data: { ...dataFixture(), progressRecords: [{ id:'weight-a', profileId:'profile-a', date:'2026-08-20', weightKg:79, createdAt:fixedNow().toISOString(), updatedAt:fixedNow().toISOString() }] } };
    const migrated = validateBackup(legacy);
    expect(migrated.version).toBe(5);
    expect(migrated.data.progressRecords[0]).toMatchObject({ localDate:'2026-08-20', source:'migration' });
  });

  it('aceita backup v4 e preserva alimentos simplificados', () => {
    const legacy = { format: 'defyn-backup', version: 4, exportedAt: fixedNow().toISOString(), data: { ...dataFixture(), foods: [{ id:'food-a', name:'Antigo', nameNormalized:'antigo', searchTextNormalized:'antigo', basePortion:{ quantity:100, unit:'g' }, portions:[], nutrients:{ caloriesKcal:120, proteinGrams:4, carbsGrams:20, fatGrams:2 }, dataSource:'manual', createdAt:fixedNow().toISOString(), updatedAt:fixedNow().toISOString() }] } };
    const migrated = validateBackup(legacy);
    expect(migrated.version).toBe(5);
    expect(migrated.data.foods[0]?.nutritionLabel).toBeUndefined();
    expect(migrated.data.foods[0]?.nutrients.caloriesKcal).toBe(120);
  });

  it('preserva todas as colunas estruturadas de um rótulo no backup v5', async () => {
    const timestamp = fixedNow().toISOString();
    const food: Food = { id:'food-label', name:'Rótulo completo', nameNormalized:'rotulo completo', searchTextNormalized:'rotulo completo', basePortion:{ quantity:100, unit:'g' }, portions:[], nutrients:{ caloriesKcal:420, energyKj:1764, sodiumMg:500 }, dataSource:'nutrition-label-ocr', nutritionLabel:{ version:1, servingsPerContainer:4, declaredServing:{ quantity:60, unit:'g' }, columns:[
      { id:'per-100', label:'100 g', kind:'amount', basis:{ quantity:100, unit:'g' }, values:{ caloriesKcal:420, energyKj:1764, sodiumMg:500 }, source:'explicit' },
      { id:'serving', label:'60 g', kind:'amount', basis:{ quantity:60, unit:'g' }, values:{ caloriesKcal:252, energyKj:1058, sodiumMg:300 }, source:'explicit' },
      { id:'daily', label:'%VD', kind:'daily-value', dailyValuesPercent:{ caloriesKcal:13, sodiumMg:15 }, source:'explicit' },
    ], calculationBasis:{ columnId:'per-100', quantity:100, unit:'g', source:'explicit' } }, createdAt:timestamp, updatedAt:timestamp };
    const source = new MemoryBackupGateway({ ...dataFixture(), foods:[food] });
    const destination = new MemoryBackupGateway(emptyData());
    await new BackupService(destination, fixedNow).restore(await new BackupService(source, fixedNow).export());
    expect(destination.data.foods[0]?.nutritionLabel).toEqual(food.nutritionLabel);
  });

  it('preserva perfil, plano, sessão, séries e exercício próprio no round-trip', async () => {
    const source = new MemoryBackupGateway(trainingDataFixture());
    const destination = new MemoryBackupGateway(emptyData());
    const backup = await new BackupService(source, fixedNow).export();
    await new BackupService(destination, fixedNow).restore(backup);
    expect(destination.data.trainingProfiles).toHaveLength(1);
    expect(destination.data.exercises[0]?.name).toBe('Exercício próprio');
    expect(destination.data.workoutPlans[0]?.versions[0]?.templates[0]?.name).toBe('Treino A');
    expect(destination.data.workoutSetLogs[0]).toMatchObject({ actualLoad: 30, actualReps: 10 });
  });
});

function fixedNow() { return new Date('2026-08-21T12:00:00.000Z'); }

function emptyData(): DefynBackupData {
  return { profiles: [], nutritionTargets: [], foods: [], recipes: [], diaryEntries: [], mealCategories: [], waterEntries: [], progressRecords: [], progressPhotos: [], preferences: [], foodPreferences: [], favoriteMeals: [], media: [], trainingProfiles: [], exercises: [], exerciseFavorites: [], workoutPlans: [], workoutSessions: [], workoutSetLogs: [] };
}

function dataFixture(): DefynBackupData {
  const timestamp = '2026-08-21T12:00:00.000Z';
  return {
    ...emptyData(),
    profiles: [{ id: 'profile-a', name: 'Perfil A', dateOfBirth: '1990-01-01', metabolicSex: 'male', heightCm: 175, currentWeightKg: 80, goal: 'fat-loss', activity: { factor: 1.5 }, metabolicMethod: 'mifflin-st-jeor', calorieGoal: { mode: 'deficit', adjustmentKcal: 400 }, macroConfiguration: { mode: 'derived-carbs', protein: { mode: 'per-kg', gramsPerKg: 2 }, fat: { mode: 'per-kg', gramsPerKg: 1 } }, hydrationConfiguration: { mode: 'weight-based', mlPerKg: 35 }, units: { weight: 'kg', height: 'cm', energy: 'kcal' }, createdAt: timestamp, updatedAt: timestamp }],
    waterEntries: [{ id: 'water-a', profileId: 'profile-a', amountMl: 300, localDate: '2026-08-21', occurredAt: timestamp, createdAt: timestamp, updatedAt: timestamp }],
    preferences: [{ key: 'activeProfileId', value: 'profile-a' }],
  };
}

function trainingDataFixture(): DefynBackupData {
  const base = dataFixture();
  const customExercise = { id: 'exercise-a', name: 'Exercício próprio', normalizedName: 'exercicio proprio', primaryMuscle: 'chest' as const, secondaryMuscles: [], equipment: ['dumbbell' as const], movementPattern: 'horizontal-push' as const, laterality: 'bilateral' as const, instructions: ['Preparar','Executar','Retornar'] as [string,string,string], source: 'custom' as const, isCustom: true, ownerProfileId: 'profile-a', metric: 'reps' as const, createdAt: fixedNow().toISOString(), updatedAt: fixedNow().toISOString() };
  const prescription = { id: 'rx-a', exerciseId: customExercise.id, order: 0, setType: 'working' as const, workingSets: 3, target: { metric: 'reps' as const, minimum: 8, maximum: 12 }, loadUnit: 'kg' as const, restSeconds: 90 };
  const snapshot = { prescriptionId: prescription.id, exerciseId: customExercise.id, name: customExercise.name, primaryMuscle: customExercise.primaryMuscle, equipment: customExercise.equipment, metric: customExercise.metric, workingSets: 3, target: prescription.target, loadUnit: 'kg' as const, restSeconds: 90 };
  return { ...base,
    trainingProfiles: [{ id: 'training-a', profileId: 'profile-a', primaryGoal: 'hypertrophy', experienceLevel: 'intermediate', availableDaysPerWeek: 3, preferredTrainingDays: ['monday','wednesday','friday'], averageSessionMinutes: 60, trainingLocation: 'gym', availableEquipment: [], preferredExercises: [], avoidedExercises: [], weightUnit: 'kg', defaultLoadIncrement: 2.5, advancedMode: false, createdAt: fixedNow().toISOString(), updatedAt: fixedNow().toISOString() }],
    exercises: [customExercise], exerciseFavorites: [],
    workoutPlans: [{ id: 'plan-a', profileId: 'profile-a', name: 'Plano A', goal: 'hypertrophy', status: 'active', startDate: '2026-08-21', currentVersion: 1, versions: [{ version: 1, createdAt: fixedNow().toISOString(), templates: [{ id: 'template-a', name: 'Treino A', focus: 'Peitoral', scheduledDay: 'friday', approximateMinutes: 60, exercises: [prescription] }] }], createdAt: fixedNow().toISOString(), updatedAt: fixedNow().toISOString() }],
    workoutSessions: [{ id: 'session-a', profileId: 'profile-a', planId: 'plan-a', planVersion: 1, templateId: 'template-a', templateName: 'Treino A', localDate: '2026-08-21', status: 'completed', startedAt: fixedNow().toISOString(), completedAt: fixedNow().toISOString(), currentExerciseIndex: 0, exercises: [snapshot], skippedExerciseIds: [], createdAt: fixedNow().toISOString(), updatedAt: fixedNow().toISOString() }],
    workoutSetLogs: [{ id: 'set-a', profileId: 'profile-a', sessionId: 'session-a', exerciseId: customExercise.id, exerciseNameSnapshot: customExercise.name, setIndex: 0, setType: 'working', target: prescription.target, actualLoad: 30, loadUnit: 'kg', actualReps: 10, completed: true, completedAt: fixedNow().toISOString(), createdAt: fixedNow().toISOString(), updatedAt: fixedNow().toISOString() }],
  };
}
