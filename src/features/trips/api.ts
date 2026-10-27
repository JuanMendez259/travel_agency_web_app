import { apiRequest, apiUpload } from "@/shared/api/client";
import type {
  CapacityRequest,
  PointOfInterest,
  SeatMap,
  TransportType,
  Trip,
  TripOption,
  TripOptionInput,
  TripRating,
  TripTransportInfo,
  TripUpsertInput,
} from "@/shared/api/types";

export function listTrips() {
  return apiRequest<Trip[]>("/api/trips", { skipAuth: true });
}

export function getTrip(tripId: number) {
  return apiRequest<Trip>(`/api/trips/${tripId}`, { skipAuth: true });
}

export function listManageTrips() {
  return apiRequest<Trip[]>("/api/trips/manage");
}

export function listFavorites() {
  return apiRequest<Trip[]>("/api/favorites");
}

export function addFavorite(tripId: number) {
  return apiRequest<void>(`/api/favorites/${tripId}`, { method: "POST" });
}

export function removeFavorite(tripId: number) {
  return apiRequest<void>(`/api/favorites/${tripId}`, { method: "DELETE" });
}

export function getSeatMap(tripId: number) {
  return apiRequest<SeatMap>(`/api/trips/${tripId}/seatmap`);
}

export function getSeatAvailability(tripId: number) {
  return apiRequest<SeatMap>(`/api/trips/${tripId}/seats`);
}

export function createTrip(input: TripUpsertInput) {
  return apiRequest<Trip>("/api/trips", { method: "POST", body: input });
}

export function updateTrip(tripId: number, input: TripUpsertInput) {
  return apiRequest<Trip>(`/api/trips/${tripId}`, { method: "PUT", body: input });
}

export function deleteTrip(tripId: number, message?: string) {
  return apiRequest<void>(`/api/trips/${tripId}`, {
    method: "DELETE",
    body: message ? { message } : undefined,
  });
}

export function setTripActive(tripId: number, isActive: boolean) {
  return apiRequest<Trip>(`/api/trips/${tripId}/active`, {
    method: "PUT",
    body: { isActive },
  });
}

export function finalizeTrip(tripId: number, finalized: boolean) {
  return apiRequest<Trip>(`/api/trips/${tripId}/finalize`, {
    method: "PUT",
    body: { finalized },
  });
}

export function updateDeparture(
  tripId: number,
  payload: { checkInOpen?: boolean; departureCompleted?: boolean },
) {
  return apiRequest<Trip>(`/api/trips/${tripId}/departure`, {
    method: "PUT",
    body: payload,
  });
}

export function uploadTripImage(tripId: number, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiUpload<Trip | { imageUrl?: string; url?: string }>(
    `/api/trips/${tripId}/image`,
    form,
  );
}

export function getTransport(tripId: number) {
  return apiRequest<TripTransportInfo | null>(`/api/trips/${tripId}/transport`);
}

export function publishTransport(tripId: number, plate?: string, file?: File) {
  const form = new FormData();
  if (plate) form.append("plate", plate);
  if (file) form.append("file", file);
  return apiUpload<TripTransportInfo>(`/api/trips/${tripId}/transport`, form);
}

export function updateRoute(
  tripId: number,
  payload: {
    originLatitude: number | null;
    originLongitude: number | null;
    destinationLatitude: number | null;
    destinationLongitude: number | null;
  },
) {
  return apiRequest<void>(`/api/trips/${tripId}/route`, { method: "PUT", body: payload });
}

export function listTripRatings(tripId: number) {
  return apiRequest<TripRating[]>(`/api/trips/${tripId}/ratings`);
}

export function getMyRating(tripId: number) {
  return apiRequest<TripRating | null>(`/api/trips/${tripId}/rating/me`);
}

export function upsertRating(tripId: number, rating: number, comment: string | null) {
  return apiRequest<TripRating>(`/api/trips/${tripId}/rating`, {
    method: "PUT",
    body: { rating, comment },
  });
}

export function listTripOptions(tripId: number) {
  return apiRequest<TripOption[]>(`/api/trips/${tripId}/options`, { skipAuth: true });
}

export function createTripOption(tripId: number, input: TripOptionInput) {
  return apiRequest<TripOption>(`/api/trips/${tripId}/options`, {
    method: "POST",
    body: input,
  });
}

export function updateTripOption(tripId: number, optionId: number, input: TripOptionInput) {
  return apiRequest<TripOption>(`/api/trips/${tripId}/options/${optionId}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteTripOption(tripId: number, optionId: number) {
  return apiRequest<void>(`/api/trips/${tripId}/options/${optionId}`, { method: "DELETE" });
}

export function listPois(tripId: number) {
  return apiRequest<PointOfInterest[]>(`/api/trips/${tripId}/pois`);
}

export function createPoi(
  tripId: number,
  input: { name: string; description?: string | null; latitude: number; longitude: number },
) {
  return apiRequest<PointOfInterest>(`/api/trips/${tripId}/pois`, {
    method: "POST",
    body: input,
  });
}

export function updatePoi(
  tripId: number,
  poiId: number,
  input: { name: string; description?: string | null; latitude: number; longitude: number },
) {
  return apiRequest<PointOfInterest>(`/api/trips/${tripId}/pois/${poiId}`, {
    method: "PUT",
    body: input,
  });
}

export function deletePoi(tripId: number, poiId: number) {
  return apiRequest<void>(`/api/trips/${tripId}/pois/${poiId}`, { method: "DELETE" });
}

export function requestCapacity(
  tripId: number,
  requestedSeats: number,
  message?: string | null,
) {
  return apiRequest<CapacityRequest>(`/api/trips/${tripId}/capacity-requests`, {
    method: "POST",
    body: { requestedSeats, message },
  });
}

export function listCapacityRequests(tripId: number) {
  return apiRequest<CapacityRequest[]>(`/api/trips/${tripId}/capacity-requests`);
}

export function tripImageFallback(type: TransportType): string {
  return type === "Camioneta" ? "Camioneta" : "Autobús";
}
