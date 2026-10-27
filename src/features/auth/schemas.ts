import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Escribe tu correo electrónico."),
  password: z.string().min(1, "Escribe tu contraseña."),
  remember: z.boolean(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre."),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  email: z.string().trim().min(1, "Escribe tu correo electrónico."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  remember: z.boolean(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
