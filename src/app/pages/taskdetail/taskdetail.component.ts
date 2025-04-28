import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { Task } from '../../models/task.model';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../../services/firestore.service';
import { Section } from '../../models/section.model';

@Component({
  selector: 'app-taskdetail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './taskdetail.component.html',
  styleUrls: ['./taskdetail.component.css'],
})

// implements OnChanges

export class TaskdetailComponent  {
  @Input() task!: Task;
  @Input() projectId!: string;
  @Output() closed = new EventEmitter<void>();

  userOptions: { uid: string, displayName: string }[] = [];
  sections: Section[] = [];
  members: { uid: string, displayName: string }[] = [];


  constructor(private firestore: Firestore, private firestoreService: FirestoreService) {}

  get dueDateString(): string {
    return this.task?.dueDate
      ? new Date(this.task.dueDate).toISOString().split('T')[0]
      : '';
  }

  onDueDateChange(dateStr: string) {
    this.task.dueDate = dateStr ? new Date(dateStr) : null;
  }

  async saveTask(): Promise<void> {
    if (!this.projectId || !this.task?.id) return;

    const ref = doc(this.firestore, `projects/${this.projectId}/tasks/${this.task.id}`);
    const updatedTask = {
      title: this.task.title,
      assignee: this.task.assignee,
      dueDate: this.task.dueDate,
      status: this.task.status,
      section: this.task.section,
    };

    await updateDoc(ref, updatedTask);
    console.log('[DEBUG] Task updated!');
    this.closed.emit();

  }

  async deleteTask(): Promise<void> {
    if (!this.task?.id || !this.projectId) return;

    const taskRef = doc(this.firestore, `projects/${this.projectId}/tasks/${this.task.id}`);
    try {
      await deleteDoc(taskRef);
      console.log('[DEBUG] Task deleted!');
      this.closed.emit();
    } catch (error) {
      console.error('削除エラー:', error);
    }
  }

  onClosePanel(): void {
    this.closed.emit();
  }
}