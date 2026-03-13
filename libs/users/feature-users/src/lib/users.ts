import { Component, inject, ViewChild } from '@angular/core';
import { GenericTable, TableAction, TableColumnDirective } from '@angular-mono/shared-ui-generic-table';
import { User as UserService } from '@angular-mono/shared-data-access-users';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';

@Component({
  selector: 'lib-users',
  imports: [
    GenericTable,
    ReactiveFormsModule,
    TableColumnDirective,
    CurrencyPipe,
    DatePipe,
    UpperCasePipe
  ],
  template: `
    <div style="padding: 24px;">
      <h1>System Users</h1>

      <lib-generic-table
        [dataService]="userService"
        [filtersFormGroup]="userFilters"
        [displayedColumns]="['id', 'name', 'email', 'balance', 'createdAt', 'status']"
        [elementName]="'Users'"
        [editLink]="'/admin/users/edit'"
        [autoLoad]="true"
        [exportColumns]="['id', 'name', 'email', 'status']"
        [headerExportColumns]="['ID', 'Full Name', 'Email Address', 'Account Status']"
        [customActions]="extraActions"
        (deleteItem)="onDeleteUser($event)">

        <ng-template #customSearchTemplate>
          <form [formGroup]="userFilters"
                style="display: flex; gap: 12px; align-items: center;">
            <input formControlName="name"
                   placeholder="Filter by Name"
                   class="custom-input">
            <select formControlName="status"
                    class="custom-input">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </form>
        </ng-template>

        <ng-template appTableColumn="balance"
                     let-value>
          <strong>{{ value | currency:'USD' }}</strong>
        </ng-template>

        <ng-template appTableColumn="createdAt"
                     let-value>
          {{ value | date:'mediumDate' }}
        </ng-template>

        <ng-template appTableColumn="status"
                     let-value>
          <span [style.color]="getStatusColor(value)"
                style="font-weight: bold;">
            {{ value | uppercase }}
          </span>
        </ng-template>
      </lib-generic-table>
    </div>
  `,
  styles: `
      .custom-input {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
      }

      h1 {
          margin-bottom: 20px;
          font-family: sans-serif;
          color: #333;
      }
  `
})
export class Users {
  @ViewChild(GenericTable) table!: GenericTable;

  userService = inject(UserService);
  private fb = inject(FormBuilder);

  // Filters FormGroup
  userFilters = this.fb.group({
    name: [''],
    status: [''],
    search: [''] // Default search fallback
  });

  // Custom Actions
  extraActions: TableAction[] = [
    {
      label: 'Reset Password',
      icon: 'lock_reset',
      color: 'primary',
      callback: (row) => this.resetPassword(row)
    },
    {
      label: 'Download Profile',
      icon: 'download',
      color: 'accent',
      callback: (row) => console.log('Downloading profile for:', row.name)
    }
  ];

  getStatusColor(status: string): string {
    return status === 'active' ? 'green' : 'red';
  }

  resetPassword(user: any) {
    alert(`Password reset link sent to ${user.email}`);
  }

  onDeleteUser(user: any) {
    if (confirm(`Are you sure you want to delete ${user.name}?`)) {
      this.userService.delete(user.id).subscribe(() => {
        this.table.triggerManualReload();
      });
    }
  }
}
