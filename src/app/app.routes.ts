import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loggedInGuard } from './guards/loggedin.guard';
import { LayoutComponent } from './components/layout/layout.component';
import { TaskdetailComponent } from './pages/taskdetail/taskdetail.component';
import { ProjectComponent } from './pages/project/project.component';

export const routes: Routes = [
  {
    path: '',
    // loadComponent: () => import('./components/layout/layout.component').then(m => m.LayoutComponent),
    component: LayoutComponent,
    children: [
      { path: '', canActivate: [authGuard], loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
      { path: 'project/:projectId/task/:taskId',canActivate: [authGuard], loadComponent: () => import('./pages/taskdetail/taskdetail.component').then( m => m.TaskdetailComponent) },
      { path: 'project/:id', canActivate: [authGuard], loadComponent: () => import('./pages/project/project.component').then(m => m.ProjectComponent) },
      { path: 'teams', canActivate: [authGuard], loadComponent: () => import('./pages/teams/teams.component').then(m => m.TeamsComponent) },
    ]
  },
  { path: 'login', canActivate: [loggedInGuard], loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', canActivate: [loggedInGuard], loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent) },
  { path: 'passwordreset', canActivate: [loggedInGuard], loadComponent: () => import('./pages/passwordreset/passwordreset.component').then(m => m.PasswordresetComponent) },
];

// export const routes: Routes = [
//   {
//     path: '',component: LayoutComponent,
//     children: [
//       { path: '', component: HomeComponent, canActivate: [authGuard] } ] },
//       { path: 'projects', component: ProjectsComponent, canActivate: [authGuard] },
//       { path: 'teams', component: TeamsComponent, canActivate: [authGuard] },
//       { path: 'login', component: LoginComponent, canActivate: [loggedInGuard] },
//       { path: 'register', component: RegisterComponent, canActivate: [loggedInGuard] },
//       { path: 'passwordreset', component: PasswordresetComponent, canActivate: [loggedInGuard] },
// ];