import { describe, it, expect } from "vitest";
import { teacherKeyOf } from "@/lib/classroom.functions";
describe("teacher key", () => {
  it("same teacher name with different spacing/case maps to one report", () => { expect(teacherKeyOf("  Bu  Ani ")).toBe(teacherKeyOf("bu ani")); });
  it("different teachers in one school get separate reports", () => { expect(teacherKeyOf("Bu Ani")).not.toBe(teacherKeyOf("Pak Budi")); });
});
