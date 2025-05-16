import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Task, TaskHistoryEntry } from '../../models/task.model';
import { doc, setDoc, deleteDoc, getDoc, getDocs } from 'firebase/firestore';
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
import { CalendarSyncService } from '../calendar-view/calendar-view.component';
import { addDoc, collection } from 'firebase/firestore';
import cloneDeep from 'lodash/cloneDeep';
import { UserRole } from '../../models/user-role.model';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';
import { QuillModule } from 'ngx-quill';
import { marked } from 'marked';
import Quill from 'quill';
import ImageUploader from 'quill-image-uploader';
import { QuillModules } from 'ngx-quill';
import { QuillEditorComponent } from 'ngx-quill';
import { ReactiveFormsModule } from '@angular/forms';
import { ViewChild } from '@angular/core';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Storage } from '@angular/fire/storage';
import { FormControl } from '@angular/forms';
import { NgModel } from '@angular/forms';
import { Timestamp } from 'firebase/firestore';
import { AfterViewInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TaskPanelService } from '../../services/task-panel.service';
import { Attachment, DisplayedAttachment } from '../../models/task.model';

@Component({
  selector: 'app-taskdetail',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeDatePipe, QuillModule, QuillEditorComponent, ReactiveFormsModule],
  templateUrl: './taskdetail.component.html',
  styleUrls: ['./taskdetail.component.css'],
})

export class TaskdetailComponent implements OnInit, AfterViewInit {

  @ViewChild('quillEditor') quillEditor!: QuillEditorComponent;

  @Input() task!: Task;
  @Input() projectId!: string;
  @Input() autoMoveCompletedTasks: boolean = true;
  @Input() userRole: UserRole = 'viewer';
  @Output() closed = new EventEmitter<boolean>();
  

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
  isViewerUser: boolean = true;
  isConfirmingDelete = false;
  validationError: string = '';
  isDuplicating: boolean = false;
  duplicateTargetSectionId: string | null = null;
  isDuplicatingTask = false;
  selectedCopyTarget: string | null = null;
  showEditor = false;
  isDescriptionFocused = false;
  descriptionPreview: string = '';
  attachments: Attachment[] = [];
  descriptionControl = new FormControl('');

  isBlockingDialogOpen: boolean = false;

  projectTitle: string = '';
  selectedFile: File | null = null;
  uploadedFiles: DisplayedAttachment[] = [];

  chatInput: string = '';
  currentUserUid: string = '';

  mentionCandidates: { uid: string; displayName: string }[] = [];

  chatLogs: any[] = [];

  chatLogVisible = false;

  showChatLog: boolean = false;


  quillModules: QuillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image']
    ],
    imageUploader: {
      upload: (file: File) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
          reader.readAsDataURL(file);
        });
      }
    }
  };

  editorModules = {
    toolbar: '#task-toolbar',
  };  
  

  constructor(
    private firestore: Firestore,
    private snackBar: MatSnackBar,
    private firestoreService: FirestoreService,
    private dialog: MatDialog,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private calendarSyncService: CalendarSyncService,
    private storage: Storage,
    private taskPanelService: TaskPanelService
  ) {}

  get dueDateString(): string {
    if (!this.task?.dueDate) return '';
    return this.task.dueDate instanceof Date
      ? this.task.dueDate.toISOString().substring(0, 10)
      : new Date(this.task.dueDate).toISOString().substring(0, 10);
  }

  handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      for (const file of Array.from(input.files)) {
        console.log('アップロード:', file.name);
      }
    }
  }
  
  getDisplayName(uid: string): string {
    const user = this.members.find(m => m.uid === uid);
    return user?.displayName || uid;
  }  

  onDueDateChange(dateStr: string): void {
    this.task.dueDate = dateStr ? new Date(dateStr) : null;
  }

  async ngOnInit(): Promise<void> {
    const user = await this.authService.getCurrentUser();
    const uid = user?.uid;
    this.currentUserName = user?.displayName ?? '';
    this.currentUserUid = uid ?? '';
    this.isViewerUser = true;
  
    if (this.projectId && uid) {
      const memberRef = doc(this.firestore, `projects/${this.projectId}/members/${uid}`);
      const snap = await getDoc(memberRef);
      if (snap.exists()) {
        const role = snap.data()['role'] as UserRole;
        this.isViewerUser = role === 'viewer';
      }
    }
  
    if (!this.task?.title && this.task?.id) {
      const cached = this.taskPanelService.getTaskById(this.task.id);
      if (cached) {
        this.task = cached;
      } else {
        const fetched = await this.firestoreService.getTaskById(this.projectId, this.task.id);
        if (fetched) this.task = fetched;
      }
    }
  
    if (this.task?.dueDate instanceof Timestamp) {
      this.task.dueDate = this.task.dueDate.toDate();
    }
  
    if (this.task?.dueDate && !(this.task.dueDate instanceof Date)) {
      const parsed = new Date(this.task.dueDate);
      if (!isNaN(parsed.getTime())) {
        this.task.dueDate = parsed;
      } else {
        console.warn('不正なdueDate:', this.task.dueDate);
        this.task.dueDate = null;
      }
    }
  
    if (!this.task?.title && this.task?.id && this.projectId) {
      const fullTask = await this.firestoreService.getTaskById(this.projectId, this.task.id);
      if (fullTask) {
        const due = fullTask.dueDate;
        if (due && typeof due === 'string') {
          const parsed = new Date(due);
          fullTask.dueDate = isNaN(parsed.getTime()) ? null : parsed;
        }
        this.task = fullTask;
      } else {
        console.warn('タスクが見つかりませんでした');
        return;
      }
    }
  
    if (this.task?.id) {
      const fileSnap = await getDocs(collection(this.firestore, `tasks/${this.task.id}/files`));
      this.uploadedFiles = fileSnap.docs.map(doc => {
        const data = doc.data() as Attachment;
        return {
          id: doc.id,
          ...data
        };
      });
    }
  
    if (!this.task.priority) this.task.priority = '最優先';
    if (this.task.progress == null) this.task.progress = 0;
    if (this.task.estimate == null) this.task.estimate = 0;
    if (this.task.actual == null) this.task.actual = 0;
    if (!this.task.description) this.task.description = '';
    if (!this.task.chat) this.task.chat = '';
    if (!this.task.history) this.task.history = [];
  
    if (this.task.dueDate && typeof this.task.dueDate === 'string') {
      this.task.dueDate = new Date(this.task.dueDate);
    }
  
    this.originalTask = JSON.parse(JSON.stringify(this.task));
  
    this.firestoreService.getSections(this.projectId).subscribe(sections => {
      this.sections = sections;
    });
  
    const allMembers = await this.firestoreService.getProjectMembers(this.projectId);
  
    this.members = allMembers.map(m => ({
      uid: m.uid,
      displayName: m.displayName
    }));
  
    this.historyUserMap = new Map<string, string>();
    for (const m of allMembers) {
      this.historyUserMap.set(m.uid, m.displayName);
    }
  
    const title = await this.firestoreService.getProjectTitleById(this.projectId);
    this.projectTitle = title ?? '（不明なプロジェクト）';

    await this.loadChatLogs();
  }
  

  
  async ngAfterViewInit(): Promise<void> {

    setTimeout(() => {
      if (this.task.descriptionDelta && this.quillEditor?.quillEditor) {
        try {
          this.quillEditor.quillEditor.setContents(this.task.descriptionDelta);
        } catch (e) {
          console.warn('Deltaの復元に失敗:', e);
        }
      }
    }, 100);
  }  
  
  async saveTask(): Promise<void> {
    if (!this.projectId || !this.task) return;
  
    if (!this.task.title || !this.task.section || !this.task.dueDate) {
      this.validationError = 'タイトル・期限・セクションは必須です。';
      return;
    }
    this.validationError = '';
  
    const isNewTask = !this.task.id;
  

    const deltaRaw = this.quillEditor?.quillEditor?.getContents();
    const delta = deltaRaw ? JSON.parse(JSON.stringify(deltaRaw)) : null;

    const attachments: Attachment[] = this.uploadedFiles.map(file => ({
      name: file.name,
      type: file.type,
      uploadedAt: file.uploadedAt || new Date(),
      data: file.data
    }));
  
    if (isNewTask) {
      const ref = await addDoc(
        collection(this.firestore, `projects/${this.projectId}/tasks`),
        {
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
          descriptionDelta: delta ?? null,
          attachments: attachments,
          chat: this.task.chat ?? '',
          history: [],
        }
      );
    
      this.task.id = ref.id;
      this.closed.emit(true);
      return;
    }
    
    if (!this.originalTask) return;
  
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
      descriptionDelta: delta ?? null,
      attachments: attachments,
      chat: this.task.chat ?? '',
      history: Array.isArray(this.task.history) ? this.task.history : [],
    };
  
    const historyEntries = this.generateHistoryEntries(this.originalTask, updatedTask);
    updatedTask.history.push(...historyEntries);
  
    if (
      updatedTask.status === '完了' &&
      this.autoMoveCompletedTasks === true &&
      this.originalTask?.status !== '完了'
    ) {
      updatedTask.section = '完了済';
      this.snackBar.open('✔ タスクを完了済セクションに移動しました', '', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['complete-snackbar']
      });
    }

    try {
      const test = JSON.stringify(updatedTask);
      console.log('保存データ:', test);
    } catch (e) {
      console.error('JSON変換失敗:', e);
    }
  
    try {
      const user = await this.authService.getCurrentUser();
      await this.firestoreService.updateTaskWithNotification(this.projectId,this.task.id,updatedTask,user?.uid ?? 'unknown');
      this.closed.emit(true);
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
  
      if ((prevVal === undefined || prevVal === '') && (nextVal === undefined || nextVal === '')) continue;
      if (prevVal !== nextVal) {
        history.push({
          field: key as string,
          before: prevVal,
          after: nextVal,
          changedBy: this.authService.getCurrentUser()?.uid || 'unknown',
          timestamp: new Date(),
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
      this.closed.emit(true);
    } catch (error) {
      console.error('削除エラー:', error);
    }
  }

  async onClosePanel(): Promise<void> {
    await this.saveTask();
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

  cancelEdit(): void {
    if (this.originalTask) {
      this.task = cloneDeep(this.originalTask);
    }
    this.closed.emit(false);
  }

  isViewer(): boolean {
    return this.userRole === 'viewer';
  }

  confirmDeleteDialog(): void {
    this.isBlockingDialogOpen = true;
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: { task: this.task },
      disableClose: true,
      hasBackdrop: true
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.confirmDelete();
      }
      this.isBlockingDialogOpen = false;
    });
  }  
  
  async confirmDelete(): Promise<void> {
    await this.deleteTask();
    this.isConfirmingDelete = false;
    this.closed.emit(true);
  }
  
  
  cancelDelete(): void {
    this.isConfirmingDelete = false;
  }

  openDuplicateDialog(): void {
    this.isBlockingDialogOpen = true;
    const dialogRef = this.dialog.open(CopyTasksDialogComponent, {
      data: { sections: this.sections, taskTitle: this.task.title },
      disableClose: true,
      hasBackdrop: true
    });
  
    dialogRef.afterClosed().subscribe((selectedSectionId: string | null) => {
      if (selectedSectionId) {
        this.confirmDuplicateWithSection(selectedSectionId);
      }
      this.isBlockingDialogOpen = false;
    });
  }
  
  private async confirmDuplicateWithSection(sectionId: string): Promise<void> {
    const newTask: Task = {
      ...structuredClone(this.task),
      id: '',
      title: this.task.title + '（複製）',
      section: this.sections.find(s => s.id === sectionId)?.title || '',
      order: null,
      history: [],
    };
  
    await this.firestoreService.addTask(this.projectId, newTask);
    this.closed.emit(true);
    
  }
  
  
  cancelDuplicate(): void {
    this.isDuplicatingTask = false;
    this.duplicateTargetSectionId = null;
    this.selectedCopyTarget = null;
  }
  
  async confirmDuplicate(): Promise<void> {
    if (!this.task || !this.projectId || !this.selectedCopyTarget) return;
  
    const newTask: Task = {
      ...structuredClone(this.task),
      id: '',
      title: this.task.title + '（複製）',
      section: this.sections.find(s => s.id === this.selectedCopyTarget)?.title || '',
      order: null,
      history: [],
    };
  
    await this.firestoreService.addTask(this.projectId, newTask);
    this.isDuplicatingTask = false;
    this.closed.emit(true);
  }
  

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file || !this.task?.id) return;
  
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
  
      const attachment: Attachment = {
        name: file.name,
        type: file.type,
        uploadedAt: new Date(),
        data: base64
      };
      await addDoc(collection(this.firestore, `tasks/${this.task.id}/files`), attachment);
  
      this.uploadedFiles.push({
        id: 'temp-' + Date.now(),
        name: attachment.name!,
        type: attachment.type!,
        uploadedAt: attachment.uploadedAt!,
        data: attachment.data!
      });
    };
  
    reader.readAsDataURL(file);
  }
  

  onDescriptionFocus() {
    this.isDescriptionFocused = true;
  }
  
  onDescriptionBlur() {
    setTimeout(() => {
      if (!document.activeElement?.closest('.rich-description')) {
        this.isDescriptionFocused = false;
      }
    }, 200);
  }

  applyBold() {
    this.wrapSelectionWithTag('**');
  }
  
  applyItalic() {
    this.wrapSelectionWithTag('*');
  }
  
  applyStrike() {
    this.wrapSelectionWithTag('~~');
  }
  
  applyLink() {
    const url = prompt('リンクURLを入力してください:');
    if (url) {
      this.insertAtSelection(`[リンクテキスト](${url})`);
    }
  }
  
  applyList() {
    this.insertAtSelection('- ');
  }
  

  wrapSelectionWithTag(tag: string) {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;
  
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const newText = tag + selected + tag;
  
    textarea.setRangeText(newText, start, end, 'end');
    this.task.description = textarea.value;
  }
  

  insertAtSelection(text: string) {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;
  
    const start = textarea.selectionStart;
    textarea.setRangeText(text, start, start, 'end');
    this.task.description = textarea.value;
  }
  
  async uploadFile() {
    if (!this.selectedFile || !this.task?.id) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;

      const filesRef = collection(this.firestore, `tasks/${this.task!.id}/files`);
      await addDoc(filesRef, {
        name: this.selectedFile!.name,
        data: base64,
        createdAt: Timestamp.now()
      });

      this.selectedFile = null;
      await this.loadFiles();
    };
    reader.readAsDataURL(this.selectedFile);
  }

  async loadFiles() {
    if (!this.task?.id) return;

    const snapshot = await getDocs(collection(this.firestore, `tasks/${this.task.id}/files`));
    this.uploadedFiles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as { name: string; data: string })
    }));
  }

  async deleteFile(fileId: string) {
    if (!this.task?.id) return;
    await deleteDoc(doc(this.firestore, `tasks/${this.task.id}/files/${fileId}`));
    this.uploadedFiles = this.uploadedFiles.filter(file => file.id !== fileId);
  }

  async sendChatMessage() {
    const input = this.chatInput.trim();
    const match = input.match(/^@(\S+)\s+(.+)/);
    if (!match) {
      console.warn('形式エラー: @宛先 メッセージ');
      return;
    }
  
    const [_, mentionName, message] = match;
    const targetMember = this.members.find(m => m.displayName === mentionName);
    if (!targetMember) {
      console.warn('宛先ユーザーが見つかりません:', mentionName);
      return;
    }
  
    try {
      await this.firestoreService.addChatLogAndNotify({
        projectId: this.projectId,
        taskId: this.task.id,
        from: this.currentUserUid,
        to: targetMember.uid,
        message
      });
  
      this.chatInput = '';

      await this.loadChatLogs();
  
    } catch (err) {
      console.error('チャット送信エラー:', err);
    }
  }

  onChatInput(): void {
    const match = this.chatInput.match(/@(\w*)$/);
    if (match) {
      const keyword = match[1].toLowerCase();
      this.mentionCandidates = this.members.filter(m =>
        m.displayName.toLowerCase().startsWith(keyword)
      );
    } else {
      this.mentionCandidates = [];
    }
  }
  
  selectMention(user: { uid: string; displayName: string }): void {
    this.chatInput = this.chatInput.replace(/@(\w*)$/, `@${user.displayName} `);
    this.mentionCandidates = [];
  }

  async loadChatLogs() {
    if (!this.projectId || !this.task?.id) return;
    this.chatLogs = await this.firestoreService.getChatLogs(this.projectId, this.task.id);
  }

  getChatDisplayName(uid: string): string {
    const user = this.members.find(m => m.uid === uid);
    return user?.displayName || uid;
  }

  getChatUserName(uid: string): string {
    const user = this.members.find(m => m.uid === uid);
    return user?.displayName ?? uid;
  }
  
}