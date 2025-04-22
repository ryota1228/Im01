import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { LogoutDialogComponent } from '../logout-dialog/logout-dialog.component';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { Task } from '../../models/task.model';
import { Section } from '../../models/section.model';
import { FirestoreService } from '../../services/firestore.service';
import {
  CdkDragDrop,
  moveItemInArray,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-filter-dialog',
  standalone: true,
  imports: [],
  templateUrl: './filter-dialog.component.html',
  styleUrl: './filter-dialog.component.css'
})
export class FilterDialogComponent implements OnInit {
openTaskPanel(_t20: any) {
throw new Error('Method not implemented.');
}
  projectId: string | null = null;

  currentView: 'list' | 'calendar' = 'list';
  searchKeyword: string = '';
  selectedStatus: string = 'すべて';
  selectedSection: string = 'すべて';
  hideCompleted: boolean = false;
  availableSections: string[] = [];
  selectedSort: string = '期限昇順';

  constructor(
    private dialogRef: MatDialogRef<LogoutDialogComponent>,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
    private firestore: Firestore,
    private dialog: MatDialog
  )
  {

  }
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onConfirm(): Promise<void> {
    await this.authService.logout();
    this.dialogRef.close();
    this.router.navigate(['/login']);
    console.log('ログアウトしました');
  }

  sortTasks(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => {
      if (this.selectedSort === '期限昇順') {
        return a.dueDate?.getTime() - b.dueDate?.getTime() || 0;
      } else {
        return b.dueDate?.getTime() - a.dueDate?.getTime() || 0;
      }
    });
  }

}