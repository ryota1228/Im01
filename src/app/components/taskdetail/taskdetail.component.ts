import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Task } from '../../models/task.model';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-taskdetail',
  templateUrl: './taskdetail.component.html',
  styleUrls: ['./taskdetail.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class TaskdetailComponent {
  @Input() task!: Task;
  @Input() projectId!: string;
  @Input() isPanelOpen: boolean = false;
  @Output() closed = new EventEmitter<void>();

  constructor(private firestore: Firestore) {}

  onDueDateChange(dateStr: string) {
    this.task.dueDate = dateStr ? new Date(dateStr) : null;
  }

  saveTask(): void {
    if (!this.task?.id || !this.projectId) return;

    const taskRef = doc(this.firestore, `projects/${this.projectId}/tasks/${this.task.id}`);
    updateDoc(taskRef, {
      title: this.task.title,
      assignee: this.task.assignee,
      dueDate: this.task.dueDate,
      status: this.task.status,
      section: this.task.section,
    })
      .then(() => {
        console.log('保存完了');
        this.onClosePanel();
      })
      .catch((error) => {
        console.error('保存エラー:', error);
      });
  }

  deleteTask(): void {
    if (!this.task?.id || !this.projectId) return;

    const taskRef = doc(this.firestore, `projects/${this.projectId}/tasks/${this.task.id}`);
    deleteDoc(taskRef)
      .then(() => {
        console.log('削除完了');
        this.onClosePanel();
      })
      .catch((error) => {
        console.error('削除エラー:', error);
      });
  }

  onClosePanel(): void {
    this.closed.emit();
  }
}