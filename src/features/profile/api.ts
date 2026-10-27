import { apiRequest } from "@/shared/api/client";
import type {
  Notification,
  PayoutRequest,
  ProfileStats,
  UserProfile,
  WalletSummary,
} from "@/shared/api/types";

export function getMyProfile() {
  return apiRequest<UserProfile>("/api/users/me");
}

export function updateMyProfile(payload: {
  name?: string;
  phone?: string | null;
  emergencyContact?: string | null;
}) {
  return apiRequest<UserProfile>("/api/users/me", { method: "PUT", body: payload });
}

export function getMyStats() {
  return apiRequest<ProfileStats>("/api/users/me/stats");
}

export function getWallet() {
  return apiRequest<WalletSummary>("/api/users/me/wallet");
}

export function listMyPayouts() {
  return apiRequest<PayoutRequest[]>("/api/users/me/payout-requests");
}

export function requestPayout(amount: number, note?: string | null) {
  return apiRequest<{
    payoutRequest: PayoutRequest;
    balance: number | string;
    held: number | string;
    available: number | string;
  }>("/api/users/me/payout-requests", {
    method: "POST",
    body: { amount, note: note ?? null },
  });
}

export function listNotifications(userId: number) {
  return apiRequest<Notification[]>(`/api/users/${userId}/notifications`);
}

export function listUsers() {
  return apiRequest<UserProfile[]>("/api/users");
}
