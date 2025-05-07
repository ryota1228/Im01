import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { Task } from '../../models/task.model';
import { Section } from '../../models/section.model';
import { FirestoreService } from '../../services/firestore.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule} from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FilterDialogComponent } from '../../components/filter-dialog/filter-dialog.component';
import { TaskPanelService } from '../../services/task-panel.service';
import { SortDialogComponent } from '../../components/sort-dialog/sort-dialog.component';
import { AddSectionDialogComponent } from '../../components/add-section-dialog/add-section-dialog.component';
import { DeleteSectionDialogComponent } from '../../components/delete-section-dialog/delete-section-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Timestamp } from '@angular/fire/firestore';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AppComponent } from '../../app.component';
import { AuthService } from '../../services/auth.service';
import { CopyTasksDialogComponent } from '../../components/copy-tasks-dialog/copy-tasks-dialog.component';
import { InviteMemberDialogComponent } from '../../components/invite-member-dialog/invite-member-dialog.component';
import { UserRole } from '../../models/user-role.model';
import { CalendarViewComponent } from '../../components/calendar-view/calendar-view.component';
import { ViewChild } from '@angular/core';
import { subMonths, addMonths } from 'date-fns';
import { Router, ActivatedRoute } from '@angular/router';
import { ConfirmCompleteDialogComponent } from '../../components/confirm-complete-dialog/confirm-complete-dialog.component';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, MatDialogModule, MatButtonModule, MatSnackBarModule, MatCheckboxModule, MatSlideToggleModule, CalendarViewComponent],
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ProjectComponent implements OnInit {
  projectId: string | null = null;
  projectTitle: string = 'プロジェクト名';

  currentView: 'list' | 'calendar' = 'list';
  searchKeyword: string = '';
  hideCompleted: boolean = false;
  availableSections: string[] = [];
  selectedSort: string = 'ユーザー設定順';
  selectedStatuses: string[] = ['すべて'];
  selectedSections: string[] = ['すべて'];

  addingSection: string | null = null;
  newTask: Partial<Task> = { title: '', assignee: '', dueDate: undefined };
  collapsedSections = new Set<string>();
  draggedSection: Section | null = null;
  editingSectionId: string | null = null;
  editingSectionTitle: string = '';

  
  sectionsWithTasks: { section: Section; tasks: Task[] }[] = [];
  sectionOrder: Section[] = [];

  addingNewSection: boolean = false;
  newSectionTitle: string = '';

  userRole: 'owner' | 'editor' | 'viewer' = 'viewer';

  readonly COMPLETED_SECTION_TITLE = '完了済';

  members: { uid: string, displayName: string }[] = [];

  sections: Section[] = [];
  tasks: Task[] = []; 

  today: Date = new Date();

  autoMoveCompletedTasks: boolean = true;
  currentUserId: string | null = null;

  selectedAssignees: string[] = [];
  selectedPriorities: string[] = [];

  taskSaveError: string | null = null;

  currentDate = new Date();

  monthlyEstimateTotal: number = 0;
  monthlyActualTotal: number = 0;
  estimateUntilNow: number = 0;
  actualUntilNow: number = 0;
  estimateIncompleteTotal: number = 0;
  currentMonthLabel: string = '';

  showTooltip = false;
  tooltipTimeout: any;

  isTaskPanelOpen: boolean = false;

  estimateLessThanActualOnly: boolean = false;
  overdueOnly: boolean = false;

  monthlyCompletionRate: number = 0;
  totalCompletionRate: number = 0;
  actualIncompleteTotal: number = 0;
  showCalendar = true;


  @ViewChild(CalendarViewComponent) calendarComp?: CalendarViewComponent;
  


onTaskPanelClosed(updated: boolean): void {
  this.isTaskPanelOpen = false;
  if (updated) {
    this.calendarComp?.generateCalendar();
  }
}


  onMonthlyCompletionRateChange(rate: number): void {
    this.monthlyCompletionRate = rate;
  }

  toggleTooltip(): void {
    this.showTooltip = !this.showTooltip;
  }
  
  hideTooltipLater(): void {
    this.tooltipTimeout = setTimeout(() => {
      this.showTooltip = false;
    }, 200);
  }

  generateCalendar(): void {

  }

  constructor(
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
    private firestore: Firestore,
    private dialog: MatDialog,
    private taskPanelService: TaskPanelService,
    private snackBar: MatSnackBar,
    private appComponent: AppComponent,
    private authService: AuthService,
    private router: Router,
  ) {}

  @ViewChild(CalendarViewComponent) calendarComponentRef!: CalendarViewComponent;

  async ngOnInit(): Promise<void> {
    // クエリパラメータからビュー（list/calendar）を取得
    this.route.queryParamMap.subscribe(params => {
      const view = params.get('view');
      this.currentView = view === 'calendar' ? 'calendar' : 'list';
    });
  
    // パスパラメータから projectId を取得し、ユーザー情報とデータをロード
    this.route.paramMap.subscribe(async params => {
      const id = params.get('id') ?? '';
      if (id) {
        this.projectId = id;
      }
  
      const user = await this.authService.getCurrentUser();
      if (user) {
        this.currentUserId = user.uid;
        await this.loadUserSettings();
  
        // 🔽 権限（role）を取得
        const role = await this.firestoreService.getUserRoleInProject(this.projectId!, this.currentUserId);
        this.userRole = role ?? 'viewer'; // 取得できなければ viewer 扱い
      }
  
      await this.loadProjectData();
      this.loadProjectTitle(this.projectId!);
      this.loadSectionsAndTasks(this.projectId!);
      this.emitCurrentMonthLabel();
    });
  }
  

  openMemberDialog(): void {
    const dialogRef = this.dialog.open(InviteMemberDialogComponent, {
      data: { projectId: this.projectId }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'updated') {
      }
    });
  }

  async loadUserSettings(): Promise<void> {
    if (!this.projectId || !this.currentUserId) return;
  
    const setting = await this.firestoreService.getUserSettings(this.projectId, this.currentUserId);
  
    if (setting && typeof setting.autoMoveCompletedTasks === 'boolean') {
      this.autoMoveCompletedTasks = setting.autoMoveCompletedTasks;
    } else {
      await this.firestoreService.saveUserSettings(this.projectId, this.currentUserId, {
        autoMoveCompletedTasks: true,
      });
      this.autoMoveCompletedTasks = true;
    }
  }  

  async loadProjectTitle(projectId: string) {
    const ref = doc(this.firestore, `projects/${projectId}`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as { title: string };
      this.projectTitle = data.title || 'プロジェクト名';
    }
  }

  updateProjectTitle(): void {
    if (!this.projectId) return;
    const ref = doc(this.firestore, `projects/${this.projectId}`);
    updateDoc(ref, { title: this.projectTitle });
  }

  async updateTaskStatus(task: Task, newStatus: string): Promise<void> {
    if (!this.projectId || !task.id) return;

    const updates: any = { status: newStatus };

    if (newStatus === '完了' && this.autoMoveCompletedTasks === true) {
      updates.section = '完了済';
    
      this.snackBar.open('✔ タスクを完了済セクションに移動しました', '', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['complete-snackbar']
      });
    }

    await this.firestoreService.updateDocument(
      `projects/${this.projectId}/tasks/${task.id}`, updates
    );

    this.loadSectionsAndTasks(this.projectId);
  }

  loadSectionsAndTasks(projectId: string): void {
    this.firestoreService.getSections(projectId).subscribe(sections => {
      this.sectionOrder = sections.sort((a, b) => a.order - b.order);
      this.availableSections = ['すべて', ...sections.map(s => s.title)];
  
      this.firestoreService.getTasksByProjectId(projectId).subscribe(tasks => {
        tasks.forEach(task => {
          if (task.dueDate && (task.dueDate as any).toDate) {
            task.dueDate = (task.dueDate as Timestamp).toDate();
          }
        });

        this.calculateCalendarSummary(tasks, this.currentDate);
  
        let filteredTasks = [...tasks];
  
        if (this.selectedStatuses.length > 0 && !this.selectedStatuses.includes('すべて')) {
          filteredTasks = filteredTasks.filter(t => this.selectedStatuses.includes(t.status));
        }
  
        if (this.selectedAssignees?.length > 0) {
          filteredTasks = filteredTasks.filter(t =>
            this.selectedAssignees.includes(this.getAssigneeName(t.assignee))
          );
        }
  
        if (this.selectedPriorities?.length > 0) {
          filteredTasks = filteredTasks.filter(t =>
            this.selectedPriorities.includes(t.priority ?? '')
          );
        }

        if (this.estimateLessThanActualOnly) {
          filteredTasks = filteredTasks.filter(t =>
            t.estimate != null && t.actual != null && t.estimate < t.actual
          );
        }

        if (this.overdueOnly) {
          const now = new Date().setHours(0, 0, 0, 0);
          filteredTasks = filteredTasks.filter(t =>
            t.dueDate && new Date(t.dueDate).getTime() < now && t.status !== '完了'
          );
        }
        
        const grouped: { [key: string]: Task[] } = {};
        for (const task of filteredTasks) {
          const section = task.section || '未分類';
          if (!grouped[section]) grouped[section] = [];
          grouped[section].push(task);
        }
  
        this.sectionsWithTasks = this.sectionOrder.map(sec => {
          const isCompleted = sec.isFixed === true;
          if (isCompleted) this.collapsedSections.add(sec.title);
  
          let tasks = grouped[sec.title] || [];
  
          switch (sec.selectedSort) {
            case 'dueDate':
              tasks = tasks.sort((a, b) =>
                new Date(a.dueDate ?? '').getTime() - new Date(b.dueDate ?? '').getTime()
              );
              break;
            case 'priority':
              const priorityMap: { [key: string]: number } = { '最優先': 1, '高': 2, '中': 3, '低': 4 };
              tasks = tasks.sort((a, b) =>
                (priorityMap[a.priority ?? ''] ?? 99) - (priorityMap[b.priority ?? ''] ?? 99)
              );
              break;
            case 'default':
            default:
              tasks = tasks.sort((a, b) => {
                if (isCompleted) {
                  return (a.completionOrder || 0) - (b.completionOrder || 0);
                }
                if (a.order != null && b.order != null) return a.order - b.order;
                if (a.order != null) return -1;
                if (b.order != null) return 1;
                return 0;
              });
              break;
          }
  
          return { section: sec, tasks };
        });
      });
    });
  }
    

  addSectionDialogOpen(): void {
    const dialogRef = this.dialog.open(AddSectionDialogComponent, {
      data: {}
    });
  
    dialogRef.afterClosed().subscribe(async (title: string | null) => {
      if (!title || !this.projectId) return;
  
      const updatePromises = this.sectionOrder.map((sec, index) => {
        const ref = doc(this.firestore, `projects/${this.projectId}/sections/${sec.id}`);
        return updateDoc(ref, { order: index + 1 });
      });
      await Promise.all(updatePromises);
  
      await this.firestoreService.addSection(this.projectId, {
        title,
        order: 0,
      });
  
      this.loadSectionsAndTasks(this.projectId!);
    });
  }
  
  deleteSectionDialogOpen(section: Section): void {
    const dialogRef = this.dialog.open(DeleteSectionDialogComponent, {
      data: {
        sectionId: section.id,
        sectionTitle: section.title,
        sections: this.sectionOrder.filter(s => s.id !== section.id),
        tasks: this.sectionsWithTasks.flatMap(entry => entry.tasks)
      }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (!result || !this.projectId) return;
  
      if (result.action === 'delete') {
        this.firestoreService.deleteSectionWithTasks(this.projectId, section.id, section.title);
      } else if (result.action === 'move' && result.targetSectionId) {
        const targetTitle = this.sectionOrder.find(s => s.id === result.targetSectionId)?.title;
        if (targetTitle) {
          this.firestoreService.moveTasksToSection(this.projectId, section.title, targetTitle)
            .then(() => this.firestoreService.deleteSection(this.projectId!, section.id, targetTitle));
        }
      }
  
      this.loadSectionsAndTasks(this.projectId!);
    });
  }  

  async onToggleAutoMoveCompletedTasks(): Promise<void> {
    if (!this.projectId || !this.currentUserId) return;
    await this.firestoreService.saveUserSettings(this.projectId, this.currentUserId, {
      autoMoveCompletedTasks: this.autoMoveCompletedTasks,
    });
  }  

  toggleSection(title: string): void {
    if (this.collapsedSections.has(title)) {
      this.collapsedSections.delete(title);
    } else {
      this.collapsedSections.add(title);
    }
  }

  enableSectionEdit(section: Section): void {
    this.editingSectionId = section.id;
    this.editingSectionTitle = section.title;
  }

  cancelEditSection(): void {
    this.editingSectionId = null;
    this.editingSectionTitle = '';
  }

  async saveEditedSectionTitle(section: Section, newTitle: string): Promise<void> {
    const newTitleTrimmed = newTitle.trim();
    if (!this.projectId || !newTitleTrimmed) return;

    const oldTitle = section.title;
    const ref = doc(this.firestore, `projects/${this.projectId}/sections/${section.id}`);
    await updateDoc(ref, { title: newTitleTrimmed });

    const tasksSnapshot = await this.firestoreService.getTasksByProjectIdOnce(this.projectId);
    const updates = tasksSnapshot!
      .filter(t => t.section === oldTitle)
      .map(t => this.firestoreService.updateDocument(`projects/${this.projectId}/tasks/${t.id}`, { section: newTitleTrimmed }));

    await Promise.all(updates);
    this.cancelEditSection();
    this.loadSectionsAndTasks(this.projectId);
  }

  onSectionDrop(event: CdkDragDrop<{ section: Section; tasks: Task[] }[]>): void {
    moveItemInArray(this.sectionsWithTasks, event.previousIndex, event.currentIndex);
    this.sectionOrder = this.sectionsWithTasks.map(entry => entry.section);
    if (!this.projectId) return;
    const updates = this.sectionOrder.map((sec, index) => {
      const ref = doc(this.firestore, `projects/${this.projectId}/sections/${sec.id}`);
      return updateDoc(ref, { order: index });
    });
    Promise.all(updates).then(() => this.loadSectionsAndTasks(this.projectId!));
  }

  onTaskDrop(event: CdkDragDrop<Task[]>, sectionTitle: string): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }
  
    const movedTasks = event.container.data;
  
    movedTasks.forEach((task, index) => {
      const updates: Partial<Task> = {
        order: index,
        section: sectionTitle,
      };
      this.firestoreService.updateDocument(`projects/${this.projectId}/tasks/${task.id}`, updates)
        .then(() => console.log(`[DEBUG] タスク ${task.title} の order=${index} 更新完了`));
    });

    this.loadSectionsAndTasks(this.projectId!);
  }

  isSectionCollapsed(title: string): boolean {
    return this.collapsedSections.has(title);
  }

  startAddTask(sectionTitle: string): void {
    this.addingSection = sectionTitle;
    this.newTask = { title: '', assignee: '', dueDate: undefined };
  }

  async saveTask(): Promise<void> {

    if (!this.newTask.title?.trim()) {
        this.snackBar.open('タスクタイトルを入力してください', '', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom',
          panelClass: ['task-error-snackbar']
      });
      return;
    }

    this.taskSaveError = '';
  
    if (!this.newTask.title || !this.projectId || !this.addingSection) return;
  
    const sectionTitle = this.addingSection;
  
    const allTasks = await this.firestoreService.getTasksByProjectIdOnce(this.projectId);
    const targetTasks = allTasks.filter(t => t.section === sectionTitle && t.order != null);
  

    const bumpPromises = targetTasks.map(t => {
      return this.firestoreService.updateDocument(`projects/${this.projectId}/tasks/${t.id}`, {
        order: (t.order ?? 0) + 1,
      });
    });
  
    await Promise.all(bumpPromises);
  
    const dueDate = typeof this.newTask.dueDate === 'string'
      ? new Date(this.newTask.dueDate)
      : this.newTask.dueDate || null;
  
    const task: Task = {
      id: '',
      title: this.newTask.title!,
      assignee: this.newTask.assignee || '',
      dueDate: dueDate,
      status: '未着手',
      section: sectionTitle,
      order: 0,
    };
  
    await this.firestoreService.addTask(this.projectId, task);
  
    this.cancelAddTask();
    this.loadSectionsAndTasks(this.projectId!);
  }  

  cancelAddTask(): void {
    this.addingSection = null;
    this.newTask = { title: '', assignee: '', dueDate: undefined };
  }

  openTaskPanel(task: Task): void {
    if (!this.projectId) return;
    this.taskPanelService.openPanel(task, this.projectId);
    this.appComponent.openTaskPanel(task, this.projectId, this.autoMoveCompletedTasks);
  }

  filterDialogOpen(): void {
    const dialogRef = this.dialog.open(FilterDialogComponent, {
      data: {
        projectId: this.projectId!,
        currentStatuses: this.selectedStatuses.includes('すべて') ? [] : this.selectedStatuses,
        currentAssignees: this.selectedAssignees,
        currentPriorities: this.selectedPriorities,
        estimateLessThanActualOnly: this.estimateLessThanActualOnly,
        overdueOnly: this.overdueOnly
      }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.selectedStatuses = result.selectedStatuses?.length > 0 ? result.selectedStatuses : ['すべて'];
        this.selectedAssignees = result.selectedAssignees || [];
        this.selectedPriorities = result.selectedPriorities || [];
        this.estimateLessThanActualOnly = result.estimateLessThanActualOnly || false;
        this.overdueOnly = result.overdueOnly || false;
        this.loadSectionsAndTasks(this.projectId!);
      }
    });
  }
  

  sortDialogOpen(): void {
    const dialogRef = this.dialog.open(SortDialogComponent, {
      data: {
        sections: this.sectionOrder.map(s => ({
          id: s.id,
          title: s.title,
          selectedSort: s.selectedSort ?? 'default'
        }))
      }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.applySortOptions(result);
      }
    });
  }

applySortOptions(updatedOptions: { id: string, selectedSort: string }[]): void {
  for (const option of updatedOptions) {
    const sectionEntry = this.sectionsWithTasks.find(s => s.section.id === option.id);
    if (!sectionEntry || !this.projectId) continue;

    sectionEntry.section.selectedSort = option.selectedSort as 'default' | 'dueDate' | 'priority';

    // Firestoreに保存
    const sectionRef = doc(this.firestore, `projects/${this.projectId}/sections/${option.id}`);
    updateDoc(sectionRef, { selectedSort: option.selectedSort });

    // ソートを適用
    switch (option.selectedSort) {
      case 'dueDate':
        sectionEntry.tasks.sort((a, b) =>
          new Date(a.dueDate ?? '').getTime() - new Date(b.dueDate ?? '').getTime()
        );
        break;
      case 'priority':
        const priorityMap: { [key: string]: number } = { '最優先': 1, '高': 2, '中': 3, '低': 4 };
        sectionEntry.tasks.sort((a, b) =>
          (priorityMap[a.priority ?? ''] ?? 99) - (priorityMap[b.priority ?? ''] ?? 99)
        );
        break;
      case 'default':
      default:
        sectionEntry.tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        break;
    }
  }
}


  get connectedDropListIds(): string[] {
    return this.sectionsWithTasks.map(s => 'dropList-' + s.section.id);
  }

reOrderTasksByDueDate(): void{
  if (!this.projectId) return;

  this.firestoreService.getTasksByProjectId(this.projectId).subscribe(tasks => {
    const updates = tasks
    .filter(t => t.order == null)
    .map(t => this.firestoreService.updateDocument(`projects/${this.projectId}/tasks/${t.id}`, {
      order: null
    }));

    Promise.all(updates).then(() => this.loadSectionsAndTasks(this.projectId!));
  });
}

async loadProjectData() {
  if (!this.projectId) return;


  this.firestoreService.getSections(this.projectId).subscribe(sections => {
    this.sections = sections;
  });

  this.firestoreService.getTasksByProjectId(this.projectId).subscribe(tasks => {
    this.tasks = tasks;
  });

  const project = await this.firestoreService.getDocument<any>(`projects/${this.projectId}`);
  if (project?.memberIds) {
    const users = await this.firestoreService.getUsersByIds(project.memberIds);
    this.members = users.map(user => ({ uid: user.uid, displayName: user.displayName }));
  }
}

isOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  const now = new Date();
  const due = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
  return task.status !== '完了' && due < now;
}

formatDueDate(dueDate: any): string {
  if(!dueDate) return '期限未設定';
  const date = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (isNaN(date.getTime())) return '期限未設定';
  return date.toISOString().split('T')[0];
}

  getAssigneeName(uid: string): string {
    if (!uid) return '未設定';
    const member = this.members.find(m => m.uid === uid);
    return member ? member.displayName : '未登録ユーザー';
  }

  calculateEstimateSum(tasks: Task[]): number {
    return tasks.reduce((sum, task) => sum + (task.estimate || 0), 0);
  }
  
  calculateActualSum(tasks: Task[]): number {
    return tasks.reduce((sum, task) => sum + (task.actual || 0), 0);
  }  

  copyTasksDialogOpen(section: Section): void {
    const otherSections = this.sectionOrder.filter(s => s.id !== section.id);
    const dialogRef = this.dialog.open(CopyTasksDialogComponent, {
      panelClass: 'copy-tasks-dialog-panel',
      data: { sections: otherSections }
    });
  
    dialogRef.afterClosed().subscribe(async (targetSectionId: string | undefined) => {
      if (!targetSectionId || !this.projectId) return;
  
      const tasksToCopy = this.sectionsWithTasks.find(e => e.section.id === section.id)?.tasks || [];
  
      const targetSection = this.sectionOrder.find(s => s.id === targetSectionId);
      if (!targetSection) return;
  
      for (const task of tasksToCopy) {
        const newTask = {
          ...task,
          id: '',
          title: task.title + '（複製）',
          section: targetSection.title,
          order: null
        };
        await this.firestoreService.addTask(this.projectId, newTask);
      }
  
      this.loadSectionsAndTasks(this.projectId);
    });
  }

  get isViewer(): boolean {
    return this.userRole === 'viewer';
  }
  
  get isEditor(): boolean {
    return this.userRole === 'editor';
  }
  
  get isOwner(): boolean {
    return this.userRole === 'owner';
  }

  goToPreviousMonth() {
    this.currentDate = subMonths(this.currentDate, 1);
    this.calendarComp?.generateCalendar();
    this.refreshCalendarComponent();
  }
  
  goToNextMonth() {
    this.currentDate = addMonths(this.currentDate, 1);
    this.calendarComp?.generateCalendar();
    this.refreshCalendarComponent();
  }
  
  goToToday() {
    this.currentDate = new Date();
    this.calendarComp?.generateCalendar();
    this.refreshCalendarComponent();
  }
  
  refreshCalendarComponent() {
    this.showCalendar = false;
    setTimeout(() => this.showCalendar = true, 0);
  }
  

  loadCalendarSummary(): void {
    if (!this.projectId) return;
  
    this.firestoreService.getTasksByProjectId(this.projectId).subscribe(tasks => {
      tasks.forEach(task => {
        if (task.dueDate && (task.dueDate as any).toDate) {
          task.dueDate = (task.dueDate as Timestamp).toDate();
        }
      });
  
      this.calculateCalendarSummary(tasks, this.currentDate);
    });
  }  

  emitCurrentMonthLabel(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;
    this.currentMonthLabel = `${year}年${month}月`;
  }
  

  onMonthlyEstimateTotalChange(value: number): void {
    this.monthlyEstimateTotal = value;
  }
  
  onMonthlyActualTotalChange(value: number): void {
    this.monthlyActualTotal = value;
  }
  
  onEstimateUntilNowChange(value: number): void {
    this.estimateUntilNow = value;
  }
  
  onActualUntilNowChange(value: number): void {
    this.actualUntilNow = value;
  }
  
  onEstimateIncompleteTotalChange(value: number): void {
    this.estimateIncompleteTotal = value;
  }
  
  onCurrentMonthLabelChange(label: string): void {
    this.currentMonthLabel = label;
  }

  calculateCalendarSummary(tasks: Task[], currentDate: Date): void {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
  
    const isSameMonth = (date?: Date) => {
      if (!date) return false;
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    };
  
    let estimateMonthly = 0;
    let actualMonthly = 0;
    let completedMonthly = 0;
    let totalMonthly = 0;
  
    let estimateAll = 0;
    let actualAll = 0;
    let completedAll = 0;
    let totalAll = 0;
  
    let estimateIncomplete = 0;
    let actualIncomplete = 0;
  
    for (const task of tasks) {
      const due = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
  
      // 全体
      estimateAll += task.estimate || 0;
      actualAll += task.actual || 0;
      totalAll += 1;
      if (task.status === '完了') completedAll += 1;
  
      // 月単位（今月）
      if (isSameMonth(due)) {
        estimateMonthly += task.estimate || 0;
        actualMonthly += task.actual || 0;
        totalMonthly += 1;
        if (task.status === '完了') completedMonthly += 1;
      }
  
      if (task.status !== '完了') {
        estimateIncomplete += task.estimate || 0;
        actualIncomplete += task.actual || 0;
      }
    }
  
    this.monthlyEstimateTotal = estimateMonthly;
    this.monthlyActualTotal = actualMonthly;
    this.monthlyCompletionRate = totalMonthly > 0 ? Math.round((completedMonthly / totalMonthly) * 100) : 0;
  
    this.estimateUntilNow = estimateAll;
    this.actualUntilNow = actualAll;
    this.totalCompletionRate = totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0;
  
    this.estimateIncompleteTotal = estimateIncomplete;
    this.actualIncompleteTotal = actualIncomplete;
  }

  switchView(view: 'list' | 'calendar'): void {
    this.currentView = view;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view },
      queryParamsHandling: 'merge'
    });
  }

  async completeProject() {
    const dialogRef = this.dialog.open(ConfirmCompleteDialogComponent);
    const result = await dialogRef.afterClosed().toPromise();
  
    if (result === true && this.projectId) {
      try {
        await this.firestoreService.markProjectAsCompleted(this.projectId);
        this.router.navigate(['']);
      } catch (error) {
        console.error('プロジェクト完了に失敗しました:', error);
      }
    }
  }
  
}
