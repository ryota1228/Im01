import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { EmailExistsDialogComponent } from '../../components/email-exists-dialog/email-exists-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ErrorDialogComponent } from '../../components/error-dialog/error-dialog.component';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  email: string = '';
  password: string = '';
  displayName: string = '';
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private firestore: Firestore
  ) {}
  

  get passwordVisible(): boolean {
    return this.showPassword;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async register() {
    try {
      const userCredential = await this.authService.registerWithEmailPassword(this.email, this.password);
      const user = userCredential.user;

      await setDoc(doc(this.firestore, `users/${user.uid}`), {
        uid: user.uid,
        email: user.email,
        displayName: this.displayName.trim(),
        createdAt: new Date(),
        lastLoginAt: new Date(),
        photoURL: user.photoURL  
      });

      console.log('登録成功:', user);
      this.router.navigate(['/']);
    } catch (error: any) {
      console.error('登録エラー:', error.code);
      switch (error.code) {
        case 'auth/email-already-in-use':
          this.dialog.open(EmailExistsDialogComponent, {
            disableClose: true,
            width: '400px'
          });
          break;
        case 'auth/invalid-email':
          this.dialog.open(ErrorDialogComponent, {
            disableClose: true,
            data: { message: 'メールアドレスの形式が正しくありません。' }
          });
          break;
        case 'auth/weak-password':
          this.dialog.open(ErrorDialogComponent, {
            disableClose: true,
            data: { message: 'パスワードが弱すぎます（6文字以上にしてください）。' }
          });
          break;
        case 'auth/missing-password':
            this.dialog.open(ErrorDialogComponent, {
              disableClose: true,
              data: { message: 'パスワードを入力してください。' }
            });
            break;
        default:
          this.dialog.open(ErrorDialogComponent, {
            disableClose: true,
            data: { message: '登録に失敗しました: ' + error.message }
          });
      }
    }
  }
  async registerWithGoogle(): Promise<void> {
    try {
      const result = await this.authService.loginWithGoogle();
      const user = result.user;

      if(!user) return;

      await setDoc(doc(this.firestore, `users/${user.uid}`), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        photoURL: user.photoURL  
      });

      console.log('Google登録成功:', user);
      this.router.navigate(['/']);
    } catch (error: any) {
      console.error('Google登録エラー:', error.code);
      this.dialog.open(ErrorDialogComponent, {
        disableClose: true,
        data: { message: 'Googleでの登録に失敗しました。' }
      });
    }
  }    
}