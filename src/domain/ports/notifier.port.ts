export interface NotifierPort {
  notifyTaskArchived(payload: { taskId: string; title: string; archivedAt: string }): Promise<void>;
}