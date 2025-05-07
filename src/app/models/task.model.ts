import { DocumentData, FirestoreDataConverter } from '@angular/fire/firestore';

export interface TaskHistoryEntry {
  field: string;
  before: string | number | null;
  after: string | number | null;
  timestamp: Date | string;
  changedBy: string;
}

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
  history?: TaskHistoryEntry[];
  order?: number | null;
  completionOrder?: number | null;
  descriptionDelta?: any;
  attachments?: Attachment[];
}

export interface Attachment {
  name?: string;
  url?: string;
  type?: string;
  uploadedAt?: Date;
  lastModified?: number;
  size?: number;
  webkitRelativePath?: string;
  arrayBuffer?: () => Promise<ArrayBuffer>;
  slice?: (start?: number, end?: number, contentType?: string) => Blob;
  stream?: () => ReadableStream<Uint8Array>;
  text?: () => Promise<string>;
};




function convertToDate(ts: any): Date | null {
  if (!ts) return null;

  if (typeof ts.toDate === 'function') {
    return ts.toDate();
  }

  if (typeof ts.seconds === 'number' && typeof ts.nanoseconds === 'number') {
    return new Date(ts.seconds * 1000 + Math.floor(ts.nanoseconds / 1_000_000));
  }

  const parsed = new Date(ts);
  return isNaN(parsed.getTime()) ? null : parsed;
}


export const taskConverter: FirestoreDataConverter<Task> = {
  fromFirestore(snapshot, options) {
    const data = snapshot.data(options);

    console.log('[DEBUG] Firestoreから取得したhistory:', data['history']);

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
      history: (data['history'] ?? []).map((h: any) => ({
        ...h,
        timestamp: convertToDate(h.timestamp)
      })),
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
}