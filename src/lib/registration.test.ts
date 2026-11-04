import { describe, expect, it } from "vitest";
import { registrationErrors, signUpErrorMessage } from "./registration";
import { accountState, homeFor } from "./workflow";

const ok = { fullName: "Test Nurse", email: "Nurse.One@Example.test", password: "Clinic2026pass", confirmPassword: "Clinic2026pass", phone: "", staffNumber: "" };

describe("staff registration form", () => {
  it("accepts a valid registration with optional fields empty", () => {
    expect(registrationErrors(ok)).toEqual({});
  });
  it("rejects a malformed email", () => {
    expect(registrationErrors({ ...ok, email: "not-an-email" }).email).toBeDefined();
  });
  it("rejects a password shorter than 10 characters", () => {
    expect(registrationErrors({ ...ok, password: "abc12345", confirmPassword: "abc12345" }).password).toBe("Password must be at least 10 characters");
  });
  it("rejects a password without numbers", () => {
    expect(registrationErrors({ ...ok, password: "onlyletterslong", confirmPassword: "onlyletterslong" }).password).toBe("Password must contain letters and numbers");
  });
  it("rejects a confirmation that does not match", () => {
    expect(registrationErrors({ ...ok, confirmPassword: "Clinic2026pasS" }).confirmPassword).toBe("Passwords do not match");
  });
  it("rejects letters in the phone number", () => {
    expect(registrationErrors({ ...ok, phone: "09abc" }).phone).toBeDefined();
  });
  it("explains a duplicate email", () => {
    expect(signUpErrorMessage("user_already_exists", "User already registered")).toMatch(/already exists/);
  });
});

describe("account state after sign-in", () => {
  it("pending registrations have no access even if a role row existed", () => {
    expect(accountState({ approvalStatus: "pending_approval", active: true, roles: ["admin"] })).toBe("pending");
  });
  it("rejected registrations are reported as rejected", () => {
    expect(accountState({ approvalStatus: "rejected", active: false, roles: [] })).toBe("rejected");
  });
  it("deactivated approved accounts are reported as deactivated", () => {
    expect(accountState({ approvalStatus: "approved", active: false, roles: ["receptionist"] })).toBe("disabled");
  });
  it("approved active staff with a role may enter", () => {
    expect(accountState({ approvalStatus: "approved", active: true, roles: ["lab_tech"] })).toBe("ok");
  });
});

describe("department home after sign-in", () => {
  it("sends each single-role staff member to their department", () => {
    expect(homeFor(["receptionist"])).toBe("/reception");
    expect(homeFor(["clinician"])).toBe("/opd");
    expect(homeFor(["lab_tech"])).toBe("/lab");
  });
  it("sends administrators to the main dashboard", () => {
    expect(homeFor(["admin"])).toBe("/dashboard");
    expect(homeFor(["admin", "lab_tech"])).toBe("/dashboard");
  });
});
