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
  days: string;
  time: string;
  active: boolean;
}
