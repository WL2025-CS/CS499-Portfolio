import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ReportData, RevenueReport } from '../report-data';

@Component({
  selector: 'app-revenue-report',
  imports: [CommonModule, FormsModule],
  templateUrl: './revenue-report.html',
  styleUrl: './revenue-report.css'
})
export class RevenueReportPage implements OnInit {
  from = '';
  to = '';
  report: RevenueReport | null = null;
  loading = false;
  errorMessage = '';

  constructor(private reportData: ReportData, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.runReport();
  }

  get maxResortRevenue(): number {
    return Math.max(1, ...(this.report?.byResort ?? []).map((r) => r.revenue));
  }

  private exclusiveEnd(date: string): string {
    if (!date) return '';
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  runReport(): void {
    this.errorMessage = '';
    if (this.from && this.to && this.to < this.from) {
      this.errorMessage = 'The end date must be on or after the start date.';
      return;
    }
    this.loading = true;
    this.reportData.getRevenueReport(this.from, this.exclusiveEnd(this.to)).subscribe({
      next: (report) => { this.report = report; this.loading = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        if (err.status === 403) {
          this.errorMessage = 'Only administrators can view the revenue report.';
        } else if (err.status === 401) {
          this.errorMessage = 'Your session has expired. Please log out and log in again.';
        } else if (err.status === 422 && Array.isArray(err.error?.errors)) {
          this.errorMessage = err.error.errors.map((e: { message: string }) => e.message).join(' ');
        } else {
          this.errorMessage = err.error?.message || 'Unable to load the report.';
        }
        this.cdr.markForCheck();
      }
    });
  }

  clearDates(): void {
    this.from = '';
    this.to = '';
    this.runReport();
  }

  exportCsv(): void {
    if (!this.report) return;
    const header = ['Resort', 'Trips', 'Bookings', 'Cancellations', 'Cancellation rate', 'Travelers', 'Revenue', 'Average booking'];
    const quote = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = this.report.byResort.map((r) => [
      r.resort, r.tripCount, r.bookings, r.cancellations, r.cancellationRate,
      r.travelers, r.revenue.toFixed(2), r.averageBookingValue.toFixed(2)
    ]);
    const t = this.report.totals;
    rows.push(['All resorts', '', t.bookings, t.cancellations, t.cancellationRate, t.travelers, t.revenue.toFixed(2), t.averageBookingValue.toFixed(2)]);
    const csv = [header, ...rows].map((row) => row.map(quote).join(',')).join('\r\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `travlr-revenue-${this.from || 'all'}-to-${this.to || 'now'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}