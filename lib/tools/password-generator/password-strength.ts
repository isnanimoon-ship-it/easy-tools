export type PasswordStrength = "weak" | "medium" | "strong";

export function estimateEntropy(length: number, poolSize: number) {
  if (length <= 0 || poolSize <= 1) return 0;
  return length * Math.log2(poolSize);
}

export function getPasswordStrength(length: number, poolSize: number): {
  level: PasswordStrength;
  entropy: number;
  meterValue: number;
} {
  const entropy = estimateEntropy(length, poolSize);
  if (entropy < 50) return { level: "weak", entropy, meterValue: 33 };
  if (entropy < 80) return { level: "medium", entropy, meterValue: 66 };
  return { level: "strong", entropy, meterValue: 100 };
}
