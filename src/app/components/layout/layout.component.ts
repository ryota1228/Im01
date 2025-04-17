import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { LogoutDialogComponent } from '../logout-dialog/logout-dialog.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent {
  sidebarOpen = true;
  user$;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  )
  {
    this.user$ = this.authService.currentUser$;
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout() {
    const dialogRef = this.dialog.open(LogoutDialogComponent);

  dialogRef.afterClosed().subscribe(result => {
    if (result === true) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  });
  }

  openedSection: string | null = null;

toggleSection(section: string) {
  this.openedSection = this.openedSection === section ? null : section;
}
  
}

export class AppModule {}