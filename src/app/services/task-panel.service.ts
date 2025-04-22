import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Task } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskPanelService {
  task$ = new BehaviorSubject<Task | null>(null);
  projectId$ = new BehaviorSubject<string | null>(null);
  isOpen$ = new BehaviorSubject<boolean>(false);

  open(task: Task, projectId: string) {
    this.task$.next(task);
    this.projectId$.next(projectId);
    this.isOpen$.next(true);
  }

  close() {
    this.isOpen$.next(false);
    this.task$.next(null);
    this.projectId$.next(null);
  }
}
