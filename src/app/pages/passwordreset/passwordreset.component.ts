import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-passwordreset',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './passwordreset.component.html',
  styleUrl: './passwordreset.component.css'
})
export class PasswordresetComponent {
  email: string = '';
  message: string = '';
  error: string = '';

  constructor(private authService: AuthService) {}

  async resetPassword() {
    try {
      await this.authService.sendPasswordReset(this.email);
      this.message = '再設定メールを送信しました。メールをご確認ください。';
      this.error = '';
    } catch (err) {
      this.message = '';
      this.error = 'メール送信に失敗しました。アカウントをご確認ください。';
      console.error(err);
    }
  }
}