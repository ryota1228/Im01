// src/app/models/notification.model.ts
export type NotificationType =
  | 'new'
  | 'update'
  | 'comment'
  | 'deadline'
  | 'progress';

export interface Notification {
  id: string;
  taskId: string;
  taskName: string;
  projectId: string;
  type: NotificationType;
  timestamp: any; // Firestore Timestamp
  isRead: boolean;
  recipientId: string;
}
