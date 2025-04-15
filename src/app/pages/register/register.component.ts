import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  email: string = '';
  password: string = '';
  showPassword = false;
  
  constructor(private authService: AuthService, private router: Router) {}
  
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async register() {
    try {
      const userCredential = await this.authService.register(this.email, this.password);
      console.log('登録成功:', userCredential.user);
      this.router.navigate(['/']);
    } catch (error: any) {
      console.error('登録エラー:', error.code);
      switch (error.code) {
        case 'auth/email-already-in-use':
          alert('このメールアドレスは既に登録されています。');
          break;
        case 'auth/invalid-email':
          alert('メールアドレスの形式が正しくありません。');
          break;
        case 'auth/weak-password':
          alert('パスワードが弱すぎます（6文字以上にしてください）。');
          break;
        default:
          alert('登録に失敗しました: ' + error.message);
      }
    }
  }
}