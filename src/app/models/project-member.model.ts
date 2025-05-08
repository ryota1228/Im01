export interface ProjectMember {
    uid: string;
    displayName: string;
    email: string;
    role: 'owner' | 'editor' | 'viewer';
  }