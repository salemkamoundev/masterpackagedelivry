import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { UserListComponent } from './users/user-list.component';
import { AdminHomeComponent } from './home/admin-home.component';
import { CarManagerComponent } from './cars/car-manager.component';
import { TripManagerComponent } from './trips/trip-manager.component';
import { CompanyManagerComponent } from './companies/company-manager.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminDashboardComponent,
    children: [
      { path: '', component: AdminHomeComponent, title: 'Administration - Accueil' },
      { path: 'users', component: UserListComponent, title: 'Administration - Utilisateurs' },
      { path: 'cars', component: CarManagerComponent, title: 'Administration - Flotte' },
      { path: 'trips', component: TripManagerComponent, title: 'Administration - Trajets' },
      { path: 'companies', component: CompanyManagerComponent, title: 'Administration - Sociétés' },
      { path: 'drivers', redirectTo: 'users' }
    ]
  }
];
