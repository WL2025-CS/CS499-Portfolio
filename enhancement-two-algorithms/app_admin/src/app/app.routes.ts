import { Routes } from '@angular/router';
import { Login } from './login/login';
import { TripListing } from './trip-listing/trip-listing';
import { authGuard } from './auth-guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'trips', component: TripListing, canActivate: [authGuard] },
  { path: '', redirectTo: '/trips', pathMatch: 'full' },
  { path: '**', redirectTo: '/trips' }
];