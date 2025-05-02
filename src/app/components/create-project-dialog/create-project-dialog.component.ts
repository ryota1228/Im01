import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FirestoreService } from '../../services/firestore.service';

@Component({
  selector: 'app-create-project-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule],
  templateUrl: './create-project-dialog.component.html',
  styleUrls: ['./create-project-dialog.component.css']
})
export class CreateProjectDialogComponent {
  projectTitle = ''

  constructor(
    private dialogRef: MatDialogRef<CreateProjectDialogComponent>,
    private firestore: Firestore,
    private authService: AuthService,
    private firestoreService: FirestoreService
  ) {}

  async createProject(): Promise<void> {
    if (!this.projectTitle.trim()) return;
  
    const user = await this.authService.getCurrentUser();
    if (!user) return;
  
    const project = {
      title: this.projectTitle.trim(),
      ownerId: user.uid,
      memberIds: [user.uid],
      createdAt: new Date(),
    };
        
    const docRef = await addDoc(collection(this.firestore, 'projects'), project);
    const projectId = docRef.id;
  
    await this.firestoreService.initializeDefaultSections(projectId);

    const userDoc = await this.firestoreService.getUserById(user.uid);
    const displayName = userDoc?.displayName ?? '未登録ユーザー';
  
    await this.firestoreService.setDocument(`projects/${projectId}/members/${user.uid}`, {
      uid: user.uid,
      displayName,
      email: user.email ?? ''
    });
  
    this.dialogRef.close(projectId);
  }
  

  cancel(): void {
    this.dialogRef.close();
  }
}

