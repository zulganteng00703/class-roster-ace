import { describe, it, expect } from "vitest";
import { SCHOOLS, schoolCode, findSchoolByCode } from "@/lib/schools";

describe("school classrooms", () => {
  it("lists 29 schools without SDN 21 BNW", () => {
    expect(SCHOOLS.length).toBe(29);
    expect(SCHOOLS).not.toContain("SDN 21 BNW");
  });
  it("maps school names to valid classroom codes", () => {
    expect(schoolCode("SDN 1 BNW")).toBe("SDN1BNW");
    expect(findSchoolByCode("SDIT")).toBe("SDIT IK");
    expect(schoolCode("SDIT IK")).toBe("SDIT");
    for (const s of SCHOOLS) expect(schoolCode(s)).toMatch(/^[A-Z0-9]{4,12}$/);
  });
  it("rejects codes outside the list", () => {
    expect(findSchoolByCode("ZUL123")).toBeUndefined();
  });
});
