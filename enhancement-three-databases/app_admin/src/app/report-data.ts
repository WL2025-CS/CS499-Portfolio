import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReportTotals {
  bookings: number;
  cancellations: number;
  travelers: number;
  revenue: number;
  averageBookingValue: number;
  cancellationRate: number;
}

export interface ResortRow extends ReportTotals {
  resort: string;
  tripCount: number;
}

export interface TripRow extends ReportTotals {
  tripCode: string;
  tripName: string;
  resort: string;
}

export interface RevenueReport {
  generatedAt: string;
  range: { from: string | null; to: string | null };
  totals: ReportTotals;
  byResort: ResortRow[];
  topTrips: TripRow[];
}

@Injectable({
  providedIn: 'root'
})
export class ReportData {
  private baseUrl = 'http://localhost:3000/api/reports';

  constructor(private http: HttpClient) {}

  getRevenueReport(from?: string, to?: string): Observable<RevenueReport> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<RevenueReport>(`${this.baseUrl}/revenue`, { params });
  }
}