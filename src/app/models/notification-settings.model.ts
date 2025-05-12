export type NotificationScope = 'all' | 'assigned' | 'none';

export interface NotificationSettings {
  newTask: NotificationScope;
  taskUpdate: NotificationScope;
  comment: NotificationScope;
  deadline: {
    daysBefore: number;
    enabled: boolean;
  };
  progress: boolean;
  external: {
    desktop: boolean;
    email: boolean;
    slack: boolean;
  };
}
