export type Clock = () => Date;
export type FixtureParser<T> = (value: unknown) => T;

export const systemClock: Clock = () => new Date();

export function fixedClock(isoTime: string): Clock {
  const timestamp = Date.parse(isoTime);
  if (!Number.isFinite(timestamp)) throw new Error("invalid_fixed_clock");
  return () => new Date(timestamp);
}

export function parseFixture<T>(json: string, parser: FixtureParser<T>): T {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error("invalid_fixture_json");
  }
  return parser(value);
}

export function serializeFixture(value: unknown): string {
  return JSON.stringify(value);
}
