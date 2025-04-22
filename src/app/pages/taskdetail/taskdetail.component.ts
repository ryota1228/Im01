import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Firestore, doc, getDoc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Task } from '../../models/task.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DeleteConfirmDialogComponent } from '../../components/delete-confirm-dialog/delete-confirm-dialog.component';

@Component({
  selector: 'app-taskdetail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './taskdetail.component.html',
  styleUrls: ['./taskdetail.component.css'],
})
export class TaskdetailComponent implements OnInit {
  @Input() task: Task | null = null;
  @Input() projectId: string | null = null;
  @Output() closed = new EventEmitter<void>();

  taskId: string | null = null;
  dueDateString: string = '';

  constructor(
    private route: ActivatedRoute,
    private firestore: Firestore,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (this.task) {
      const date = this.task.dueDate instanceof Date
        ? this.task.dueDate
        : this.task.dueDate?.toDate?.() ?? null;
      this.dueDateString = date ? date.toISOString().split('T')[0] : '';
      return;
    }
  
    this.route.paramMap.subscribe(async params => {
      this.projectId = params.get('projectId');
      this.taskId = params.get('taskId');
      if (this.projectId && this.taskId) {
        const ref = doc(this.firestore, `projects/${this.projectId}/tasks/${this.taskId}`);
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
          this.task = snapshot.data() as Task;
          const date = this.task.dueDate?.toDate?.();
          this.dueDateString = date ? date.toISOString().split('T')[0] : '';
        } else {
          console.warn('タスクが存在しないか、読み込めませんでした');
        }
      }
    });
  }

  async saveTask(): Promise<void> {
    if (!this.projectId || !this.taskId || !this.task) return;

    this.task.dueDate = this.dueDateString ? new Date(this.dueDateString) : null;

    const ref = doc(this.firestore, `projects/${this.projectId}/tasks/${this.taskId}`);
    const updatedTask = {
      title: this.task.title,
      assignee: this.task.assignee,
      dueDate: this.task.dueDate,
      status: this.task.status,
      section: this.task.section,
    };

    await updateDoc(ref, updatedTask);
    console.log('[DEBUG] Task updated!');
  }

  goBackToProject(): void {
    if (this.projectId) {
      this.router.navigate(['/project', this.projectId]);
    }
  }

  async deleteTask(): Promise<void> {
    if (!this.projectId || !this.taskId) return;

    const dialogRef = this.dialog.open(DeleteConfirmDialogComponent);
    const confirmed = await dialogRef.afterClosed().toPromise();

    if (!confirmed) return;

    const ref = doc(this.firestore, `projects/${this.projectId}/tasks/${this.taskId}`);
    await deleteDoc(ref);
    console.log('[DEBUG] Task deleted!');

    this.router.navigate(['/project', this.projectId]);
  }
}