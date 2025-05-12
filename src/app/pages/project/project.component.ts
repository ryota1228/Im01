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
import { CalendarViewComponent } from '../../components/calendar-view/calendar-view.component';
import { ViewChild } from '@angular/core';
import { subMonths, addMonths } from 'date-fns';
import { Router, ActivatedRoute } from '@angular/router';
import { ConfirmCompleteDialogComponent } from '../../components/confirm-complete-dialog/confirm-complete-dialog.component';
import { GoalCard, MilestoneCard } from '../../models/goal.model';
import { collection, addDoc, deleteDoc } from '@angular/fire/firestore';
import { ChangeDetectorRef } from '@angular/core';
import { combineLatest, firstValueFrom, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { setDoc } from '@angular/fire/firestore';
import { MatIconModule } from '@angular/material/icon';


interface SectionEntry {
  section: Section;
  tasks: Task[];
  goal?: GoalCard;
  milestones?: MilestoneCard[];
}

const PRIORITY_MAP: { [key: string]: number } = {
  '最優先': 1,
  '高': 2,
  '中': 3,
  '低': 4
};

function sortTasksByPriority(tasks: Task[]): Task[] {
  return tasks.sort((a, b) => (PRIORITY_MAP[a.priority ?? ''] ?? 99) - (PRIORITY_MAP[b.priority ?? ''] ?? 99));
}

function sortTasksByDueDate(tasks: Task[]): Task[] {
  return tasks.sort((a, b) => new Date(a.dueDate ?? '').getTime() - new Date(b.dueDate ?? '').getTime());
}

function sortTasksByOrder(tasks: Task[]): Task[] {
  return tasks.sort((a, b) => {
    if (a.order != null && b.order != null) return a.order - b.order;
    if (a.order != null) return -1;
    if (b.order != null) return 1;
    return 0;
  });
}

function toDateSafe(d: any): Date {
  if (!d) return new Date(NaN);
  if (d instanceof Date) return d;
  if (typeof d.toDate === 'function') return d.toDate();
  return new Date(d);
}

function showSnackBar(snackBar: MatSnackBar, message: string, options: {
  duration?: number,
  panelClass?: string[]
} = {}): void {
  snackBar.open(message, '', {
    duration: options.duration ?? 3000,
    horizontalPosition: 'end',
    verticalPosition: 'bottom',
    panelClass: options.panelClass ?? []
  });
}

function sortSections(sections: Section[]): Section[] {
  return [...sections].sort((a, b) => a.order - b.order);
}

function getAvailableSectionTitles(sections: Section[]): string[] {
  return ['すべて', ...sections.map(s => s.title)];
}

function filterTasks(
  tasks: Task[],
  selectedStatuses: string[],
  selectedAssignees: string[],
  selectedPriorities: string[],
  estimateLessThanActualOnly: boolean,
  overdueOnly: boolean,
  getAssigneeName: (uid: string) => string
): Task[] {
  return tasks.filter(task => {
    if (selectedStatuses.length > 0 && !selectedStatuses.includes('すべて') && !selectedStatuses.includes(task.status)) {
      return false;
    }
    if (selectedAssignees.length > 0 && !selectedAssignees.includes(getAssigneeName(task.assignee))) {
      return false;
    }
    if (selectedPriorities.length > 0 && !selectedPriorities.includes(task.priority ?? '')) {
      return false;
    }
    if (estimateLessThanActualOnly && task.estimate != null && task.actual != null && task.estimate >= task.actual) {
      return false;
    }
    if (overdueOnly && task.dueDate && new Date(task.dueDate).getTime() >= new Date().setHours(0, 0, 0, 0)) {
      return false;
    }
    return true;
  });
}

function sortTasksByMode(tasks: Task[], mode: string, isCompleted: boolean): Task[] {
  switch (mode) {
    case 'dueDate':
      return tasks.sort((a, b) =>
        new Date(a.dueDate ?? '').getTime() - new Date(b.dueDate ?? '').getTime()
      );

    case 'priority': {
      const priorityMap: { [key: string]: number } = {
        '最優先': 1,
        '高': 2,
        '中': 3,
        '低': 4
      };
      return tasks.sort((a, b) =>
        (priorityMap[a.priority ?? ''] ?? 99) - (priorityMap[b.priority ?? ''] ?? 99)
      );
    }

    case 'default':
    default:
      return tasks.sort((a, b) => {
        if (isCompleted) {
          return (a.completionOrder || 0) - (b.completionOrder || 0);
        }
        if (a.order != null && b.order != null) return a.order - b.order;
        if (a.order != null) return -1;
        if (b.order != null) return 1;
        return 0;
      });
  }
}

function parseDueDate(input: any): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? null : parsed;
}



@Component({
  selector: 'app-project',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, MatDialogModule, MatButtonModule, MatSnackBarModule, MatCheckboxModule, MatSlideToggleModule, CalendarViewComponent, MatIconModule],
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

  
  sectionsWithTasks: SectionEntry[] = [];
  sectionOrder: Section[] = [];

  editingGoal = false;
  newGoalTitle: string = '目標';
  newGoalDueDate: string = '';
  editingMilestoneId: string | null = null;
  newMilestoneTitle: string = '';
  newMilestoneDueDate: string = '';


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
  allMilestones: MilestoneCard[] = [];
  private sectionSub?: Subscription;
  private taskSub?: Subscription;

  private handleAutoMoveToCompleted(): void {
    this.snackBar.open('✔ タスクを完了済セクションに移動しました', '', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: ['complete-snackbar']
    });
  }
  
  private async checkAndCompleteMilestone(task: Task): Promise<void> {
    const siblings = await firstValueFrom(
      this.firestoreService.getTasksByParentMilestoneId(this.projectId!, task.parentMilestoneId!)
    );
  
    const allDone = siblings.every(t => t.status === '完了');
  
    if (allDone) {
      const milestoneRef = doc(
        this.firestore,
        `projects/${this.projectId}/sections/${task.section}/milestones/${task.parentMilestoneId}`
      );
      await updateDoc(milestoneRef, { status: '完了' });
    }
  }

  private async fetchSectionsAndTasksOnce(projectId: string): Promise<[Section[], Task[]]> {
    const sections$ = this.firestoreService.getSections(projectId).pipe(take(1));
    const tasks$ = this.firestoreService.getTasksByProjectId(projectId).pipe(take(1));
    return await firstValueFrom(combineLatest([sections$, tasks$]));
  }

  private async processGoalAndMilestones(
    projectId: string,
    section: Section,
    tasks: Task[],
    entry: { goal?: GoalCard; milestones?: MilestoneCard[] }
  ): Promise<void> {
    const goal = await firstValueFrom(
      this.firestoreService.getGoalCard(projectId, section.id).pipe(take(1))
    );
    if (goal) {
      const totalEstimate = tasks.reduce((sum, t) => sum + (t.estimate ?? 0), 0);
      const completedEstimate = tasks
        .filter(t => t.status === '完了')
        .reduce((sum, t) => sum + (t.estimate ?? 0), 0);
      goal.progress = totalEstimate > 0
        ? Math.round((completedEstimate / totalEstimate) * 100)
        : 0;
  
      const ref = doc(this.firestore, `projects/${projectId}/sections/${section.id}/goals/goal`);
      await updateDoc(ref, { progress: goal.progress });
  
      entry.goal = goal;
      this.newGoalTitle = goal.title ?? '目標';
      this.newGoalDueDate = goal.dueDate;
    }
  
    const milestones = await firstValueFrom(
      this.firestoreService.getMilestoneCards(projectId, section.id).pipe(take(1))
    );
    entry.milestones = milestones;
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
    private cdr: ChangeDetectorRef
  ) {}

  @ViewChild(CalendarViewComponent) calendarComp?: CalendarViewComponent;
  
  


  onTaskPanelClosed(updated: boolean): void {
    this.isTaskPanelOpen = false;
    if (updated) {
      this.loadSectionsAndTasks(this.projectId!);
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



  @ViewChild(CalendarViewComponent) calendarComponentRef!: CalendarViewComponent;

  async ngOnInit(): Promise<void> {

    this.route.queryParamMap.subscribe(params => {
      const view = params.get('view');
      this.currentView = view === 'calendar' ? 'calendar' : 'list';
    });
  

    this.route.paramMap.subscribe(async params => {
      const id = params.get('id') ?? '';
      if (id) {
        this.projectId = id;
      }
  
      const user = await this.authService.getCurrentUser();
      if (user) {
        this.currentUserId = user.uid;
        await this.loadUserSettings();

        const role = await this.firestoreService.getUserRoleInProject(this.projectId!, this.currentUserId);
        this.userRole = role ?? 'viewer';

        this.taskPanelService.setUserRole(this.userRole);
      }
  
      await this.loadProjectData();
      this.loadSectionsAndTasks(this.projectId!);
      this.loadProjectTitle(this.projectId!);
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
  
    const wasAlreadyCompleted = task.status === '完了';
  
    if (newStatus === '完了' && this.autoMoveCompletedTasks === true && !wasAlreadyCompleted) {
      updates.section = this.COMPLETED_SECTION_TITLE;
      this.handleAutoMoveToCompleted();
    }
  
    await this.firestoreService.updateDocument(
      `projects/${this.projectId}/tasks/${task.id}`, updates
    );
  
    if (newStatus === '完了' && task.parentMilestoneId) {
      await this.checkAndCompleteMilestone(task);
    }
  
    this.loadSectionsAndTasks(this.projectId);
  }
  
  

  async loadSectionsAndTasks(projectId: string): Promise<void> {
    const [sections, tasks] = await this.fetchSectionsAndTasksOnce(projectId);
    this.sections = sections;
    this.tasks = tasks;
  
    await this.renderSectionsAndTasks(sections, tasks);

    
    this.sectionSub?.unsubscribe();
    this.taskSub?.unsubscribe();
  

    this.sectionSub = this.firestoreService.getSections(projectId).subscribe(latestSections => {
      this.sections = latestSections;
      this.sectionOrder = latestSections.sort((a, b) => a.order - b.order);
    });
  

    this.taskSub = this.firestoreService.getTasksByProjectId(projectId).subscribe(latestTasks => {
      this.tasks = latestTasks;
    });
  
    this.taskPanelService.setAvailableTasks(tasks);
  }
  

  private async renderSectionsAndTasks(sections: Section[] | unknown, tasks: Task[] | unknown): Promise<void> {
    if (!Array.isArray(sections) || !Array.isArray(tasks)) {
      console.error('セクションまたはタスクの型が不正です');
      return;
    }
  
    this.sectionOrder = sortSections(sections);
    this.availableSections = getAvailableSectionTitles(sections);
  
    tasks.forEach(task => {
      if (task.dueDate && (task.dueDate as any).toDate) {
        task.dueDate = (task.dueDate as Timestamp).toDate();
      }
    });
  
    this.calculateCalendarSummary(tasks, this.currentDate);
    const filteredTasks = filterTasks(
      tasks,
      this.selectedStatuses,
      this.selectedAssignees,
      this.selectedPriorities,
      this.estimateLessThanActualOnly,
      this.overdueOnly,
      this.getAssigneeName.bind(this)
    );
  
    const grouped: { [key: string]: Task[] } = {};
    for (const task of filteredTasks) {
      const section = task.section || '未分類';
      if (!grouped[section]) grouped[section] = [];
      grouped[section].push(task);
    }
  
    this.sectionsWithTasks = [];
  
    for (const sec of this.sectionOrder) {
      const isCompleted = sec.isFixed === true;
      if (isCompleted) this.collapsedSections.add(sec.title);
  
      let sectionTasks = grouped[sec.title] || [];
  
      sectionTasks = sortTasksByMode(sectionTasks, sec.selectedSort ?? 'default', isCompleted);
  
      const entry: SectionEntry = { section: sec, tasks: sectionTasks };
  
      if (sec.title === '目標・マイルストーン' && this.projectId) {
        await this.processGoalAndMilestones(this.projectId, sec, tasks, entry);
      }      
  
      this.sectionsWithTasks.push(entry);
    }
  
    if (this.projectId) {
      this.allMilestones = await this.loadAllMilestones(this.projectId);
    }
  
    this.cdr.detectChanges();
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
  
    dialogRef.afterClosed().subscribe(async result => {
      if (!result || !this.projectId) return;
  
      if (result.action === 'delete') {
        await this.firestoreService.deleteSectionWithTasks(this.projectId, section.id, section.title);
      } else if (result.action === 'move' && result.targetSectionId) {
        const targetTitle = this.sectionOrder.find(s => s.id === result.targetSectionId)?.title;
        if (targetTitle) {
          await this.firestoreService.moveTasksToSection(this.projectId, section.title, targetTitle);
          await this.firestoreService.deleteSection(this.projectId, section.id, targetTitle);
        }
      }
  
      // 🔁 セクションとタスクを再読み込みしてUI反映
      await this.loadSectionsAndTasks(this.projectId!);
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
      showSnackBar(this.snackBar, 'タスクタイトルを入力してください', {
        duration: 5000,
        panelClass: ['task-error-snackbar']
      });
      return;
    }
  
    if (!this.projectId || !this.addingSection) return;
  
    const sectionTitle = this.addingSection;
    const allTasks = await this.firestoreService.getTasksByProjectIdOnce(this.projectId);
    const targetTasks = allTasks.filter(t => t.section === sectionTitle && t.order != null);
  
    await Promise.all(
      targetTasks.map(t =>
        this.firestoreService.updateDocument(`projects/${this.projectId}/tasks/${t.id}`, {
          order: (t.order ?? 0) + 1,
        })
      )
    );
  
    const dueDate = parseDueDate(this.newTask.dueDate);
  
    const taskData: Omit<Task, 'id'> = {
      title: this.newTask.title!,
      assignee: this.newTask.assignee || '',
      dueDate,
      status: '未着手',
      section: sectionTitle,
      order: 0,
      ...(this.newTask.parentMilestoneId ? { parentMilestoneId: this.newTask.parentMilestoneId } : {})
    };
  
    const taskRef = await addDoc(
      collection(this.firestore, `projects/${this.projectId}/tasks`),
      taskData
    );
  
    if (this.currentUserId) {
      await Promise.all([
        this.firestoreService.sendNotificationToProjectMembers(
          this.projectId,
          taskRef.id,
          taskData.title,
          'new',
          this.currentUserId
        ),
        this.firestoreService.sendSlackNotification(this.currentUserId, taskData.title)
      ]);
    }
  
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
  
      const sectionRef = doc(this.firestore, `projects/${this.projectId}/sections/${option.id}`);
      updateDoc(sectionRef, { selectedSort: option.selectedSort });

      const isCompleted = sectionEntry.section.isFixed === true;
      sectionEntry.tasks = sortTasksByMode(sectionEntry.tasks, option.selectedSort, isCompleted);
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

  const members = await this.firestoreService.getProjectMembers(this.projectId);
  this.members = members;
  console.log('[DEBUG] メンバー一覧: ', this.members);
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

  async saveGoal(): Promise<void> {
    if (!this.projectId || !this.sectionOrder) return;
  
    const goalSection = this.sectionOrder.find(s => s.title === '目標・マイルストーン');
    if (!goalSection) return;
  
    const ref = doc(this.firestore, `projects/${this.projectId}/sections/${goalSection.id}/goals/goal`);
    
    try {
      await updateDoc(ref, {
        title: this.newGoalTitle,
        dueDate: this.newGoalDueDate
      });
    } catch (e: any) {
      if (e.code === 'not-found') {
        await setDoc(ref, {
          title: this.newGoalTitle,
          dueDate: this.newGoalDueDate
        });
      } else {
        throw e;
      }
    }
  
    this.editingGoal = false;
  
    await this.loadSectionsAndTasks(this.projectId);
  }
  
  
  cancelEditGoal(): void {
    this.editingGoal = false;
  }  

  createMilestone(sectionId: string): void {
    if (!this.projectId) return;
  
    const newMilestone: MilestoneCard = {
      id: '',
      type: 'milestone',
      title: 'マイルストーン',
      dueDate: new Date().toISOString().split('T')[0],
      dependentTaskIds: [],
      progress: 0,
      sectionTitle: ''
    };
  
    const milestoneRef = collection(this.firestore, `projects/${this.projectId}/sections/${sectionId}/milestones`);
    addDoc(milestoneRef, newMilestone)
      .then(() => {
        this.snackBar.open('✅ マイルストーンを作成しました', '', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom',
          panelClass: ['success-snackbar']
        });
        this.loadSectionsAndTasks(this.projectId!);
      });
  }
  
  startEditMilestone(ms: MilestoneCard): void {
    this.editingMilestoneId = ms.id;
    this.newMilestoneTitle = ms.title ?? 'マイルストーン';
    this.newMilestoneDueDate = ms.dueDate;
  }
  

  async saveMilestone(sectionId: string): Promise<void> {
    if (!this.projectId || !this.editingMilestoneId) return;
  
    const ref = doc(
      this.firestore,
      `projects/${this.projectId}/sections/${sectionId}/milestones/${this.editingMilestoneId}`
    );
    await updateDoc(ref, {
      title: this.newMilestoneTitle,
      dueDate: this.newMilestoneDueDate
    });
  
    this.editingMilestoneId = null;
    this.loadSectionsAndTasks(this.projectId!);
  }
  
  cancelEditMilestone(): void {
    this.editingMilestoneId = null;
  }


  async deleteMilestone(sectionId: string, milestoneId: string): Promise<void> {
    if (!this.projectId) return;
  
    const ref = doc(this.firestore, `projects/${this.projectId}/sections/${sectionId}/milestones/${milestoneId}`);
    await deleteDoc(ref);
    this.editingMilestoneId = null;
    this.loadSectionsAndTasks(this.projectId!);
  }

  async loadAllMilestones(projectId: string): Promise<MilestoneCard[]> {
    const sections = await this.firestoreService.getSectionsOnce(projectId);
    const all: MilestoneCard[] = [];
  
    for (const sec of sections) {
      const snap = await firstValueFrom(this.firestoreService.getMilestoneCards(projectId, sec.id));
      all.push(...(snap || []).map(m => ({
        ...m,
        sectionTitle: sec.title
      })));
    }
    return all;
  }

}