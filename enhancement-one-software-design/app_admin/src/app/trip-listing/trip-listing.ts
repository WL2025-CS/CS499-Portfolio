import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TripCard } from '../trip-card/trip-card';
import { HttpErrorResponse } from '@angular/common/http';
import { TripData, Trip } from '../trip-data';
import { Auth } from '../auth';

@Component({
  selector: 'app-trip-listing',
  imports: [CommonModule, FormsModule, TripCard],
  templateUrl: './trip-listing.html',
  styleUrl: './trip-listing.css'
})
export class TripListing implements OnInit {
  trips: Trip[] = [];
  editingTrip: Trip | null = null;
  isAdding = false;
  errorMessage = '';

  emptyTrip: Trip = {
    code: '', name: '', length: '', start: '', resort: '', perPerson: '', image: '', description: ''
  };

  formModel: Trip = { ...this.emptyTrip };

  constructor(private tripDataService: TripData, private authService: Auth, private cdr: ChangeDetectorRef) {}

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  // Turns the API's 401/403/422 responses into a message the admin can act on.
  private showError(action: string, err: HttpErrorResponse): void {
    console.error(`Error ${action}:`, err);
    if (err.status === 403) {
      this.errorMessage = 'You do not have permission to do that. Only administrators can change trips.';
    } else if (err.status === 401) {
      this.errorMessage = 'Your session has expired. Please log out and log in again.';
    } else if (err.status === 422 && Array.isArray(err.error?.errors)) {
      this.errorMessage = err.error.errors.map((e: { message: string }) => e.message).join(' ');
    } else {
      this.errorMessage = err.error?.message || `Something went wrong ${action}.`;
    }
    this.cdr.markForCheck(); // the app is zoneless, so tell Angular to redraw
  }

  ngOnInit(): void {
    this.loadTrips();
  }

  loadTrips(): void {
    this.tripDataService.getTrips().subscribe({
      next: (trips) => { this.trips = trips; this.cdr.markForCheck(); },
      error: (err) => this.showError('loading trips', err)
    });
  }

  startAdd(): void {
    this.errorMessage = '';
    this.isAdding = true;
    this.editingTrip = null;
    this.formModel = { ...this.emptyTrip };
  }

  startEdit(trip: Trip): void {
    this.errorMessage = '';
    this.editingTrip = trip;
    this.isAdding = false;
    this.formModel = { ...trip };
  }

  cancelForm(): void {
    this.isAdding = false;
    this.editingTrip = null;
    this.formModel = { ...this.emptyTrip };
  }

  saveTrip(): void {
    this.errorMessage = '';
    if (this.isAdding) {
      this.tripDataService.addTrip(this.formModel).subscribe({
        next: () => { this.loadTrips(); this.cancelForm(); },
        error: (err) => this.showError('adding the trip', err)
      });
    } else if (this.editingTrip) {
      this.tripDataService.updateTrip(this.formModel).subscribe({
        next: () => { this.loadTrips(); this.cancelForm(); },
        error: (err) => this.showError('updating the trip', err)
      });
    }
  }

  onDeleteTrip(tripCode: string): void {
    if (!confirm('Are you sure you want to delete this trip?')) return;
    this.tripDataService.deleteTrip(tripCode).subscribe({
      next: () => { this.errorMessage = ''; this.loadTrips(); },
      error: (err) => this.showError('deleting the trip', err)
    });
  }
}