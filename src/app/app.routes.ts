import { Routes } from '@angular/router';
import { LoginComponent } from './core/auth/login/login.component';
import { RegisterComponent } from './core/auth/register/register.component';
import { CompleteProfileComponent } from './core/auth/complete-profile/complete-profile.component';
import { DriverDashboardComponent } from './features/driver/dashboard/driver-dashboard.component'; // NOUVEL IMPORT
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'complete-profile', component: CompleteProfileComponent },
  
  // Route Chauffeur (Pas d'Admin Guard)
  { path: 'driver', component: DriverDashboardComponent },

  // Routes Admin protégées
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
    canActivate: [adminGuard]
  },
  
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
