import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loggedInGuard } from './guards/loggedin.guard';
import { LayoutComponent } from './components/layout/layout.component';
import { AdminToolsComponent } from './components/admin-tools/admin-tools.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', canActivate: [authGuard], loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
      { path: 'project/:projectId/task/:taskId', canActivate: [authGuard], loadComponent: () => import('./pages/taskdetail/taskdetail.component').then(m => m.TaskdetailComponent) },
      { path: 'project/:id', canActivate: [authGuard], loadComponent: () => import('./pages/project/project.component').then(m => m.ProjectComponent) },
      { path: 'teams', canActivate: [authGuard], loadComponent: () => import('./pages/teams/teams.component').then(m => m.TeamsComponent) },

      { path: 'admin-tools', canActivate: [authGuard], component: AdminToolsComponent }
    ]
  },

  { path: 'login', canActivate: [loggedInGuard], loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', canActivate: [loggedInGuard], loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent) },
  { path: 'passwordreset', canActivate: [loggedInGuard], loadComponent: () => import('./pages/passwordreset/passwordreset.component').then(m => m.PasswordresetComponent) },
];
