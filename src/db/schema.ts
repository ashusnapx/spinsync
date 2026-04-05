import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  pgEnum,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

// ═══════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════

export const machineStatusEnum = pgEnum("machine_status", [
  "free",
  "occupied",
  "grace_period",
  "locked",
  "maintenance",
  "out_of_order",
]);

export const machineTypeEnum = pgEnum("machine_type", [
  "washing_machine",
  "dryer",
  "iron",
  "dishwasher",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "free",
  "premium",
  "expired",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "created",
  "captured",
  "failed",
  "refunded",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "machine_free",
  "your_turn",
  "clothes_warning",
  "subscription_expiring",
  "subscription_expired",
  "achievement_earned",
  "system",
]);

export const achievementTypeEnum = pgEnum("achievement_type", [
  "punctual_pro",
  "early_bird",
  "community_star",
  "speed_demon",
  "first_wash",
  "streak_7",
  "streak_30",
]);

// ═══════════════════════════════════════════
// PG LOCATIONS
// ═══════════════════════════════════════════

export const pgLocations = pgTable("pg_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  address: text("address").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  orgId: text("org_id").notNull(),
  machineCount: integer("machine_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════
// MACHINES
// ═══════════════════════════════════════════

export const machines = pgTable("machines", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: machineTypeEnum("type").notNull(),
  status: machineStatusEnum("status").default("free").notNull(),
  orgId: text("org_id").notNull(),
  floor: text("floor"),
  location: text("location_description"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  qrSecret: text("qr_secret"),
  currentSessionId: uuid("current_session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════
// MACHINE SESSIONS
// ═══════════════════════════════════════════

export const machineSessions = pgTable("machine_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineId: uuid("machine_id").notNull().references(() => machines.id),
  userId: text("user_id").notNull(),
  orgId: text("org_id").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  heartbeatAt: timestamp("heartbeat_at").defaultNow().notNull(),
  graceStartedAt: timestamp("grace_started_at"),
  durationMinutes: integer("duration_minutes"),
  wasAutoEnded: boolean("was_auto_ended").default(false),
});

// ═══════════════════════════════════════════
// QUEUE
// ═══════════════════════════════════════════

export const queueEntries = pgTable("queue_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineId: uuid("machine_id").notNull().references(() => machines.id),
  userId: text("user_id").notNull(),
  orgId: text("org_id").notNull(),
  priorityScore: doublePrecision("priority_score").default(0).notNull(),
  premiumWeight: doublePrecision("premium_weight").default(0).notNull(),
  fairnessDecay: doublePrecision("fairness_decay").default(0).notNull(),
  position: integer("position").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  notifiedAt: timestamp("notified_at"),
});

// ═══════════════════════════════════════════
// USER PROFILES (extended user data)
// ═══════════════════════════════════════════

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  roomNumber: text("room_number").notNull(),
  orgId: text("org_id").notNull(),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default("free").notNull(),
  subscriptionExpiry: timestamp("subscription_expiry"),
  points: integer("points").default(0).notNull(),
  totalSessions: integer("total_sessions").default(0).notNull(),
  avgSessionMinutes: doublePrecision("avg_session_minutes").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════
// DEVICE IDENTITIES
// ═══════════════════════════════════════════

export const deviceIdentities = pgTable("device_identities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  fingerprint: text("fingerprint").notNull(),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"),
  lastLocationLat: doublePrecision("last_location_lat"),
  lastLocationLng: doublePrecision("last_location_lng"),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  isTrusted: boolean("is_trusted").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════
// LOCATION VERIFICATIONS
// ═══════════════════════════════════════════

export const locationVerifications = pgTable("location_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  gpsLat: doublePrecision("gps_lat").notNull(),
  gpsLng: doublePrecision("gps_lng").notNull(),
  ipLat: doublePrecision("ip_lat"),
  ipLng: doublePrecision("ip_lng"),
  trustScore: doublePrecision("trust_score").notNull(),
  gpsAccuracy: doublePrecision("gps_accuracy"),
  passed: boolean("passed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  orgId: text("org_id").notNull(),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpaySignature: text("razorpay_signature"),
  amount: integer("amount").notNull(), // in paise
  currency: text("currency").default("INR").notNull(),
  status: paymentStatusEnum("status").default("created").notNull(),
  plan: text("plan").default("premium_monthly"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════
// CHAT MESSAGES
// ═══════════════════════════════════════════

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  content: text("content").notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
  deletedByUserId: text("deleted_by_user_id"),
  deletedByAdmin: boolean("deleted_by_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  metadata: jsonb("metadata"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  action: text("action").notNull(),
  resource: text("resource"),
  resourceId: text("resource_id"),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════
// MACHINE QR TOKENS (rotating)
// ═══════════════════════════════════════════

export const machineQrTokens = pgTable("machine_qr_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineId: uuid("machine_id").notNull().references(() => machines.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════
// ACHIEVEMENTS
// ═══════════════════════════════════════════

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  type: achievementTypeEnum("type").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════

export type MachineStatus = "free" | "occupied" | "grace_period" | "locked" | "maintenance" | "out_of_order";
export type MachineType = "washing_machine" | "dryer" | "iron" | "dishwasher";
export type SubscriptionStatus = "free" | "premium" | "expired";
export type PaymentStatus = "created" | "captured" | "failed" | "refunded";
export type NotificationType = "machine_free" | "your_turn" | "clothes_warning" | "subscription_expiring" | "subscription_expired" | "achievement_earned" | "system";
export type AchievementType = "punctual_pro" | "early_bird" | "community_star" | "speed_demon" | "first_wash" | "streak_7" | "streak_30";
