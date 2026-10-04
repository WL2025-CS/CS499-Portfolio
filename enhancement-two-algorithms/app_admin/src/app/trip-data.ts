import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Trip {
  _id?: string;
  code: string;
  name: string;
  length: string;
  start: string;
  resort: string;
  perPerson: string;
  image: string;
  description: string;
}

export interface TripSearch {
  resort?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  startFrom?: string;
  startTo?: string;
  sortBy?: 'start' | 'price' | 'name' | 'resort';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface TripPage {
  data: Trip[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TripData {
  private baseUrl = 'http://localhost:3000/api/trips';

  constructor(private http: HttpClient) {}

  searchTrips(search: TripSearch = {}): Observable<TripPage> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(search)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<TripPage>(this.baseUrl, { params });
  }

  getResorts(): Observable<string[]> {
    return this.http.get<string[]>('http://localhost:3000/api/resorts');
  }

  getTrip(tripCode: string): Observable<Trip> {
    return this.http.get<Trip>(`${this.baseUrl}/${tripCode}`);
  }

  addTrip(trip: Trip): Observable<Trip> {
    return this.http.post<Trip>(this.baseUrl, trip);
  }

  updateTrip(trip: Trip): Observable<Trip> {
    return this.http.put<Trip>(`${this.baseUrl}/${trip.code}`, trip);
  }

  deleteTrip(tripCode: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${tripCode}`);
  }
}