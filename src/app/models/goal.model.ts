export interface GoalCard {
  type: 'goal';
  title: string;
  dueDate: string;
  progress: number;
}

export interface MilestoneCard {
  type: 'milestone';
  id: string;
  title: string;
  sectionTitle: string;
  dueDate: string;
  dependentTaskIds: string[];
  progress?: number;
  status?: '未着手' | '進行中' | '完了';
}
