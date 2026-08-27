import { describe, expect, it } from "vitest";

import { estimateEntropy, getPasswordStrength } from "./password-strength";

describe("password strength", () => {
  it("calculates estimated entropy", () => expect(estimateEntropy(10, 32)).toBe(50));
  it("classifies immediately below and at 50 bits", () => {
    expect(getPasswordStrength(10, 31).level).toBe("weak");
    expect(getPasswordStrength(10, 32).level).toBe("medium");
  });
  it("classifies immediately below and at 80 bits", () => {
    expect(getPasswordStrength(8, 1000).level).toBe("medium");
    expect(getPasswordStrength(8, 1024).level).toBe("strong");
  });
});
