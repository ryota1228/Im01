export type NotificationScope = 'all' | 'assigned' | 'none';

export interface NotificationSettings {
  default: {
    newTask: NotificationScope;
    taskUpdate: NotificationScope;
    comment: NotificationScope;
    deadline: {
      daysBefore: number;
      enabled: boolean;
    };
    progress: boolean;
  };
  overrides?: {
    [projectId: string]: {
      newTask?: NotificationScope;
      taskUpdate?: NotificationScope;
      comment?: NotificationScope;
      deadline?: {
        daysBefore: number;
        enabled: boolean;
      };
      progress?: boolean;
    };
  };
  external: {
    desktop: boolean;
    email: boolean;
    slack: boolean;
  };
}
