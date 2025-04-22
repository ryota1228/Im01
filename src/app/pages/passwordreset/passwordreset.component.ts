import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { ErrorDialogComponent } from '../../components/error-dialog/error-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { SuccessDialogComponent } from '../../components/success-dialog/success-dialog.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-passwordreset',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './passwordreset.component.html',
  styleUrl: './passwordreset.component.css'
})
export class PasswordresetComponent {

  email: string = '';
  message: string = '';
  error: string = '';

  constructor(
    private authService: AuthService,
     private dialog: MatDialog,
     private router: Router
  ) {}

  goTo(path: string) {
    this.router.navigate([path]);
  }

  async resetPassword() {
    try {
      await this.authService.sendPasswordReset(this.email);
      this.dialog.open(SuccessDialogComponent, {
        disableClose: true,
        data: { message: '再設定メールを送信しました。メールをご確認ください。' }
      });
      this.error = '';
    } catch (error: any) {      
      if (error.code === 'auth/invalid-email') {
        this.dialog.open(ErrorDialogComponent, {
          disableClose: true,
          data: { message: '不正なアドレスです。' }
        });
      } else if (error.code === 'auth/user-not-found') {
        this.dialog.open(ErrorDialogComponent, {
          disableClose: true,
          data: { message: 'このメールアドレスに対応するアカウントが見つかりませんでした。' }
        });
      } else {
        this.dialog.open(ErrorDialogComponent, {
          disableClose: true,
          data: { message: 'メール送信に失敗しました。アカウントをご確認ください。' }
        });
      }
    }


  }
}
