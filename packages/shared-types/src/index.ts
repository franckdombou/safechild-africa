// ─── ENUMS ────────────────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  PARENT = 'PARENT',
}

export enum SubscriptionPlan {
  BASIC = 'BASIC',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
}

export enum AlertType {
  ARRIVED_SCHOOL     = 'ARRIVED_SCHOOL',
  LEFT_SCHOOL        = 'LEFT_SCHOOL',
  ARRIVED_HOME       = 'ARRIVED_HOME',
  ROUTE_DEVIATION    = 'ROUTE_DEVIATION',
  BRACELET_REMOVED   = 'BRACELET_REMOVED',
  SOS_TRIGGERED      = 'SOS_TRIGGERED',
  CHILD_MISSING      = 'CHILD_MISSING',
  LOW_BATTERY        = 'LOW_BATTERY',
  BRACELET_OFFLINE   = 'BRACELET_OFFLINE',
  ENTERED_DANGER_ZONE = 'ENTERED_DANGER_ZONE',
}

export enum AlertSeverity {
  INFO     = 'INFO',
  WARNING  = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum BraceletStatus {
  ACTIVE      = 'ACTIVE',
  INACTIVE    = 'INACTIVE',
  LOST        = 'LOST',
  DEFECTIVE   = 'DEFECTIVE',
  IN_STOCK    = 'IN_STOCK',
}

export enum SchoolAccessStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVOKED  = 'REVOKED',
}

export enum MissingStatus {
  ACTIVE   = 'ACTIVE',
  FOUND    = 'FOUND',
  CLOSED   = 'CLOSED',
}

// ─── INTERFACES ───────────────────────────────────────────────

export interface GpsPosition {
  lat: number
  lng: number
  accuracy?: number
  timestamp: Date
}

export interface GeoFence {
  type: 'circle' | 'polygon'
  center?: GpsPosition
  radius?: number          // mètres (si circle)
  coordinates?: GpsPosition[] // sommets (si polygon)
}

export interface JwtPayload {
  sub: string              // userId
  role: UserRole
  email: string
  iat?: number
  exp?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// ─── WEBSOCKET EVENTS ─────────────────────────────────────────

export enum WsEvent {
  // Serveur → Client
  POSITION_UPDATE   = 'position:update',
  ALERT_NEW         = 'alert:new',
  CHILD_STATUS      = 'child:status',
  AMBER_ALERT       = 'amber:alert',

  // Client → Serveur
  SUBSCRIBE_CHILD   = 'subscribe:child',
  UNSUBSCRIBE_CHILD = 'unsubscribe:child',
}

// ─── MQTT TOPICS ──────────────────────────────────────────────

export const MQTT_TOPICS = {
  POSITION:        (deviceId: string) => `bracelet/${deviceId}/position`,
  ALERT:           (deviceId: string) => `bracelet/${deviceId}/alert`,
  BATTERY:         (deviceId: string) => `bracelet/${deviceId}/battery`,
  REMOVAL:         (deviceId: string) => `bracelet/${deviceId}/removal`,
  SOS:             (deviceId: string) => `bracelet/${deviceId}/sos`,
  COMMAND:         (deviceId: string) => `bracelet/${deviceId}/command`,
} as const