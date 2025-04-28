import { DocumentData, FirestoreDataConverter } from '@angular/fire/firestore';

export interface Task {
  id: string;
  title: string;
  assignee: string;
  dueDate: any;
  section: string;
  status: string;
  priority?: string;
  progress?: number;
  estimate?: number;
  actual?: number;
  description?: string;
  chat?: string;
  history?: string[];
  order?: number | null;
  completionOrder?: number | null;
}

export const taskConverter: FirestoreDataConverter<Task> = {
  fromFirestore(snapshot, options) {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      title: data['title'],
      assignee: data['assignee'],
      dueDate: data['dueDate']?.toDate?.() ?? null,
      section: data['section'],
      status: data['status'],
      priority: data['priority'],
      progress: data['progress'] ?? 0,
      estimate: data['estimate'],
      actual: data['actual'],
      description: data['description'],
      chat: data['chat'],
      history: data['history'] ?? [],
      order: data['order'],
      completionOrder: data['completionOrder'] ?? null,
    };
  },

  toFirestore(task: Task): DocumentData {
    return {
      title: task.title,
      assignee: task.assignee,
      dueDate: task.dueDate,
      section: task.section,
      status: task.status,
      priority: task.priority,
      progress: task.progress,
      estimate: task.estimate,
      actual: task.actual,
      description: task.description,
      chat: task.chat,
      history: task.history,
      order: task.order,
      completionOrder: task.completionOrder,
    };
  }
};