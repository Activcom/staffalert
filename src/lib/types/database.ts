export type AlertType = "routine" | "urgent";
export type AlertStatus = "active" | "dismissed";

export interface AlertRow {
  id: string;
  message: string;
  type: AlertType;
  status: AlertStatus;
  created_at: string;
}

export interface ScheduledMessageRow {
  id: string;
  message: string;
  type: AlertType;
  /** Jours 0–6 (dim–sam), stockés en PostgreSQL comme integer[] */
  days: number[];
  time: string;
  active: boolean;
}
