/**
 * Mock OceaView room-log data (MET ONE 3400+ continuous monitoring).
 *
 * Numbers are taken from the "Daily Room conditions for 25Aug2026" email that
 * is assembled by hand today — the same report Task 3 automates. Limits are as
 * stated in that email's header row.
 */

export interface MockRoomReading {
  logger: string
  location: string
  temperatureC: number
  humidityRh: number
  /** Room pressure in Pa. null where the logger reports NA. */
  pressurePa: number | null
  /** Non-viable particle count trend over the last three shifts. */
  nonViableTrend?: 'flat' | 'rising' | 'falling'
}

export const ROOM_LIMITS = {
  /** Temperature must be at or below this. */
  maxTemperatureC: 20.0,
  /** Relative humidity must be at or below this. */
  maxHumidityRh: 60.0,
  /** Cascade differential must be at least this, and must be positive. */
  minDifferentialPa: 5.0,
}

export const MOCK_ROOM_READINGS: MockRoomReading[] = [
  {
    logger: 'X2-0142',
    location: 'Ante Room',
    temperatureC: 21.98,
    humidityRh: 37.13,
    pressurePa: 10.5,
    nonViableTrend: 'rising',
  },
  {
    logger: 'X2-036F',
    location: 'Gowning Room',
    temperatureC: 22.02,
    humidityRh: 36.78,
    pressurePa: 22.13,
    nonViableTrend: 'flat',
  },
  {
    logger: 'X2-04A9',
    location: 'Buffer Room Front',
    temperatureC: 19.13,
    humidityRh: 49.84,
    pressurePa: 19.13,
    nonViableTrend: 'flat',
  },
  {
    logger: 'X2-0090',
    location: 'Buffer Room Back',
    temperatureC: 18.68,
    humidityRh: 42.7,
    pressurePa: null,
    nonViableTrend: 'flat',
  },
]

export const OCEAVIEW_READ_AT = '2026-08-25T14:45:00'

/** Which suite a batch is compounded in — used to join batch to room data. */
export const BATCH_SUITE: Record<string, string[]> = {
  'BR-2026-0417': ['Ante Room', 'Gowning Room', 'Buffer Room Front'],
  'BR-2026-0418': ['Ante Room', 'Gowning Room', 'Buffer Room Back'],
  'BR-2026-0415': ['Ante Room', 'Gowning Room', 'Buffer Room Front'],
  'BR-2026-0414': ['Ante Room', 'Gowning Room', 'Buffer Room Front'],
}
