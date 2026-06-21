// ── Ceremonies ──────────────────────────────────────────────────────────────
export interface Ceremony {
  id: string;
  name: string;
  date: string; // ISO date
  time: string;
  venue: string;
  notes: string;
  color: string; // tailwind color class for UI
  createdAt: number;
}

// ── Guests ────────────────────────────────────────────────────────────────────
export type RSVPStatus = "confirmed" | "pending" | "declined";
export type GuestSide = "bride" | "groom" | "both";
export type DietaryPref = "veg" | "jain" | "non-veg" | "vegan" | "other";

export interface Guest {
  id: string;
  name: string;
  side: GuestSide;
  contact: string;
  rsvp: RSVPStatus;
  plusOnes: number;
  dietary: DietaryPref;
  tableId: string; // "" if unassigned
  ceremonies: string[]; // ceremony IDs
  notes: string;
  createdAt: number;
}

// ── Tables / Seating ──────────────────────────────────────────────────────────
export interface Table {
  id: string;
  name: string;
  capacity: number;
  notes: string;
  createdAt: number;
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export type PaymentStatus = "paid" | "partial" | "pending";
export type PaymentMode = "cash" | "upi" | "bank_transfer" | "cheque" | "other";

export interface Expense {
  id: string;
  category: string;
  vendor: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string; // ISO date
  status: PaymentStatus;
  paymentMode: PaymentMode;
  notes: string;
  ceremonyId: string; // optional link
  createdAt: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  createdAt: number;
}

// ── Logistics ─────────────────────────────────────────────────────────────────
export interface RefreshmentStatus {
  id: string;
  ceremonyId: string;
  item: string; // "juice", "water", "chai", etc.
  status: "ready" | "pending" | "not-needed";
  notes: string;
}

export interface MenuItem {
  id: string;
  ceremonyId: string;
  name: string;
  category: string; // starter/main/dessert/drink
  headcount: number; // expected servings
  perHeadCost: number;
  notes: string;
}

// ── Gallery ───────────────────────────────────────────────────────────────────
export interface DriveFolder {
  id: string;
  shareLink: string;
  folderId: string;
  label: string;
  addedAt: number;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink: string;
  parents?: string[];
  modifiedTime: string;
}