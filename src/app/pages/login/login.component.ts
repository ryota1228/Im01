import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import {
  MatDialog,
  MatDialogModule
} from '@angular/material/dialog';
import { ErrorDialogComponent } from '../../components/error-dialog/error-dialog.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async login() {
    try {
      await this.authService.login(this.email, this.password);
      console.log('ログイン成功');
      this.router.navigate(['/']);
    } catch (error: any) {
      console.error('ログインエラー:', error.code);
      
      if (error.code === 'auth/invalid-credential') {
        this.dialog.open(ErrorDialogComponent, {
          disableClose: true,
          data: { message: 'メールアドレスまたはパスワードが違います。' }
        });
      } else if (error.code === 'auth/invalid-email') {
        this.dialog.open(ErrorDialogComponent, {
          disableClose: true,
          data: { message: 'メールアドレスを入力してください。' }
        });
      } else if (error.code === 'auth/missing-password') {
        this.dialog.open(ErrorDialogComponent, {
          disableClose: true,
          data: { message: 'パスワードを入力してください。' }
        });
      } else {
        this.dialog.open(ErrorDialogComponent, {
          disableClose: true,
          data: { message: 'ログインに失敗しました: ' + error.code }
        });
      }
    }
  }
  async onGoogleLoginClick() {
    try {
      const result = await this.authService.loginWithGoogle();
      console.log('ログイン成功:', result.user);
      this.router.navigate(['/']);
    } catch (err) {
      console.error('ログイン失敗:', err);
    }
  }
  passwordVisible = false;

togglePasswordVisibility() {
  this.passwordVisible = !this.passwordVisible;
}
}