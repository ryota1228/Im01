import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths } from 'date-fns';
import { Task } from '../../models/task.model';
import { FirestoreService } from '../../services/firestore.service';
import { TaskPanelService } from '../../services/task-panel.service';
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { OnChanges, SimpleChanges } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CalendarSyncService {
  private refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  refresh() {
    this.refreshSubject.next();
  }
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.css']
})
export class CalendarViewComponent implements OnInit, OnChanges {
  @Input() projectId!: string | null;
  @Input() currentDate!: Date;
  @Output() estimateTotalChange = new EventEmitter<number>();
  @Output() actualTotalChange = new EventEmitter<number>();
  @Output() estimateUntilNowChange = new EventEmitter<number>();
  @Output() actualUntilNowChange = new EventEmitter<number>();
  @Output() estimateIncompleteTotalChange = new EventEmitter<number>();
  @Output() monthlyEstimateTotalChange = new EventEmitter<number>();
  @Output() monthlyActualTotalChange = new EventEmitter<number>();
  @Output() currentMonthLabelChange = new EventEmitter<string>();
  @Output() monthlyCompletionRateChange = new EventEmitter<number>();

  daysInMonth: Date[] = [];
  taskMap: { [date: string]: Task[] } = {};
  tasks: Task[] = [];
  dropListIds: string[] = [];
  // monthlyCompletionRateChange = new EventEmitter<number>();

  constructor(
    private firestoreService: FirestoreService,
    private taskPanelService: TaskPanelService,
    private calendarSyncService: CalendarSyncService
  ) {}

  async ngOnInit() {
    await this.generateCalendar();
    this.calendarSyncService.refresh$.subscribe(() => {
      this.generateCalendar();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentDate'] && !changes['currentDate'].firstChange) {
      this.generateCalendar();
    }
  }

  async generateCalendar(): Promise<void> {
    const start = startOfMonth(this.currentDate);
    const end = endOfMonth(this.currentDate);
    this.daysInMonth = eachDayOfInterval({ start, end });

    const tasks = await this.firestoreService.getTasksByProjectIdOnce(this.projectId ?? '');
    this.taskMap = {};
    for (const task of tasks) {
      if (!task.dueDate) continue;

      if (typeof task.dueDate['toDate'] === 'function') {
        task.dueDate = task.dueDate.toDate();
      }

      const d = task.dueDate as Date;
      const key = format(d, 'yyyy-MM-dd');
      if (!this.taskMap[key]) this.taskMap[key] = [];
      this.taskMap[key].push(task);
    }

    this.updateSums();
    this.emitCurrentMonthLabel();
    this.dropListIds = this.daysInMonth.map(d => 'dropList-' + format(d, 'yyyy-MM-dd'));
  }

  openNewTask(day: Date): void {
    const title = `新規タスク（${format(day, 'M月d日')}）`;
    const dueDate = new Date(day);
    dueDate.setHours(9, 0, 0, 0);

    const task: Task = {
      id: '',
      title,
      assignee: '',
      section: '',
      status: '未着手',
      dueDate,
      order: null,
    };

    this.taskPanelService.openPanel(task, this.projectId ?? '');
  }

  updateSums(): void {
    let estimate = 0;
    let actual = 0;
    let completed = 0;
    let total = 0;
  
    for (const day of this.daysInMonth) {
      const key = format(day, 'yyyy-MM-dd');
      const tasks = this.taskMap[key] || [];
      for (const task of tasks) {
        estimate += task.estimate ?? 0;
        actual += task.actual ?? 0;
        total += 1;
        if (task.status === '完了') {
          completed += 1;
        }
      }
    }
  
    this.monthlyEstimateTotalChange.emit(estimate);
    this.monthlyActualTotalChange.emit(actual);
  
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    this.monthlyCompletionRateChange.emit(completionRate);
  }
  

  emitCurrentMonthLabel(): void {
    const label = `${this.currentDate.getFullYear()}年${this.currentDate.getMonth() + 1}月`;
    this.currentMonthLabelChange.emit(label);
  }

  getTasksForDate(date: Date): Task[] {
    const key = format(date, 'yyyy-MM-dd');
    return this.taskMap[key] || [];
  }

  getEstimateSumForDate(date: Date): number {
    return this.getTasksForDate(date).reduce((sum, task) => sum + (task.estimate ?? 0), 0);
  }

  getActualSumForDate(date: Date): number {
    return this.getTasksForDate(date).reduce((sum, task) => sum + (task.actual ?? 0), 0);
  }

  openTaskPanel(task: Task): void {
    this.taskPanelService.openPanel(task, this.projectId ?? '');
  }

  async onTaskDrop(event: CdkDragDrop<Task[]>, date: Date): Promise<void> {
    if (!event.item.data || !this.projectId) return;

    const task: Task = event.item.data;
    const newDueDate = new Date(date);
    newDueDate.setHours(9, 0, 0, 0);

    await this.firestoreService.updateDocument(`projects/${this.projectId}/tasks/${task.id}`, {
      dueDate: newDueDate
    });

    await this.generateCalendar();
  }

  goToPreviousMonth(): void {
    this.currentDate = subMonths(this.currentDate, 1);
    this.generateCalendar();
  }

  goToNextMonth(): void {
    this.currentDate = addMonths(this.currentDate, 1);
    this.generateCalendar();
  }

  goToToday(): void {
    this.currentDate = new Date();
    this.generateCalendar();
  }
}