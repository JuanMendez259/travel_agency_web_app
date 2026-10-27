import { apiRequest } from "@/shared/api/client";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  SocialAuthResponse,
} from "@/shared/api/types";

export function login(payload: LoginRequest) {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: payload,
    skipAuth: true,
  });
}

export function register(payload: RegisterRequest) {
  return apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: payload,
    skipAuth: true,
  });
}

export function socialLogin(accessToken: string) {
  return apiRequest<SocialAuthResponse>("/api/auth/social", {
    method: "POST",
    body: { accessToken },
    skipAuth: true,
  });
}
