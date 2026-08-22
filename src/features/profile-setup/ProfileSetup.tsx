import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type RefObject } from 'react';
import {
  CreateProfileService,
  type CreateProfileCommand,
  type CreateProfileResult,
} from '../../application/profile/create-profile';
import {
  calculateNutritionTargets,
  EXAMPLE_CALORIE_DEFICIT_KCAL,
  NutritionDomainError,
  presentationRound,
  VIDEO_ACTIVITY_PRESETS,
  ACTIVITY_PRESET_EXPLANATIONS,
  activityPresetExplanation,
  VIDEO_MACRO_PRESET,
  type NutritionCalculationResult,
} from '../../domain/nutrition';
import { ageOnDate, type UserProfile } from '../../domain/profile/profile';
import { calculateHydrationTarget } from '../../domain/hydration/hydration';
import { repositories } from '../../infrastructure/repositories';
import { optimizeImage } from '../../application/media/image-processing';
import { ProfileAvatar } from '../profiles/ProfileAvatar';
import { DefynSelect } from '../../shared/components/DefynSelect';
import { useCriticalUpdateSection } from '../pwa/pwa-update-policy';
import './profile-setup.css';

const profileService = new CreateProfileService(
  repositories.profiles,
  repositories.nutritionTargets,
);

type FormState = {
  name: string;
  dateOfBirth: string;
  metabolicSex: 'male' | 'female';
  heightCm: string;
  currentWeightKg: string;
  activityFactor: string;
  goal: 'fat-loss' | 'maintenance' | 'weight-gain';
  metabolicMethod: 'harris-benedict-original' | 'mifflin-st-jeor';
  adjustmentKcal: string;
  hydrationMode: 'weight-based' | 'custom';
  hydrationValue: string;
  mealsPerDay: string; mealTimes: string; trainingTime: string; preferredFoods: string; dislikedFoods: string; avoidedFoods: string; restrictions: string; intolerances: string; allergies: string; supplements: string;
  mealSizePreference: 'balanced' | 'main-meals-larger'; flexiblePlanning: boolean; wakeTime: string; sleepTime: string; remindersEnabled: boolean; pacingMode: 'continuous' | 'checkpoints';
};

const emptyForm: FormState = {
  name: '',
  dateOfBirth: '1995-01-01',
  metabolicSex: 'male',
  heightCm: '175',
  currentWeightKg: '80',
  activityFactor: '1.5',
  goal: 'fat-loss',
  metabolicMethod: 'mifflin-st-jeor',
  adjustmentKcal: String(EXAMPLE_CALORIE_DEFICIT_KCAL),
  hydrationMode: 'weight-based',
  hydrationValue: '35',
  mealsPerDay: '4', mealTimes: '07:30, 12:30, 16:30, 20:00', trainingTime: '', preferredFoods: '', dislikedFoods: '', avoidedFoods: '', restrictions: '', intolerances: '', allergies: '', supplements: '', mealSizePreference: 'balanced', flexiblePlanning: true, wakeTime: '07:00', sleepTime: '23:00', remindersEnabled: false, pacingMode: 'continuous',
};

function formFromProfile(profile?: UserProfile): FormState {
  if (!profile) return emptyForm;
  return {
    name: profile.name,
    dateOfBirth: profile.dateOfBirth,
    metabolicSex: profile.metabolicSex,
    heightCm: String(profile.heightCm),
    currentWeightKg: String(profile.currentWeightKg),
    activityFactor: String(profile.activity.factor),
    goal: profile.goal === 'custom' ? 'maintenance' : profile.goal,
    metabolicMethod: profile.metabolicMethod,
    adjustmentKcal:
      profile.calorieGoal.mode === 'deficit' || profile.calorieGoal.mode === 'surplus'
        ? String(profile.calorieGoal.adjustmentKcal)
        : String(EXAMPLE_CALORIE_DEFICIT_KCAL),
    hydrationMode: profile.hydrationConfiguration.mode,
    hydrationValue: String(
      profile.hydrationConfiguration.mode === 'custom'
        ? profile.hydrationConfiguration.customTargetMl
        : profile.hydrationConfiguration.mlPerKg,
    ),
    mealsPerDay: String(profile.nutritionPlanning?.mealsPerDay ?? 4), mealTimes: (profile.nutritionPlanning?.mealTimes ?? ['07:30', '12:30', '16:30', '20:00']).join(', '), trainingTime: profile.nutritionPlanning?.trainingTime ?? '', preferredFoods: (profile.nutritionPlanning?.preferredFoods ?? []).join(', '), dislikedFoods: (profile.nutritionPlanning?.dislikedFoods ?? []).join(', '), avoidedFoods: (profile.nutritionPlanning?.avoidedFoods ?? []).join(', '), restrictions: (profile.nutritionPlanning?.dietaryRestrictions ?? []).join(', '), intolerances: (profile.nutritionPlanning?.intolerances ?? []).join(', '), allergies: (profile.nutritionPlanning?.allergies ?? []).join(', '), supplements: (profile.nutritionPlanning?.supplements ?? []).join(', '), mealSizePreference: profile.nutritionPlanning?.mealSizePreference === 'main-meals-larger' ? 'main-meals-larger' : 'balanced', flexiblePlanning: profile.nutritionPlanning?.flexiblePlanning ?? true, wakeTime: profile.hydrationRoutine?.wakeTime ?? '07:00', sleepTime: profile.hydrationRoutine?.sleepTime ?? '23:00', remindersEnabled: profile.hydrationRoutine?.remindersEnabled ?? false, pacingMode: profile.hydrationRoutine?.pacingMode ?? 'continuous',
  };
}

function calorieGoal(form: FormState): CreateProfileCommand['calorieGoal'] {
  if (form.goal === 'maintenance') return { mode: 'maintenance' };
  return form.goal === 'weight-gain'
    ? { mode: 'surplus', adjustmentKcal: Number(form.adjustmentKcal) }
    : { mode: 'deficit', adjustmentKcal: Number(form.adjustmentKcal) };
}

function previewFor(form: FormState): NutritionCalculationResult | undefined {
  try {
    return calculateNutritionTargets({
      sex: form.metabolicSex,
      weightKg: Number(form.currentWeightKg),
      heightCm: Number(form.heightCm),
      ageYears: ageOnDate(form.dateOfBirth),
      metabolicMethod: form.metabolicMethod,
      activityFactor: Number(form.activityFactor),
      calorieGoal: calorieGoal(form),
      macros: VIDEO_MACRO_PRESET,
    });
  } catch {
    return undefined;
  }
}

interface ProfileSetupProps {
  profile?: UserProfile;
  standalone?: boolean;
  onSaved: (result: CreateProfileResult) => void | Promise<void>;
  onCancel?: () => void;
}

export function ProfileSetup({ profile, standalone = false, onSaved, onCancel }: ProfileSetupProps) {
  useCriticalUpdateSection(true, 'profile-editor');
  const [form, setForm] = useState(() => formFromProfile(profile));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');
  const [avatarFile, setAvatarFile] = useState<File>();
  const [avatarAccepted, setAvatarAccepted] = useState(false);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const avatarCameraInput = useRef<HTMLInputElement>(null);
  const avatarGalleryInput = useRef<HTMLInputElement>(null);
  const [activityHelpOpen, setActivityHelpOpen] = useState(false);
  const [methodHelpOpen, setMethodHelpOpen] = useState(false);
  const [activityGuideOpen, setActivityGuideOpen] = useState(false);
  const [trainingFrequency, setTrainingFrequency] = useState('3-6');
  const [dailyRoutine, setDailyRoutine] = useState<'seated' | 'normal' | 'active'>('normal');
  const preview = useMemo(() => previewFor(form), [form]);
  const avatarPreview = useMemo(() => avatarFile ? URL.createObjectURL(avatarFile) : '', [avatarFile]);
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);
  const previousPreview = useMemo(() => profile ? previewFor(formFromProfile(profile)) : undefined, [profile]);
  const weightChanged = profile && Number(form.currentWeightKg) !== profile.currentWeightKg;
  const waterImpact = useMemo(() => {
    if (!profile || !weightChanged) return undefined;
    try {
      return {
        before: calculateHydrationTarget(profile.currentWeightKg, profile.hydrationConfiguration),
        after: calculateHydrationTarget(
          Number(form.currentWeightKg),
          form.hydrationMode === 'custom'
            ? { mode: 'custom', customTargetMl: Number(form.hydrationValue) }
            : { mode: 'weight-based', mlPerKg: Number(form.hydrationValue) },
        ),
      };
    } catch {
      return undefined;
    }
  }, [form.currentWeightKg, form.hydrationMode, form.hydrationValue, profile, weightChanged]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setStatus('idle');
    setError('');
  }

  function suggestedActivityFactor(): string {
    if (dailyRoutine === 'active' || (trainingFrequency === '6+' && dailyRoutine === 'normal')) return '1.7';
    if (dailyRoutine === 'seated' && trainingFrequency !== '6+') return '1.3';
    return '1.5';
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (avatarFile && !avatarAccepted) {
      setError('Confira a prévia e toque em “Usar foto” antes de salvar.');
      return;
    }
    if (!form.name.trim()) {
      setError('Informe como prefere identificar esta pessoa.');
      return;
    }
    setStatus('saving');
    try {
      const result = await profileService.execute({
        profileId: profile?.id,
        name: form.name,
        dateOfBirth: form.dateOfBirth,
        metabolicSex: form.metabolicSex,
        heightCm: Number(form.heightCm),
        currentWeightKg: Number(form.currentWeightKg),
        activity: { factor: Number(form.activityFactor) },
        goal: form.goal,
        metabolicMethod: form.metabolicMethod,
        calorieGoal: calorieGoal(form),
        hydrationConfiguration: form.hydrationMode === 'custom'
          ? { mode: 'custom', customTargetMl: Number(form.hydrationValue) }
          : { mode: 'weight-based', mlPerKg: Number(form.hydrationValue) },
      });
      const list = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
      let avatarMediaId = removeAvatar ? undefined : result.profile.avatarMediaId;
      if (removeAvatar && result.profile.avatarMediaId) await repositories.media.remove(result.profile.avatarMediaId);
      if (avatarFile) {
        if (result.profile.avatarMediaId) await repositories.media.remove(result.profile.avatarMediaId);
        const media = await optimizeImage(avatarFile, 'profile-avatar', 'profile', result.profile.id); await repositories.media.save(media); avatarMediaId = media.id;
      }
      const enriched = { ...result.profile, avatarMediaId, nutritionPlanning: { mealsPerDay: Number(form.mealsPerDay), mealTimes: list(form.mealTimes), trainingTime: form.trainingTime || undefined, preferredFoods: list(form.preferredFoods), dislikedFoods: list(form.dislikedFoods), avoidedFoods: list(form.avoidedFoods), dietaryRestrictions: list(form.restrictions), intolerances: list(form.intolerances), allergies: list(form.allergies), supplements: list(form.supplements), mealSizePreference: form.mealSizePreference, flexiblePlanning: form.flexiblePlanning }, hydrationRoutine: { wakeTime: form.wakeTime, sleepTime: form.sleepTime, remindersEnabled: form.remindersEnabled, pacingMode: form.pacingMode } };
      await repositories.profiles.save(enriched);
      setStatus('saved');
      await onSaved({ ...result, profile: enriched });
    } catch (caught) {
      setStatus('idle');
      setError(
        caught instanceof NutritionDomainError || caught instanceof Error
          ? caught.message
          : 'Não foi possível salvar este perfil.',
      );
    }
  }

  return (
    <div className={`profile-setup-screen ${standalone ? 'profile-setup-standalone' : ''}`}>
      {standalone && (
        <header className="topbar">
          <span className="brand"><span className="brand-mark" aria-hidden="true">D</span><span>DEFYN</span></span>
          <div className="privacy-note"><span aria-hidden="true" /> Dados locais e privados</div>
        </header>
      )}
      <main className="setup-layout">
        <section className="intro-panel" aria-labelledby="profile-form-title">
          <div className="eyebrow"><span>{profile ? 'Editar' : 'Novo'}</span> Perfil local</div>
          <h1 id="profile-form-title">
            {profile ? <>Revise sua <em>direção.</em></> : <>Comece com <em>clareza.</em></>}
          </h1>
          <p className="intro-copy">
            {standalone
              ? 'Crie o primeiro perfil para transformar seus dados em metas transparentes e começar o acompanhamento diário.'
              : 'Cada pessoa possui ficha, metas, hidratação e histórico independentes neste dispositivo.'}
          </p>

          <form className="profile-form" onSubmit={submit} noValidate>
            <AvatarField profile={profile} file={avatarFile} preview={avatarPreview} accepted={avatarAccepted} removeAvatar={removeAvatar} cameraInput={avatarCameraInput} galleryInput={avatarGalleryInput} onSelect={(event) => { const file = event.target.files?.[0]; if (!file) return; setAvatarFile(file); setAvatarAccepted(false); setRemoveAvatar(false); event.target.value = ''; }} onAccept={() => setAvatarAccepted(true)} onRemove={() => { setRemoveAvatar(true); setAvatarFile(undefined); setAvatarAccepted(false); }} />
            <div className="field field-wide">
              <label htmlFor="name">Nome ou apelido</label>
              <input id="name" value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Como identificar esta pessoa?" autoComplete="name" required />
            </div>
            <div className="field">
              <label htmlFor="birth-date">Data de nascimento</label>
              <input id="birth-date" type="date" value={form.dateOfBirth} onChange={(event) => update('dateOfBirth', event.target.value)} required />
            </div>
            <fieldset className="field segmented-field">
              <legend>Sexo usado no cálculo</legend>
              <div className="segmented">
                <label><input type="radio" name="sex" checked={form.metabolicSex === 'male'} onChange={() => update('metabolicSex', 'male')} /><span>Masculino</span></label>
                <label><input type="radio" name="sex" checked={form.metabolicSex === 'female'} onChange={() => update('metabolicSex', 'female')} /><span>Feminino</span></label>
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor="height">Altura <span>cm</span></label>
              <input id="height" type="number" min="50" max="280" value={form.heightCm} onChange={(event) => update('heightCm', event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="weight">Peso atual <span>kg</span></label>
              <input id="weight" type="number" min="1" max="500" step="0.1" value={form.currentWeightKg} onChange={(event) => update('currentWeightKg', event.target.value)} required />
            </div>
            <div className="field explainable-field">
              <label htmlFor="activity">Nível de atividade <button type="button" className="field-help-trigger" aria-expanded={activityHelpOpen} onClick={() => setActivityHelpOpen((open) => !open)}>Como escolher?</button></label>
              <DefynSelect label="Nível de atividade" value={form.activityFactor} onChange={(value) => update('activityFactor', value)} options={VIDEO_ACTIVITY_PRESETS.map((preset) => ({ value: String(preset.factor), label: `${preset.label} · ${preset.factor}`, description: activityPresetExplanation(preset.factor).summary }))} />
              <small className="selected-explanation">{activityPresetExplanation(Number(form.activityFactor)).summary}</small>
              {activityHelpOpen && <ActivityHelp onClose={() => setActivityHelpOpen(false)} onGuide={() => { setActivityHelpOpen(false); setActivityGuideOpen(true); }} />}
            </div>
            <div className="field explainable-field">
              <label htmlFor="method">Método metabólico <button type="button" className="field-help-trigger" aria-expanded={methodHelpOpen} onClick={() => setMethodHelpOpen((open) => !open)}>Qual escolher?</button></label>
              <DefynSelect label="Método metabólico" value={form.metabolicMethod} onChange={(method) => update('metabolicMethod', method)} options={[{ value: 'mifflin-st-jeor', label: 'Mifflin–St Jeor', description: 'Recomendado' }, { value: 'harris-benedict-original', label: 'Harris–Benedict original', description: 'Método clássico' }]} />
              <small className="selected-explanation">{form.metabolicMethod === 'mifflin-st-jeor' ? 'Estimativa moderna baseada em peso, altura, idade e sexo usado no cálculo.' : 'Estimativa histórica usada como referência na origem do DEFYN.'}</small>
              {methodHelpOpen && <MethodHelp onClose={() => setMethodHelpOpen(false)} />}
            </div>
            <fieldset className="field field-wide goal-field">
              <legend>Objetivo atual</legend>
              <div className="goal-options">
                {([
                  ['fat-loss', 'Definição', 'Déficit'],
                  ['maintenance', 'Manter', 'Equilíbrio'],
                  ['weight-gain', 'Ganhar', 'Superávit'],
                ] as const).map(([value, title, note]) => (
                  <label key={value}><input type="radio" name="goal" checked={form.goal === value} onChange={() => update('goal', value)} /><span><strong>{title}</strong><small>{note}</small></span></label>
                ))}
              </div>
            </fieldset>
            <div className="field field-wide adjustment-field">
              <label htmlFor="adjustment">Ajuste diário <span>kcal</span></label>
              <input id="adjustment" type="number" min="0" step="50" value={form.goal === 'maintenance' ? '0' : form.adjustmentKcal} disabled={form.goal === 'maintenance'} onChange={(event) => update('adjustmentKcal', event.target.value)} />
              <small>{form.goal === 'maintenance' ? 'Manutenção utiliza o GET estimado sem déficit ou superávit.' : form.goal === 'fat-loss' ? 'Déficit: o DEFYN calcula GET − este valor. 400 kcal é apenas um ponto de partida.' : 'Superávit: o DEFYN calcula GET + este valor. 400 kcal é apenas um ponto de partida.'}</small>
            </div>
            <fieldset className="field field-wide hydration-config-field">
              <legend>Meta de hidratação</legend>
              <div className="hydration-config-grid">
                <DefynSelect label="Método da meta de hidratação" value={form.hydrationMode} onChange={(mode) => { update('hydrationMode', mode); update('hydrationValue', mode === 'custom' ? '2500' : '35'); }} options={[{ value: 'weight-based', label: 'Estimativa por peso' }, { value: 'custom', label: 'Meta personalizada' }]} />
                {form.hydrationMode === 'weight-based' ? (
                  <DefynSelect label="Mililitros por quilo" value={form.hydrationValue} onChange={(value) => update('hydrationValue', value)} options={[{ value: '30', label: '30 ml/kg' }, { value: '35', label: '35 ml/kg' }, { value: '40', label: '40 ml/kg' }]} />
                ) : (
                  <input aria-label="Meta personalizada em mililitros" type="number" min="1" max="20000" step="100" value={form.hydrationValue} onChange={(event) => update('hydrationValue', event.target.value)} />
                )}
              </div>
              <small>Uma estimativa configurável, não uma prescrição universal.</small>
            </fieldset>
            <details className="planning-fields field-wide"><summary>Rotina alimentar, restrições e horários</summary><div className="profile-form planning-grid"><div className="field"><label htmlFor="meals-count">Refeições por dia</label><input id="meals-count" type="number" min="1" max="8" value={form.mealsPerDay} onChange={(event) => update('mealsPerDay', event.target.value)} /></div><div className="field"><label htmlFor="meal-times">Horários, separados por vírgula</label><input id="meal-times" value={form.mealTimes} onChange={(event) => update('mealTimes', event.target.value)} /></div><div className="field"><label htmlFor="training-time">Horário de treino (opcional)</label><input id="training-time" type="time" value={form.trainingTime} onChange={(event) => update('trainingTime', event.target.value)} /></div><div className="field"><label>Distribuição</label><DefynSelect label="Distribuição das refeições" value={form.mealSizePreference} onChange={(value) => update('mealSizePreference', value)} options={[{ value: 'balanced', label: 'Equilibrada' }, { value: 'main-meals-larger', label: 'Almoço/jantar maiores' }]} /></div>{([['preferredFoods','Alimentos preferidos'],['dislikedFoods','Não gosto'],['avoidedFoods','Evito'],['restrictions','Restrições alimentares'],['intolerances','Intolerâncias informadas'],['allergies','Alergias informadas'],['supplements','Suplementos']] as const).map(([key,label]) => <div className="field" key={key}><label>{label}</label><input value={form[key]} onChange={(event) => update(key,event.target.value)} placeholder="Separe por vírgulas" /></div>)}<label className="check-field"><input type="checkbox" checked={form.flexiblePlanning} onChange={(event) => update('flexiblePlanning',event.target.checked)} /> Planejamento flexível</label></div></details>
            <details className="planning-fields field-wide"><summary>Rotina de hidratação</summary><div className="profile-form planning-grid"><div className="field"><label>Acordar</label><input type="time" value={form.wakeTime} onChange={(event) => update('wakeTime',event.target.value)} /></div><div className="field"><label>Dormir</label><input type="time" value={form.sleepTime} onChange={(event) => update('sleepTime',event.target.value)} /></div><div className="field"><label>Visualização</label><DefynSelect label="Visualização da hidratação" value={form.pacingMode} onChange={(value) => update('pacingMode', value)} options={[{ value: 'continuous', label: 'Progresso contínuo' }, { value: 'checkpoints', label: 'Checkpoints' }]} /></div><label className="check-field"><input type="checkbox" checked={form.remindersEnabled} onChange={(event) => update('remindersEnabled',event.target.checked)} /> Planejar lembretes locais</label><p className="field-wide routine-note">O DEFYN calcula o estado de lembrete, mas não promete execução confiável em segundo plano sem infraestrutura de push.</p></div></details>
            {weightChanged && preview && previousPreview && waterImpact && (
              <div className="change-impact field-wide" role="status">
                <strong>Seu peso mudou. Revise o impacto antes de salvar.</strong>
                <span>Energia: {presentationRound(previousPreview.calorieTarget).toLocaleString('pt-BR')} → {presentationRound(preview.calorieTarget).toLocaleString('pt-BR')} kcal</span>
                <span>Água: {presentationRound(waterImpact.before).toLocaleString('pt-BR')} → {presentationRound(waterImpact.after).toLocaleString('pt-BR')} ml</span>
              </div>
            )}
            {error && <div className="form-message error-message" role="alert">{error}</div>}
            <div className="form-actions field-wide">
              {onCancel && <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button>}
              <button className="primary-button" type="submit" disabled={status === 'saving' || !preview}>
                <span>{status === 'saving' ? 'Salvando…' : profile ? 'Atualizar ficha e metas' : 'Criar perfil e continuar'}</span>
                <span className="button-arrow" aria-hidden="true">↗</span>
              </button>
            </div>
            <p className="save-feedback" role="status" aria-live="polite">{status === 'saved' ? 'Perfil e snapshot de metas salvos.' : 'Os dados ficam somente neste dispositivo.'}</p>
          </form>
        </section>
        <ResultPanel result={preview} method={form.metabolicMethod} />
      </main>
      {activityGuideOpen && <div className="help-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActivityGuideOpen(false); }}><section className="help-sheet" role="dialog" aria-modal="true" aria-labelledby="activity-guide-title"><div className="sheet-handle" /><header><h2 id="activity-guide-title">Ajude-me a escolher</h2><button type="button" onClick={() => setActivityGuideOpen(false)} aria-label="Fechar">×</button></header><label>Quantas vezes você pretende treinar?</label><DefynSelect label="Frequência de treino" value={trainingFrequency} onChange={setTrainingFrequency} options={[{ value: '0-2', label: '0–2 vezes por semana' }, { value: '3-6', label: '3–6 vezes por semana' }, { value: '6+', label: '6+ vezes por semana' }]} /><label>Como é sua rotina fora da academia?</label><DefynSelect label="Rotina fora da academia" value={dailyRoutine} onChange={setDailyRoutine} options={[{ value: 'seated', label: 'Maior parte sentado' }, { value: 'normal', label: 'Movimentação normal' }, { value: 'active', label: 'Bastante ativa ou física' }]} /><p><strong>Sugestão inicial: {activityPresetExplanation(Number(suggestedActivityFactor())).label} · {suggestedActivityFactor()}</strong><br />Você pode alterar livremente: a frequência de treino não define sozinha seu fator.</p><button className="primary-button" type="button" onClick={() => { update('activityFactor', suggestedActivityFactor()); setActivityGuideOpen(false); }}><span>Usar sugestão inicial</span><span className="button-arrow" aria-hidden="true">↗</span></button></section></div>}
    </div>
  );
}

function ActivityHelp({ onClose, onGuide }: { onClose: () => void; onGuide: () => void }) {
  return <section className="field-help-panel" role="dialog" aria-label="Como escolher o nível de atividade"><header><strong>Nível de atividade</strong><button type="button" onClick={onClose} aria-label="Fechar ajuda">×</button></header>{ACTIVITY_PRESET_EXPLANATIONS.map((preset) => <article key={preset.id}><strong>{preset.label} · {preset.factor}</strong><span>{preset.summary}</span><ul>{preset.examples.map((example) => <li key={example}>{example}</li>)}</ul></article>)}<button type="button" className="help-guide-button" onClick={onGuide}>Ajude-me a escolher</button></section>;
}

function MethodHelp({ onClose }: { onClose: () => void }) {
  return <section className="field-help-panel method-help-panel" role="dialog" aria-label="Como escolher o método metabólico"><header><strong>Método metabólico</strong><button type="button" onClick={onClose} aria-label="Fechar ajuda">×</button></header><article><strong>Mifflin–St Jeor <b>Recomendado</b></strong><span>Equação moderna usada para estimar seu metabolismo basal a partir de peso, altura, idade e sexo usado no cálculo.</span></article><article><strong>Harris–Benedict original <b>Método clássico</b></strong><span>Equação histórica de metabolismo basal e método usado como referência na origem do DEFYN.</span></article><p>Ambas são estimativas — não medem diretamente o metabolismo.</p></section>;
}

interface AvatarFieldProps {
  profile?: UserProfile;
  file?: File;
  preview: string;
  accepted: boolean;
  removeAvatar: boolean;
  cameraInput: RefObject<HTMLInputElement | null>;
  galleryInput: RefObject<HTMLInputElement | null>;
  onSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onAccept: () => void;
  onRemove: () => void;
}

function AvatarField({ profile, file, preview, accepted, removeAvatar, cameraInput, galleryInput, onSelect, onAccept, onRemove }: AvatarFieldProps) {
  const hasExisting = Boolean(profile?.avatarMediaId && !removeAvatar);
  return <fieldset className="field field-wide avatar-field">
    <legend>Foto do perfil</legend>
    <div className="avatar-preview-row">
      {preview ? <span className="large-avatar avatar-file-preview"><img src={preview} alt="Prévia da foto selecionada" /></span> : profile ? <ProfileAvatar profile={removeAvatar ? { ...profile, avatarMediaId: undefined } : profile} className="large-avatar" size="lg" /> : <span className="large-avatar" aria-hidden="true">+</span>}
      <div className="avatar-actions">
        <button type="button" onClick={() => cameraInput.current?.click()}>{file ? 'Trocar pela câmera' : 'Tirar foto'}</button>
        <button type="button" onClick={() => galleryInput.current?.click()}>{file ? 'Trocar pela galeria' : 'Escolher da galeria'}</button>
        {file && <button type="button" className={accepted ? 'accepted' : 'accept-photo'} onClick={onAccept}>{accepted ? 'Foto pronta ✓' : 'Usar foto'}</button>}
        {(file || hasExisting) && <button type="button" className="remove-photo" onClick={onRemove}>Remover</button>}
      </div>
      <input ref={cameraInput} aria-label="Tirar foto do perfil" type="file" accept="image/*" capture="user" onChange={onSelect} />
      <input ref={galleryInput} aria-label="Escolher foto do perfil na galeria" type="file" accept="image/jpeg,image/png,image/webp" onChange={onSelect} />
    </div>
    {file && <small className="avatar-selection-status">{accepted ? 'Esta foto será usada ao salvar.' : `Selecionada: ${file.name}. Confirme em “Usar foto”.`}</small>}
    <small>O DEFYN corrige orientação, reduz e comprime localmente. Nada é enviado.</small>
  </fieldset>;
}

function ResultPanel({ result, method }: { result?: NutritionCalculationResult; method: FormState['metabolicMethod'] }) {
  const show = (value: number | undefined) => value === undefined ? '—' : presentationRound(value).toLocaleString('pt-BR');
  return (
    <aside className="result-panel" aria-labelledby="result-title">
      <div className="result-header"><div><span className="result-kicker">Estimativa diária</span><h2 id="result-title">Sua direção</h2></div><span className="live-pill"><i aria-hidden="true" /> Prévia ao vivo</span></div>
      <div className="calorie-hero"><span>Meta calórica</span><strong>{show(result?.calorieTarget)}</strong><small>kcal / dia</small><div className="target-line"><span style={{ width: result ? '72%' : '0%' }} /></div></div>
      <div className="energy-grid">
        <article><span>TMB</span><strong>{show(result?.bmr)}</strong><small>repouso</small></article>
        <article><span>GET</span><strong>{show(result?.tdee)}</strong><small>com atividade</small></article>
        <article><span>Ajuste</span><strong>{result ? `${result.calorieAdjustment > 0 ? '+' : ''}${show(result.calorieAdjustment)}` : '—'}</strong><small>kcal</small></article>
      </div>
      <section className="macro-section" aria-labelledby="macro-title">
        <div className="section-heading"><h3 id="macro-title">Macronutrientes</h3><span>método base</span></div>
        <MacroRow label="Proteína" grams={result?.macros.protein.grams} color="protein" detail="2 g/kg" />
        <MacroRow label="Carboidratos" grams={result?.macros.carbs.grams} color="carbs" detail="calorias restantes" />
        <MacroRow label="Gorduras" grams={result?.macros.fat.grams} color="fat" detail="1 g/kg" />
      </section>
      <details className="explanation" open><summary>Como chegamos nesses números?</summary><ol>
        <li><span>01</span><p><strong>Estimamos sua TMB</strong> com {method === 'mifflin-st-jeor' ? 'Mifflin–St Jeor' : 'Harris–Benedict original'}.</p></li>
        <li><span>02</span><p><strong>Aplicamos sua atividade</strong> para chegar ao gasto energético total.</p></li>
        <li><span>03</span><p><strong>Ajustamos ao objetivo</strong> e distribuímos os macronutrientes.</p></li>
      </ol></details>
      <p className="responsibility-note">Estimativas são pontos de partida configuráveis, não diagnóstico ou prescrição médica.</p>
    </aside>
  );
}

function MacroRow({ label, grams, color, detail }: { label: string; grams?: number; color: string; detail: string }) {
  return <div className="macro-row"><span className={`macro-dot ${color}`} aria-hidden="true" /><div><strong>{label}</strong><small>{detail}</small></div><b>{grams === undefined ? '—' : `${presentationRound(grams)} g`}</b></div>;
}
