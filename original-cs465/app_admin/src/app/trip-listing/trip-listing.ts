import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TripCard } from '../trip-card/trip-card';
import { TripData, Trip } from '../trip-data';

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

  emptyTrip: Trip = {
    code: '', name: '', length: '', start: '', resort: '', perPerson: '', image: '', description: ''
  };

  formModel: Trip = { ...this.emptyTrip };

  constructor(private tripDataService: TripData) {}

  ngOnInit(): void {
    this.loadTrips();
  }

  loadTrips(): void {
    this.tripDataService.getTrips().subscribe({
      next: (trips) => this.trips = trips,
      error: (err) => console.error('Error loading trips:', err)
    });
  }

  startAdd(): void {
    this.isAdding = true;
    this.editingTrip = null;
    this.formModel = { ...this.emptyTrip };
  }

  startEdit(trip: Trip): void {
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
    if (this.isAdding) {
      this.tripDataService.addTrip(this.formModel).subscribe({
        next: () => { this.loadTrips(); this.cancelForm(); },
        error: (err) => console.error('Error adding trip:', err)
      });
    } else if (this.editingTrip) {
      this.tripDataService.updateTrip(this.formModel).subscribe({
        next: () => { this.loadTrips(); this.cancelForm(); },
        error: (err) => console.error('Error updating trip:', err)
      });
    }
  }

  onDeleteTrip(tripCode: string): void {
    if (!confirm('Are you sure you want to delete this trip?')) return;
    this.tripDataService.deleteTrip(tripCode).subscribe({
      next: () => this.loadTrips(),
      error: (err) => console.error('Error deleting trip:', err)
    });
  }
}
