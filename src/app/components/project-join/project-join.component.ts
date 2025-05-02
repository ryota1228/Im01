import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../../services/firestore.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-project-join',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-join.component.html',
  styleUrls: ['./project-join.component.css']
})
export class ProjectJoinComponent {
  projectCode = '';
  message = '';

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private router: Router
  ) {}

  async joinProject() {
    const user = this.authService.getCurrentUser();
    if (!user || !this.projectCode) {
      this.message = 'プロジェクトコードを入力してください';
      return;
    }

    const project = await this.firestoreService.getDocument<any>(`projects/${this.projectCode}`);
    if (!project) {
      this.message = 'プロジェクトが見つかりません';
      return;
    }

    const memberDocRef = `projects/${this.projectCode}/members/${user.uid}`;
    await this.firestoreService.setDocument(memberDocRef, {
      uid: user.uid,
      displayName: user.displayName ?? '',
      email: user.email ?? ''
    });

    this.message = 'プロジェクトに参加しました';
    this.router.navigate(['/project', this.projectCode]);
  }
}