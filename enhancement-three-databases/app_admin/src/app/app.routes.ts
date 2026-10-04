import { Routes } from '@angular/router';
import { Login } from './login/login';
import { TripListing } from './trip-listing/trip-listing';
import { RevenueReportPage } from './revenue-report/revenue-report';
import { authGuard } from './auth-guard';
import { adminGuard } from './admin-guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'trips', component: TripListing, canActivate: [authGuard] },
  { path: 'reports', component: RevenueReportPage, canActivate: [authGuard, adminGuard] },
  { path: '', redirectTo: '/trips', pathMatch: 'full' },
  { path: '**', redirectTo: '/trips' }
];