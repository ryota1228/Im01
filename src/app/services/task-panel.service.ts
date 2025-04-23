import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Task } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskPanelService {
  close: any;
  open(task: Task, projectId: string) {
    throw new Error('Method not implemented.');
  }
  private selectedTaskSubject = new BehaviorSubject<Task | null>(null);
  private projectIdSubject = new BehaviorSubject<string | null>(null);
  private isOpenSubject = new BehaviorSubject<boolean>(false);

  selectedTask$ = this.selectedTaskSubject.asObservable();
  projectId$ = this.projectIdSubject.asObservable();
  isOpen$ = this.isOpenSubject.asObservable();

  openPanel(task: Task, projectId: string) {
    this.selectedTaskSubject.next(task);
    this.projectIdSubject.next(projectId);
    this.isOpenSubject.next(true);
  }

  closePanel() {
    this.isOpenSubject.next(false);
    this.selectedTaskSubject.next(null);
    this.projectIdSubject.next(null);
  }
}
