import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

export interface IUser {
  id: number;
  name: string;
  email: string;
  balance: number;
  createdAt: Date;
  status: 'active' | 'blocked';
}

@Injectable({
  providedIn: 'root'
})
export class User {
  // Mock Data
  private mockUsers: IUser[] = Array.from({ length: 45 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    balance: Math.random() * 1000,
    createdAt: new Date(),
    status: i % 3 === 0 ? 'blocked' : 'active'
  }));

  // Method called by the Generic Table
  getData(params: any): Observable<{
    content: IUser[],
    totalElements: number
  }> {
    console.log('API Request Params:', params);

    // Simulate API Pagination & Filtering
    const start = params.page * params.size;
    const end = start + params.size;
    const filtered = this.mockUsers.filter(u =>
      u.name.toLowerCase().includes(params.name?.toLowerCase() || '')
    );

    return of({
      content: filtered.slice(start, end),
      totalElements: filtered.length
    }).pipe(delay(800)); // Simulate network lag
  }

  // Export logic
  exportData(params: any): Observable<boolean> {
    console.log('Exporting CSV with columns:', params.columns);
    alert('Generating CSV for ' + params.columns.join(', '));
    return of(true);
  }

  delete(id: number): Observable<boolean> {
    return of(true).pipe(delay(500));
  }
}
