import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service'; // 追加

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;

  constructor(
    private authService: AuthService, // ← AuthService を注入
    private router: Router
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
        alert('メールアドレスまたはパスワードが違います');
      } else {
        alert('ログインに失敗しました: ' + error.code);
      }
    }
  }
}