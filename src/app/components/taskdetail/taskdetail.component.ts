import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Task } from '../../models/task.model';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Section } from '../../models/section.model';
import { FirestoreService } from '../../services/firestore.service';

@Component({
  selector: 'app-taskdetail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './taskdetail.component.html',
  styleUrls: ['./taskdetail.component.css'],
})

export class TaskdetailComponent implements OnInit{
  @Input() task!: Task;
  @Input() projectId!: string;
  @Output() closed = new EventEmitter<void>();

  sections: Section[] = [];
  members: { uid: string, displayName: string }[] = [];

  constructor(private firestore: Firestore, private snackBar: MatSnackBar, private firestoreService: FirestoreService) {}

  get dueDateString(): string {
    if (this.task?.dueDate) return'';
    return this.task.dueDate instanceof Date
    ? this.task.dueDate.toISOString().substring(0, 10)
    : new Date(this.task.dueDate).toISOString().substring(0, 10);
  }

  // onDueDateChange(dateString: string | null): void {
  //   if (dateString) {
  //     this.task.dueDate = new Date(dateString);
  //   } else {
  //     this.task.dueDate = null;
  //   }
  // }

  onDueDateChange(dateStr: string): void {
    this.task.dueDate = dateStr ? new Date(dateStr) : null;
  }
  
  ngOnInit(): void {
    if (!this.task.priority) this.task.priority = '最優先';
    if (this.task.progress == null) this.task.progress = 0;
    if (this.task.estimate == null) this.task.estimate = 0;
    if (this.task.actual == null) this.task.actual = 0;
    if (!this.task.description) this.task.description = '';
    if (!this.task.chat) this.task.chat = '';
    if (!this.task.history) this.task.history = [];
  
    if (this.task.dueDate !== undefined && this.task.dueDate !== null && typeof this.task.dueDate === 'string') {
      this.task.dueDate = new Date(this.task.dueDate);
    }

    this.firestoreService.getSections(this.projectId).subscribe(sections => {
      this.sections = sections;
    });

    this.firestoreService.getDocument<any>(`projects/${this.projectId}`).then(project => {
      if (project?.memberIds) {
        this.firestoreService.getUsersByIds(project.memberIds).then(users => {
          this.members = users.map(user => ({ uid: user.uid, displayName: user.displayName }));
        });
      }
    });
  }  

  

  async saveTask(): Promise<void> {
    if (!this.projectId || !this.task?.id) {
      console.warn('[Taskdetail] Cannot save - Missing projectId or task.id');
      return;
    }
  
    const ref = doc(this.firestore, `projects/${this.projectId}/tasks/${this.task.id}`);
  
    const updatedTask: any = {
      title: this.task.title ?? '',
      assignee: this.task.assignee ?? '',
      dueDate: this.task.dueDate ?? null,
      status: this.task.status ?? '',
      section: this.task.section ?? '',
      order: this.task.order ?? null,
      priority: this.task.priority ?? '',
      progress: this.task.progress ?? 0,
      estimate: this.task.estimate ?? null,
      actual: this.task.actual ?? null,
      description: this.task.description ?? '',
      chat: this.task.chat ?? '',
      history: Array.isArray(this.task.history) ? this.task.history : [],
    };
  
    if (updatedTask.status === '完了') {
      updatedTask.section = '完了済';
  
      // this.snackBar.open('✔ 完了したタスクを完了済セクションに移動しました', '', {
      //   duration: 5000,
      //   horizontalPosition: 'end',
      //   verticalPosition: 'bottom',
      //   panelClass: ['complete-snackbar']
      // });
    }
  
    try {
      await setDoc(ref, updatedTask);
      console.log('[Taskdetail] Task updated via setDoc:', updatedTask);
      this.closed.emit();
    } catch (error) {
      console.error('[Taskdetail] Task update failed:', error);
      this.snackBar.open('タスクの更新に失敗しました', '', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      });
    }
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
    this.closed.emit();
  }

  
}
