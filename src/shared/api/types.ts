export type UserRole = "Client" | "Admin" | "Coordinador";

export type TransportType = "Camion" | "Camioneta";

export type BookingStatus = "Pending" | "Confirmed" | "Cancelled";

export type PaymentMethod =
  | "CreditCard"
  | "DebitCard"
  | "BankTransfer"
  | "Cash"
  | "PayPal"
  | "MercadoPago"
  | "Wallet";

export type PaymentStatus = "Pending" | "Completed" | "Refunded" | "Failed";

export type DiscountType = "Percentage" | "Amount";

export type PayoutStatus = "Pending" | "Paid" | "Rejected";

export type WalletType =
  | "CancellationCredit"
  | "BookingPayment"
  | "PayoutRequest"
  | "Adjustment";

export type AuthResponse = {
  token: string;
  userId: number;
  name: string;
  email: string;
  role: UserRole;
};

export type SocialAuthResponse = AuthResponse & {
  perfilIncompleto: boolean;
  proveedor: string | null;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  emergencyContact?: string | null;
};

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  emergencyContact: string | null;
  qrToken: string | null;
  supabaseUserId?: string | null;
  proveedor?: string | null;
  role: UserRole;
  createdAt?: string;
  bookings?: unknown[];
  notifications?: unknown[];
};

export type TripImage = {
  id: number;
  tripId: number;
  url: string;
  order: number;
  isCover: boolean;
  createdAt: string;
};

export type TripImagesUploadResult = {
  trip: Trip;
  uploaded: TripImage[];
};

export type TripOption = {
  id: number;
  tripId: number;
  name: string;
  description: string | null;
  priceAdult: number | string;
  priceChild: number | string | null;
  capacity: number;
  availableSeats: number;
  benefits: string | null;
  isActive: boolean;
  order: number;
  roomOccupancy?: number | null;
  capacityMode?: "Shared" | "Own";
  createdAt?: string;
  isBase: boolean;
  effectiveAvailableSeats?: number;
  benefitLines?: string[];
};

export type TripOptionInput = {
  name: string;
  description?: string | null;
  priceAdult: number;
  priceChild?: number | null;
  benefits?: string | null;
  isActive: boolean;
  order: number;
  roomOccupancy?: number | null;
};

export type PointOfInterest = {
  id: number;
  tripId: number;
  name: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  order: number;
};

export type CapacityRequest = {
  id: number;
  tripId: number;
  userId: number;
  requestedSeats: number;
  message: string | null;
  isResolved: boolean;
  createdAt: string;
  user?: UserProfile | null;
};

export type Trip = {
  id: number;
  title: string;
  destination: string;
  description: string | null;
  startDate: string;
  endDate: string;
  price: number | string;
  childPrice: number | string | null;
  capacity: number;
  availableSeats: number;
  transportType: TransportType;
  imageUrl: string | null;
  isActive: boolean;
  createdAt?: string;
  originLatitude?: number | null;
  originLongitude?: number | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  checkInOpen: boolean;
  departureCompleted: boolean;
  finalized: boolean;
  cancellationDaysLimit: number | null;
  bookingDeadline: string | null;
  category: string | null;
  bookings?: Booking[];
  capacityRequests?: CapacityRequest[];
  pointsOfInterest?: PointOfInterest[];
  images?: TripImage[];
  hasOptions: boolean;
  includesHotel: boolean;
  hotelName: string | null;
  hotelCapacity: number | null;
  hasTwoFloors: boolean;
  floor1Capacity: number | null;
  floor2Capacity: number | null;
  options?: TripOption[];
  fromPrice?: number | string | null;
  bookableCapacity?: number;
  cancelledAt?: string | null;
  cancelledByUserId?: number | null;
  isCancelled?: boolean;
};

export type TripCancellationResult = {
  trip: Trip;
  bookingsCancelled: number;
  totalRefunded: number | string;
};

export type TripUpsertInput = {
  title: string;
  destination: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  price: number | string;
  childPrice?: number | string | null;
  capacity: number;
  transportType: TransportType;
  imageUrl?: string | null;
  isActive: boolean;
  category?: string | null;
  bookingDeadline?: string | null;
  cancellationDaysLimit?: number | null;
  includesHotel: boolean;
  hotelName?: string | null;
  hotelCapacity?: number | null;
  hasTwoFloors: boolean;
  floor1Capacity?: number | null;
  floor2Capacity?: number | null;
  originLatitude?: number | null;
  originLongitude?: number | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
};

export type BookingPassenger = {
  id: number;
  bookingId: number;
  name: string | null;
  age: number | null;
  isChild: boolean;
  qrToken: string | null;
  checkedIn: boolean;
  checkedInAt: string | null;
  seatNumber: number | null;
  bookingItemId: number | null;
};

export type BookingItem = {
  id: number;
  bookingId: number;
  tripOptionId: number;
  adults: number;
  children: number;
  unitPriceAdult: number | string;
  unitPriceChild: number | string | null;
  optionName: string | null;
  roomOccupancy: number | null;
  rooms: number | null;
  tripOption?: TripOption | null;
};

export type Payment = {
  id: number;
  bookingId: number;
  amount: number | string;
  paymentDate: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string | null;
  refundedAmount?: number | string;
};

export type Booking = {
  id: number;
  userId: number;
  tripId: number;
  bookingDate: string;
  status: BookingStatus;
  numberOfSeats: number;
  seatNumber: number | null;
  totalAmount: number | string;
  refundTotal?: number | string;
  discountCode: string | null;
  discountAmount: number | string;
  specialNeedsNote: string | null;
  checkedIn: boolean;
  checkedInAt: string | null;
  qrToken: string | null;
  cancelledAt: string | null;
  cancelledByUserId: number | null;
  holderBookingItemId: number | null;
  user?: UserProfile | null;
  trip?: Trip | null;
  payments?: Payment[];
  passengers?: BookingPassenger[];
  items?: BookingItem[];
};

export type Seat = {
  number: number;
  isAisle: boolean;
  isOccupied: boolean;
  occupiedBy: string | null;
  bookingId: number | null;
  checkedIn: boolean;
  isAssigned: boolean;
  statusLabel: string | null;
};

export type SeatRow = {
  rowNumber: number;
  floor: number;
  seats: Seat[];
};

export type SeatMap = {
  tripId: number;
  tripTitle: string;
  transportType: TransportType;
  capacity: number;
  occupiedCount: number;
  availableCount: number;
  hasTwoFloors: boolean;
  floor1Capacity: number | null;
  floor2Capacity: number | null;
  rows: SeatRow[];
  occupiedSeats?: number[];
};

export type WalletTransaction = {
  id: number;
  userId: number;
  amount: number | string;
  type: WalletType;
  bookingId: number | null;
  refundId: number | null;
  payoutRequestId: number | null;
  note: string | null;
  createdAt: string;
};

export type WalletSummary = {
  balance: number | string;
  held: number | string;
  available: number | string;
  transactions: WalletTransaction[];
};

export type PayoutRequest = {
  id: number;
  userId: number;
  amount: number | string;
  status: PayoutStatus;
  note: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByUserId: number | null;
  user?: UserProfile | null;
};

export type PayoutResolution = {
  payoutRequest: PayoutRequest;
  balance: number | string;
  held: number | string;
  available: number | string;
};

export type Notification = {
  id: number;
  userId: number;
  message: string;
  createdAt: string;
};

export type TripRating = {
  id: number;
  tripId: number;
  userId: number;
  rating: number;
  comment: string | null;
  userName: string | null;
  destination: string | null;
  tripDate: string;
  transportType: TransportType;
  price: number | string;
  createdAt: string;
  user?: UserProfile | null;
};

export type Discount = {
  id: number;
  code: string;
  type: DiscountType;
  value: number | string;
  startDate: string | null;
  endDate: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  tripId: number | null;
  createdAt: string;
  trip?: Trip | null;
  isGlobal?: boolean;
  hasUsesLeft?: boolean;
};

export type DiscountInput = {
  code: string;
  type: DiscountType;
  value: number;
  startDate?: string | null;
  endDate?: string | null;
  usageLimit?: number | null;
  isActive: boolean;
  tripId?: number | null;
};

export type DiscountValidation = {
  valid: boolean;
  message: string;
  discountAmount: number | string;
  finalAmount: number | string;
  code: string | null;
  type?: DiscountType | null;
  value?: number | string | null;
};

export type TripExpense = {
  id: number;
  tripId: number;
  concept: string;
  amount: number | string;
  createdAt: string;
};

export type AdminStats = {
  tripsCount: number;
  bookingsCount: number;
  seatsSold: number;
  revenueTotal: number | string;
  occupancyPercent: number;
  monthlyRevenue: Array<{ month: string; amount: number | string }>;
  occupancyByTrip: Array<{
    tripId: number;
    title: string;
    capacity: number;
    sold: number;
    percent: number;
    progress: number;
    detail: string;
  }>;
  topDestinations: Array<{ destination: string; seats: number; seatsLabel?: string }>;
};

export type AuditLog = {
  id: number;
  userId: number;
  userName: string | null;
  entityType: string;
  entityId: number;
  action: string;
  summary: string;
  details: string | null;
  createdAt: string;
};

export type ProfileStats = {
  trips: number;
  reviews: number;
};

export type TripTransportInfo = {
  imageUrl: string | null;
  plate: string | null;
};

export type CheckinTokenResult = {
  kind: "passenger" | "booking" | string;
  name: string | null;
  checkedInAt: string | null;
  alreadyCheckedIn: boolean;
  seats: number | null;
};

export type CancelBookingResult = {
  booking: Booking;
  refundAmount: number | string;
  penaltyAmount: number | string;
  withinPolicy: boolean;
};

export type CancelTicketResult = CancelBookingResult & {
  walletBalance: number | string;
};

export type BookingOptionInput = {
  tripOptionId: number;
  adults: number;
  children: number;
};

export type PassengerInput = {
  name: string;
  age: number;
  seatNumber?: number | null;
};

export type CreateBookingRequest = {
  tripId: number;
  numberOfSeats: number;
  passengers?: PassengerInput[];
  seatNumber?: number | null;
  options?: BookingOptionInput[];
  useOptions?: boolean;
  discountCode?: string | null;
  specialNeedsNote?: string | null;
  walletAmount?: number | null;
};

export type CreatePassengersRequest = {
  passengers: PassengerInput[];
};

export type Coordinator = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
};

export type CreatedCoordinator = Coordinator & {
  temporaryPassword: string | null;
};

export type CreateCoordinatorRequest = {
  name: string;
  email: string;
  phone?: string | null;
  password: string;
};
