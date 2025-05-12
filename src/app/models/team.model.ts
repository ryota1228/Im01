export interface Team {
    id: string;
    name: string;
    memberIds: string[];
    createdBy: string;
    createdAt?: string | Date;
    projectIds: string[];
  }
  