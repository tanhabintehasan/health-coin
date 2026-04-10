// All coin amounts stored as BigInt (value × 100) to avoid floating point errors

export const toCoinUnits = (amount: number): bigint => BigInt(Math.round(amount * 100));

export const fromCoinUnits = (units: bigint): number => Number(units) / 100;

export const applyRate = (amount: bigint, rate: number): bigint => {
  // rate is a decimal like 0.5 for 50%
  // Multiply by 10000 to avoid floating point, then divide
  const rateInt = Math.round(rate * 10000);
  return (amount * BigInt(rateInt)) / BigInt(10000);
};
