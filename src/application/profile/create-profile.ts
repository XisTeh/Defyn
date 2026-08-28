import { calculateNutritionTargets, VIDEO_MACRO_PRESET } from '../../domain/nutrition';
import type {
  ActivityPresetId,
  CalorieGoal,
  MetabolicMethod,
  MetabolicSex,
} from '../../domain/nutrition';
import type { HydrationConfiguration } from '../../domain/hydration/hydration';
import { ageOnDate, type BodyGoal, type UserProfile } from '../../domain/profile/profile';
import type { ProfileRepository } from '../../domain/profile/repository';
import type { NutritionTargetSnapshot } from '../../domain/targets/nutrition-target';
import type { NutritionTargetRepository } from '../../domain/targets/repository';
import { createUuid } from '../../shared/ids/create-uuid';

export interface CreateProfileCommand {
  profileId?: string;
  name: string;
  dateOfBirth: string;
  metabolicSex: MetabolicSex;
  heightCm: number;
  currentWeightKg: number;
  goal: BodyGoal;
  activity: { presetId?: ActivityPresetId; factor: number };
  metabolicMethod: MetabolicMethod;
  calorieGoal: CalorieGoal;
  hydrationConfiguration: HydrationConfiguration;
}

export interface CreateProfileResult {
  profile: UserProfile;
  target: NutritionTargetSnapshot;
}

export class CreateProfileService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly targets: NutritionTargetRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly id: () => string = createUuid,
  ) {}

  async execute(command: CreateProfileCommand): Promise<CreateProfileResult> {
    const now = this.now();
    const timestamp = now.toISOString();
    const existingProfile = command.profileId
      ? await this.profiles.getById(command.profileId)
      : undefined;
    const profileId = existingProfile?.id ?? this.id();
    const macroConfiguration = existingProfile?.macroConfiguration ?? VIDEO_MACRO_PRESET;
    const input = {
      sex: command.metabolicSex,
      weightKg: command.currentWeightKg,
      heightCm: command.heightCm,
      ageYears: ageOnDate(command.dateOfBirth, now),
      metabolicMethod: command.metabolicMethod,
      activityFactor: command.activity.factor,
      calorieGoal: command.calorieGoal,
      macros: macroConfiguration,
    } as const;
    const result = calculateNutritionTargets(input);

    const profile: UserProfile = {
      id: profileId,
      name: command.name.trim(),
      dateOfBirth: command.dateOfBirth,
      metabolicSex: command.metabolicSex,
      heightCm: command.heightCm,
      currentWeightKg: command.currentWeightKg,
      goal: command.goal,
      activity: command.activity,
      metabolicMethod: command.metabolicMethod,
      calorieGoal: command.calorieGoal,
      macroConfiguration,
      hydrationConfiguration: command.hydrationConfiguration,
      avatarMediaId: existingProfile?.avatarMediaId,
      nutritionPlanning: existingProfile?.nutritionPlanning,
      hydrationRoutine: existingProfile?.hydrationRoutine ?? { wakeTime: '07:00', sleepTime: '23:00', remindersEnabled: false, pacingMode: 'continuous' },
      units: { weight: 'kg', height: 'cm', energy: 'kcal' },
      createdAt: existingProfile?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    const activeTarget = await this.targets.getActiveForProfile(profileId);
    if (activeTarget && JSON.stringify(activeTarget.input) === JSON.stringify(input)) {
      await this.profiles.save(profile);
      return { profile, target: activeTarget };
    }
    if (activeTarget) {
      await this.targets.save({ ...activeTarget, endsAt: timestamp, updatedAt: timestamp });
    }
    const target: NutritionTargetSnapshot = {
      id: this.id(),
      profileId,
      input,
      result,
      startsAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.profiles.save(profile);
    await this.targets.save(target);
    return { profile, target };
  }
}
