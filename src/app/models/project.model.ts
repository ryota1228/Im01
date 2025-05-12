export interface Project {
    id: string;
    title: string;
    name: string;
    createdAt?: any;
    updatedAt?: any;
    memberIds: string[];
    status?: string;
    dueDate?: any;
    pinned?: boolean;
    delayedCount?: number;
    teamIds: string[];
  }
  