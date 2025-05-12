import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Task } from '../models/task.model';
import { UserRole } from '../models/user-role.model';

@Injectable({ providedIn: 'root' })
export class TaskPanelService {
  close: any;

  open(projectId: string, taskId: string) {
    this.projectIdSubject.next(projectId);
    this.selectedTaskSubject.next({ id: taskId } as Task);
    this.isOpenSubject.next(true);
  }
  

  private selectedTaskSubject = new BehaviorSubject<Task | null>(null);
  private projectIdSubject = new BehaviorSubject<string | null>(null);
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  private userRoleSubject = new BehaviorSubject<UserRole>('viewer');
  userRole$ = this.userRoleSubject.asObservable();

  selectedTask$ = this.selectedTaskSubject.asObservable();
  projectId$ = this.projectIdSubject.asObservable();
  isOpen$ = this.isOpenSubject.asObservable();
  private allTasks: Task[] = [];

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

  setUserRole(role: UserRole) {
    this.userRoleSubject.next(role);
  }

  setAvailableTasks(tasks: Task[]) {
    this.allTasks = tasks;
  }
  
  getTaskById(id: string): Task | undefined {
    return this.allTasks.find(t => t.id === id);
  }
}
