import { DocumentData, FirestoreDataConverter } from '@angular/fire/firestore';

export interface Task {
  id: string;
  title: string;
  assignee: string;
  dueDate: any; // Date でも Firebase Timestamp でもOK
  section: string;
  status: string;
}

export const taskConverter: FirestoreDataConverter<Task> = {
  fromFirestore(snapshot, options) {
    const data = snapshot.data(options);
    console.log('[converter] raw data:', data);
    return {
      id: snapshot.id,
      title: data['title'],
      assignee: data['assignee'],
      dueDate: data['dueDate'].toDate?.() ?? new Date(),
      section: data['section'],
      status: data['status'],
    };
  },

  toFirestore(task: Task): DocumentData {
    return {
      title: task.title,
      assignee: task.assignee,
      dueDate: task.dueDate,
      section: task.section,
      status: task.status,
    };
  }
};