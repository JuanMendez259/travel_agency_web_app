import { apiRequest } from "@/shared/api/client";
import type {
  AdminStats,
  AuditLog,
  Coordinator,
  CreatedCoordinator,
  Discount,
  DiscountInput,
  DiscountValidation,
  PayoutRequest,
  PayoutResolution,
  TripExpense,
  UserProfile,
  UserRole,
} from "@/shared/api/types";

export function getAdminStats() {
  return apiRequest<AdminStats>("/api/admin/stats");
}

export function listAuditLog(params: { entity?: string; id?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params.entity) query.set("entity", params.entity);
  if (params.id != null) query.set("id", String(params.id));
  query.set("limit", String(params.limit ?? 200));
  return apiRequest<AuditLog[]>(`/api/admin/auditlog?${query.toString()}`);
}

export function listDiscounts() {
  return apiRequest<Discount[]>("/api/discounts");
}

export function createDiscount(input: DiscountInput) {
  return apiRequest<Discount>("/api/discounts", { method: "POST", body: input });
}

export function updateDiscount(id: number, input: DiscountInput) {
  return apiRequest<Discount>(`/api/discounts/${id}`, { method: "PUT", body: input });
}

export function deleteDiscount(id: number) {
  return apiRequest<void>(`/api/discounts/${id}`, { method: "DELETE" });
}

export function validateDiscount(payload: {
  code: string;
  tripId: number;
  baseAmount: number;
}) {
  return apiRequest<DiscountValidation>("/api/discounts/validate", {
    method: "POST",
    body: payload,
  });
}

export function listAllPayouts(status?: string) {
  const query = status && status !== "all" ? `?status=${status}` : "";
  return apiRequest<PayoutRequest[]>(`/api/payout-requests${query}`);
}

export function resolvePayout(id: number, approve: boolean) {
  return apiRequest<PayoutResolution>(`/api/payout-requests/${id}/resolve`, {
    method: "POST",
    body: { approve },
  });
}

export function listExpenses(tripId: number) {
  return apiRequest<TripExpense[]>(`/api/trips/${tripId}/expenses`);
}

export function createExpense(tripId: number, input: { concept: string; amount: number }) {
  return apiRequest<TripExpense>(`/api/trips/${tripId}/expenses`, {
    method: "POST",
    body: input,
  });
}

export function updateExpense(id: number, input: { concept: string; amount: number }) {
  return apiRequest<TripExpense>(`/api/expenses/${id}`, { method: "PUT", body: input });
}

export function deleteExpense(id: number) {
  return apiRequest<void>(`/api/expenses/${id}`, { method: "DELETE" });
}

export function listCoordinators() {
  return apiRequest<UserProfile[]>("/api/users");
}

export function createCoordinator(input: {
  name: string;
  email: string;
  phone?: string | null;
  password: string;
}) {
  return apiRequest<CreatedCoordinator>("/api/users/coordinators", {
    method: "POST",
    body: input,
  });
}

export function updateCoordinator(
  id: number,
  input: { name: string; email: string; phone?: string | null },
) {
  return apiRequest<Coordinator>(`/api/users/${id}`, { method: "PUT", body: input });
}

export function resetCoordinatorPassword(id: number) {
  return apiRequest<{ temporaryPassword: string }>(`/api/users/${id}/reset-password`, {
    method: "POST",
  });
}

export function deleteCoordinator(id: number) {
  return apiRequest<void>(`/api/users/${id}`, { method: "DELETE" });
}

export function updateUserRole(id: number, role: UserRole) {
  return apiRequest<UserProfile>(`/api/users/${id}/role`, {
    method: "PUT",
    body: { role },
  });
}
