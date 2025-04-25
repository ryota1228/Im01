import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Task } from '../../models/task.model';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-taskdetail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './taskdetail.component.html',
  styleUrls: ['./taskdetail.component.css'],
})
export class TaskdetailComponent implements OnInit {
  @Input() task: Task | null = null;
  @Input() projectId: string | null = null;
  @Output() closed = new EventEmitter<void>();

  constructor(private firestore: Firestore, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    console.log('[Taskdetail] Init - task:', this.task);
    console.log('[Taskdetail] Init - projectId:', this.projectId);
  }

  get dueDateString(): string {
    if (!this.task?.dueDate) return '';
    try {
      return new Date(this.task.dueDate).toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  onDueDateChange(dateStr: string) {
    if (this.task) {
      this.task.dueDate = dateStr ? new Date(dateStr) : null;
    }
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
  
    if (this.task.status === '完了') {
      updatedTask.section = '完了済み';
  
      this.snackBar.open('✔ 完了したタスクを完了済みセクションに移動しました', '', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['complete-snackbar']
      });
    }
  
    try {
      await updateDoc(ref, updatedTask);
      this.closed.emit();
    } catch (error) {
      console.error('Task update failed:', error);
    }
    
  }

  async deleteTask(): Promise<void> {
    if (!this.task?.id || !this.projectId) {
      console.warn('[Taskdetail] Cannot delete - Missing projectId or task.id');
      return;
    }

    const taskRef = doc(this.firestore, `projects/${this.projectId}/tasks/${this.task.id}`);
    try {
      await deleteDoc(taskRef);
      console.log('[Taskdetail] Task deleted:', this.task.id);
      this.closed.emit();
    } catch (error) {
      console.error('[Taskdetail] Task deletion failed:', error);
    }
  }

  onClosePanel(): void {
    this.closed.emit();
  }
}