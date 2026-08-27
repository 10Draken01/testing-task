export interface NotificationAttemptEntity {
  id: string;
  taskId: string;
  attemptNumber: number;
  timestamp: string; // ISO string
  statusHttp?: number;
}