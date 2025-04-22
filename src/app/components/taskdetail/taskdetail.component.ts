import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Task } from '../../models/task.model';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-taskdetail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './taskdetail.component.html',
  styleUrls: ['./taskdetail.component.css'],
})
export class TaskdetailComponent {
  @Input() task!: Task;
  @Input() projectId!: string;
  @Output() closed = new EventEmitter<void>();

  constructor(private firestore: Firestore) {}

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
      console.log('削除完了');
      this.closed.emit();
    } catch (error) {
      console.error('削除エラー:', error);
    }
  }

  onClosePanel(): void {
    console.log('[DEBUG] onClosePanel in TaskdetailComponent');
    try {
      this.closed.emit();
    } catch (error) {
      console.error('閉じるエラー:', error);
    }
  }
}
