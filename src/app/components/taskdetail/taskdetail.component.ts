import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Task, TaskHistoryEntry } from '../../models/task.model';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
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
import { Attachment } from '../../models/task.model';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Storage } from '@angular/fire/storage';
import { FormControl } from '@angular/forms';
import { NgModel } from '@angular/forms';
import { Timestamp } from 'firebase/firestore';
import { AfterViewInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';

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
  attachedFiles: Attachment[] = [];
  showEditor = false;
  isDescriptionFocused = false;
  descriptionPreview: string = '';
  attachments: Attachment[] = [];
  descriptionControl = new FormControl('');

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
    private storage: Storage
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
        // Firestore Storage 等へアップロード処理追加
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
    this.currentUserName = user?.displayName ?? '';
    const currentUserUid = user?.uid ?? '';
    this.isViewerUser = this.userRole === 'viewer';
  
    // デフォルト値の初期化
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
  
    // 添付ファイルを復元
    this.attachedFiles = Array.isArray(this.task.attachments)
      ? this.task.attachments.map(att => ({
          ...att,
          name: att.name,
          size: 0,
          type: att.type,
          lastModified: Date.now(),
          arrayBuffer: async () => new ArrayBuffer(0),
          slice: () => new Blob(),
          stream: () => new ReadableStream(),
          text: async () => '',
        }) as File & Partial<Attachment>)
      : [];
  
    this.originalTask = JSON.parse(JSON.stringify(this.task));
  
    this.firestoreService.getSections(this.projectId).subscribe(sections => {
      this.sections = sections;
    });
  
    // プロジェクトのメンバー情報（role付き）を取得
    const allMembers = await this.firestoreService.getProjectMembers(this.projectId);
  
    // 担当者に選べるのは owner または editor のみ
    this.members = allMembers
      .filter(m => ['owner', 'editor'].includes(m.role))
      .map(m => ({ uid: m.uid, displayName: m.displayName }));
  
    // 履歴表示などに使う表示名マップ（全員対象）
    this.historyUserMap = new Map<string, string>();
    for (const m of allMembers) {
      this.historyUserMap.set(m.uid, m.displayName);
    }
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
  
    // Quillエディタ内容（Delta）と添付ファイル
    const deltaRaw = this.quillEditor?.quillEditor?.getContents();
    const delta = deltaRaw ? JSON.parse(JSON.stringify(deltaRaw)) : null;

    const attachments: Attachment[] = this.attachedFiles.map(file => ({
      name: file.name,
      url: file.url,
      type: file.type,
      uploadedAt: file.uploadedAt || new Date()
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
      this.closed.emit();
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
  
    if (updatedTask.status === '完了' && this.autoMoveCompletedTasks === true) {
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
      console.error('JSON変換失敗（circular構造？）:', e);
    }
  
    try {
      await setDoc(ref, updatedTask);
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
      // ← description, attachments, chat は履歴対象から除外
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
      console.log('削除完了');
      this.closed.emit();
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
    this.isConfirmingDelete = true;
  }
  
  async confirmDelete(): Promise<void> {
    await this.deleteTask();
    this.isConfirmingDelete = false;
  }
  
  cancelDelete(): void {
    this.isConfirmingDelete = false;
  }

  openDuplicateDialog(): void {
    this.isDuplicatingTask = true;
    this.selectedCopyTarget = null;
    this.duplicateTargetSectionId = null;
  }
  
  cancelDuplicate(): void {
    this.isDuplicatingTask = false;
    this.duplicateTargetSectionId = null;
    this.selectedCopyTarget = null;
  }
  
  async confirmDuplicate(): Promise<void> {
    if (!this.task || !this.projectId || !this.selectedCopyTarget) return;
  
    const newTask: Task = {
      ...structuredClone(this.task), // cloneDeep でもOK
      id: '', // 新規作成
      title: this.task.title + '（複製）',
      section: this.sections.find(s => s.id === this.selectedCopyTarget)?.title || '',
      order: null,
      history: [], // 複製では履歴は持たせない
    };
  
    await this.firestoreService.addTask(this.projectId, newTask);
    this.isDuplicatingTask = false;
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    const path = `attachments/${this.projectId}/${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
  
    const attachment: Attachment = {
      name: file.name,
      url,
      type: file.type,
      uploadedAt: new Date(),
    };
    
    this.attachedFiles.push(attachment);
  }
  
  
  async removeFile(file: Attachment) {
    this.attachedFiles = this.attachedFiles.filter(f => f.url !== file.url);
    const refToDelete = ref(this.storage, file.url);
    await deleteObject(refToDelete);
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
  
  /**
   * 選択範囲を指定タグで囲う
   */
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
  
  /**
   * 選択位置にテキストを挿入
   */
  insertAtSelection(text: string) {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;
  
    const start = textarea.selectionStart;
    textarea.setRangeText(text, start, start, 'end');
    this.task.description = textarea.value;
  }

  

  
}