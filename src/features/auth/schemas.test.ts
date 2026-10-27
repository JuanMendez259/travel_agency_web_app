import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/features/auth/schemas";

describe("validación de autenticación", () => {
  it("exige correo y contraseña en login", () => {
    const result = loginSchema.safeParse({ email: "", password: "", remember: false });
    expect(result.success).toBe(false);
  });

  it("exige contraseña de al menos 6 caracteres al registrarse", () => {
    const result = registerSchema.safeParse({
      name: "Ana",
      email: "ana@correo.com",
      password: "123",
      remember: false,
    });
    expect(result.success).toBe(false);
  });

  it("acepta un registro válido", () => {
    const result = registerSchema.safeParse({
      name: "Ana",
      email: "ana@correo.com",
      password: "secreto123",
      remember: true,
    });
    expect(result.success).toBe(true);
  });
});
