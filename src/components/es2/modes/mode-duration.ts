import { t } from '../../../i18n'

/** Expedition duration estimates are rounded up to whole minutes in all lobby surfaces. */
export const modeDurationMinutes = (duration: number | null): number => Math.ceil((duration ?? 0) / 60)
export const modeDurationLabel = (duration: number | null): string =>
  duration === null ? t('無時間限制') : t('{minutes} 分鐘', { minutes: modeDurationMinutes(duration) })
