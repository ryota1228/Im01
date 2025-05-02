import { Component, EventEmitter, Input, OnInit, Output, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';
import { FirestoreService } from '../../services/firestore.service';
import { Task } from '../../models/task.model';
import { subMonths, addMonths } from 'date-fns';
import { ChangeDetectorRef } from '@angular/core';


@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.css'],
})
export class CalendarViewComponent implements OnInit, AfterViewInit {
  @Input() projectId!: string | null;
  @Output() estimateTotalChange = new EventEmitter<number>();
  @Output() actualTotalChange = new EventEmitter<number>();
  @Output() estimateUntilNowChange = new EventEmitter<number>();
  @Output() actualUntilNowChange = new EventEmitter<number>();
  @Output() estimateIncompleteTotalChange = new EventEmitter<number>();
  @Output() monthlyEstimateTotalChange = new EventEmitter<number>();
  @Output() monthlyActualTotalChange = new EventEmitter<number>();
  @Output() currentMonthLabelChange = new EventEmitter<string>();

  
  currentDate = new Date();
  daysInMonth: Date[] = [];
  taskMap: { [date: string]: Task[] } = {};
  tasks: Task[] = [];

  constructor(private firestoreService: FirestoreService, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
  }  

  ngOnInit(): void {
    this.generateCalendar();
    this.emitCurrentMonthLabel();
  }

  private updateExtendedSums(): void {
    let estimateUntilNow = 0;
    let actualUntilNow = 0;
    let estimateIncompleteTotal = 0;
  
    for (const tasks of Object.values(this.taskMap)) {
      for (const task of tasks) {

        estimateUntilNow += task.estimate ?? 0;
        actualUntilNow += task.actual ?? 0;
  

        if (task.status !== '完了') {
          const estimate = task.estimate ?? 0;
          const progress = task.progress ?? 0;
          estimateIncompleteTotal += Math.round(estimate * (100 - progress) / 100);
        }
      }
    }
  
    this.estimateUntilNowChange.emit(estimateUntilNow);
    this.actualUntilNowChange.emit(actualUntilNow);
    this.estimateIncompleteTotalChange.emit(estimateIncompleteTotal);
  }
  

  private updateMonthlySums(): void {
    const targetMonth = this.currentDate.getMonth();
    const targetYear = this.currentDate.getFullYear();
    let monthlyEstimate = 0;
    let monthlyActual = 0;
  
    for (const tasks of Object.values(this.taskMap)) {
      for (const task of tasks) {
        if (!task.dueDate) continue;
  
        const due = task.dueDate instanceof Date
          ? task.dueDate
          : task.dueDate?.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
  
        if (due.getMonth() === targetMonth && due.getFullYear() === targetYear) {
          monthlyEstimate += task.estimate ?? 0;
          monthlyActual += task.actual ?? 0;
        }
      }
    }
  
    this.monthlyEstimateTotalChange.emit(monthlyEstimate);
    this.monthlyActualTotalChange.emit(monthlyActual);
  }
  

  private emitCurrentMonthLabel(): void {
    const label = `${this.currentDate.getFullYear()}年${this.currentDate.getMonth() + 1}月`;
    this.currentMonthLabelChange.emit(label);
  }

  async generateCalendar(): Promise<void> {
    if (!this.projectId) return;
  
    const start = startOfMonth(this.currentDate);
    const end = endOfMonth(this.currentDate);
    this.daysInMonth = eachDayOfInterval({ start, end });
  
    const allTasks = await this.firestoreService.getTasksByProjectIdOnce(this.projectId);
    this.tasks = allTasks;
  
    this.taskMap = {};
    allTasks.forEach(task => {
      if (!task.dueDate) return;
      const key = format(task.dueDate.toDate ? task.dueDate.toDate() : task.dueDate, 'yyyy-MM-dd');
      if (!this.taskMap[key]) this.taskMap[key] = [];
      this.taskMap[key].push(task);
    });
  
    this.updateMonthlySums();
    this.updateExtendedSums();
    this.emitCurrentMonthLabel();
  }  

  formatDate(date: Date): string {
    return format(date, 'd');
  }

  getTasksForDate(date: Date): Task[] {
    const key = format(date, 'yyyy-MM-dd');
    return this.taskMap[key] || [];
  }

  prevMonth() {
    this.currentDate = subMonths(this.currentDate, 1);
    this.generateCalendar();
  }
  
  nextMonth() {
    this.currentDate = addMonths(this.currentDate, 1);
    this.generateCalendar();
  }
  
  goToToday() {
    this.currentDate = new Date();
    this.generateCalendar();
  }  
}