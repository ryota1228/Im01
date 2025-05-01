import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Task, TaskHistoryEntry } from '../../models/task.model';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Section } from '../../models/section.model';
import { FirestoreService } from '../../services/firestore.service';
import { MatDialog } from '@angular/material/dialog';
import { CopyTasksDialogComponent } from '../copy-tasks-dialog/copy-tasks-dialog.component';
import { AuthService } from '../../services/auth.service';
import { ChangeDetectorRef } from '@angular/core';
import { SafeDatePipe } from '../../pipes/safe-date.pipe';

@Component({
  selector: 'app-taskdetail',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeDatePipe],
  templateUrl: './taskdetail.component.html',
  styleUrls: ['./taskdetail.component.css'],
})

export class TaskdetailComponent implements OnInit {
  @Input() task!: Task;
  @Input() projectId!: string;
  @Input() autoMoveCompletedTasks: boolean = true;
  @Output() closed = new EventEmitter<void>();

  sections: Section[] = [];
  members: { uid: string, displayName: string }[] = [];
  isHistoryOpen: boolean = false;
  originalTask: Task | null = null;
  currentUserName: string = '';
  changedByDisplayNames: { [uid: string]: string } = {};
  historyUserMap: Map<string, string> = new Map();
  entry = {
    field: '',
    before: '',
    after: '',
    changedBy: '',
    timestamp: new Date()
  };

  constructor(
    private firestore: Firestore,
    private snackBar: MatSnackBar,
    private firestoreService: FirestoreService,
    private dialog: MatDialog,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  get dueDateString(): string {
    if (!this.task?.dueDate) return '';
    return this.task.dueDate instanceof Date
      ? this.task.dueDate.toISOString().substring(0, 10)
      : new Date(this.task.dueDate).toISOString().substring(0, 10);
  }

  getDisplayName(uid: string): string {
    const user = this.members.find(m => m.uid === uid);
    return user?.displayName || uid;
  }  

  onDueDateChange(dateStr: string): void {
    this.task.dueDate = dateStr ? new Date(dateStr) : null;
  }

  async ngOnInit(): Promise<void> {
    const user = this.authService.getCurrentUser();
    this.currentUserName = user?.displayName ?? '';
    const currentUserUid = user?.uid ?? '';
  
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
  
    this.originalTask = JSON.parse(JSON.stringify(this.task));
  
    this.firestoreService.getSections(this.projectId).subscribe(sections => {
      this.sections = sections;
    });
  
    this.firestoreService.getDocument<any>(`projects/${this.projectId}`).then(project => {
      if (project?.memberIds) {
        this.firestoreService.getUsersByIds(project.memberIds).then(users => {
          this.members = users.map(user => ({ uid: user.uid, displayName: user.displayName }));
          this.historyUserMap = new Map(users.map(user => [user.uid, user.displayName]));

          for (const user of users) {
            this.historyUserMap.set(user.uid, user.displayName);
          }
  
          if (currentUserUid && !this.historyUserMap.has(currentUserUid)) {
            this.historyUserMap.set(currentUserUid, this.currentUserName);
          }
        });
      }
    });
  }  

  async saveTask(): Promise<void> {
    if (!this.projectId || !this.task?.id || !this.originalTask) return;

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

    const historyEntries = this.generateHistoryEntries(this.originalTask, updatedTask);
    updatedTask.history.push(...historyEntries);

    if (updatedTask.status === '完了' && this.autoMoveCompletedTasks === true) {
      updatedTask.section = '完了済';
      this.snackBar.open('✔ タスクを完了済セクションに移動しました', '', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['complete-snackbar']
      });
    }

    try {
      await setDoc(ref, updatedTask);
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

  private generateHistoryEntries(before: Task, after: Partial<Task>): TaskHistoryEntry[] {
    const timestamp = new Date();
    const fieldsToTrack: (keyof Task)[] = [
      'title', 'assignee', 'dueDate', 'status',
      'section', 'priority', 'progress', 'estimate', 'actual'
    ];
    const history: TaskHistoryEntry[] = [];

    for (const key of fieldsToTrack) {
      const prev = before[key];
      const next = after[key];

      const isDateField = prev instanceof Date || next instanceof Date;

      const prevVal = isDateField
        ? this.formatDate(prev)
        : (prev ?? '').toString();

      const nextVal = isDateField
        ? this.formatDate(next)
        : (next ?? '').toString();

        if (prevVal === '' && nextVal === '') continue;
        if (prevVal !== nextVal) {
          history.push({
            field: key as string,
            before: prevVal,
            after: nextVal,
            changedBy: this.authService.getCurrentUser()?.uid || 'unknown',
            timestamp: new Date()
          });
        }
    }

    return history;
  }

  private formatDate(value: any): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? '' : date.toISOString().substring(0, 10).replace(/-/g, '/');
  }

  trackByFn(index: number, item: TaskHistoryEntry) {
    return item.timestamp?.toString?.() ?? index;
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

  async onClosePanel(): Promise<void> {
    await this.saveTask();
  }

  openDuplicateDialog(): void {
    const otherSections = this.sections.filter(s => s.title !== this.task.section);
    const dialogRef = this.dialog.open(CopyTasksDialogComponent, {
      panelClass: 'copy-tasks-dialog-panel',
      data: { sections: otherSections }
    });

    dialogRef.afterClosed().subscribe(async (targetSectionId: string | undefined) => {
      if (!targetSectionId || !this.projectId) return;

      const targetSection = this.sections.find(s => s.id === targetSectionId);
      if (!targetSection) return;

      const newTask = {
        ...this.task,
        id: '',
        title: this.task.title + '（複製）',
        section: targetSection.title,
        order: null,
      };
      await this.firestoreService.addTask(this.projectId, newTask);
    });
  }

  toggleHistory(): void {
    this.isHistoryOpen = !this.isHistoryOpen;
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  getFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      title: 'タイトル',
      assignee: '担当',
      dueDate: '期限',
      status: '状態',
      section: 'セクション',
      priority: '優先度',
      progress: '進捗率',
      estimate: '見積もり',
      actual: '実績'
    };
    return labels[field] || field;
  }

  formatHistoryValue(value: any, field: string): string {
    if (field === 'dueDate' && value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0].replace(/-/g, '/');
        }
      } catch {}
    }
    return value;
  }

  get reversedHistory() {
    return this.task?.history ? [...this.task.history].map(h => ({ ...h })).reverse() : [];
  }  
}