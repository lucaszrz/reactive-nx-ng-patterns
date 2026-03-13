import {
  Component,
  computed,
  ContentChild,
  ContentChildren,
  Directive,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  QueryList,
  signal,
  TemplateRef,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  filter,
  finalize,
  map,
  merge,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
  take,
} from 'rxjs';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { AsyncPipe, NgTemplateOutlet, TitleCasePipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
} from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';

/** * Directive to capture custom templates for columns
 * Usage: <ng-template libTableColumn="columnName" let-value let-row="row">...</ng-template>
 */
@Directive({
  selector: '[libTableColumn]',
  standalone: true,
})
export class TableColumnDirective<T = unknown> {
  @Input('libTableColumn') columnName!: string;

  public template =
    inject<TemplateRef<{ $implicit: T[keyof T]; row: T }>>(TemplateRef);
}

export interface TableAction<T = unknown> {
  label: string;
  icon?: string;
  callback: (row: T) => void;
  color?: 'primary' | 'warn' | 'accent';
}

export interface TableResponse<T> {
  content: T[];
  totalElements: number;
}

@Component({
  selector: 'lib-generic-table',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    MatButton,
    MatProgressBar,
    MatTable,
    MatSort,
    MatSortModule,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatCell,
    MatCellDef,
    TitleCasePipe,
    MatIconButton,
    MatIcon,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatPaginator,
    AsyncPipe,
  ],
  template: `
    <div class="table-container">
      @if (!hideFilters) {
        <header class="toolbar">
          <div class="search-section">
            @if (customSearchTemplate) {
              <ng-container
                [ngTemplateOutlet]="customSearchTemplate"
              ></ng-container>
            } @else {
              <form [formGroup]="filtersFormGroup" class="default-search">
                <input
                  formControlName="search"
                  (keyup.enter)="triggerManualReload()"
                  placeholder="Search..."
                />
              </form>
            }
          </div>

          <div class="button-group">
            <button
              mat-flat-button
              color="primary"
              (click)="triggerManualReload()"
            >
              Search
            </button>
            <button mat-stroked-button (click)="clearTable()">Clear</button>
            @if (dataService.exportData) {
              <button
                mat-button
                (click)="exportToCsv()"
                [disabled]="isLoading() || dataSource().length === 0"
              >
                Export CSV
              </button>
            }
          </div>
        </header>
      }

      @if (isLoading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      <div class="table-wrapper">
        <table
          mat-table
          [dataSource]="dataSource()"
          matSort
          (matSortChange)="onSortChange($event)"
        >
          @for (col of displayedColumns; track col) {
            <ng-container [matColumnDef]="col">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>
                {{ col | titlecase }}
              </th>
              <td mat-cell *matCellDef="let row">
                @let customTemp = getCustomTemplate(col);
                @if (customTemp) {
                  <ng-container
                    [ngTemplateOutlet]="customTemp"
                    [ngTemplateOutletContext]="{
                      $implicit: row[col],
                      row: row,
                    }"
                  ></ng-container>
                } @else {
                  {{ row[col] }}
                }
              </td>
            </ng-container>
          }

          <ng-container matColumnDef="actions" stickyEnd>
            <th mat-header-cell *matHeaderCellDef class="actions-header">
              Actions
            </th>
            <td mat-cell *matCellDef="let row" class="actions-cell">
              @if (showEditAction) {
                <button
                  mat-icon-button
                  color="primary"
                  (click)="goToEdit(row.id)"
                >
                  <mat-icon>edit</mat-icon>
                </button>
              }
              @if (showDeleteAction) {
                <button
                  mat-icon-button
                  color="warn"
                  (click)="deleteItem.emit(row)"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              }
              @for (action of customActions; track action.label) {
                <button
                  mat-icon-button
                  [style.color]="action.color"
                  (click)="action.callback(row)"
                  [title]="action.label"
                >
                  <mat-icon>{{ action.icon }}</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="allDisplayedColumns()"></tr>
          <tr mat-row *matRowDef="let row; columns: allDisplayedColumns()"></tr>
        </table>

        <div class="messages">
          @if (showInitialMessage()) {
            <div class="info-box">
              <mat-icon>search</mat-icon>
              <p>Apply any filters to search for results.</p>
            </div>
          } @else if (showNoDataMessage()) {
            <div class="info-box">
              <mat-icon>info</mat-icon>
              <p>{{ noDataMessage || 'No ' + elementName + ' to show.' }}</p>
            </div>
          }
        </div>
      </div>

      <footer class="table-footer">
        <span class="total-count">
          Total: {{ totalElements() }} {{ elementName }}
        </span>
        <mat-paginator
          [length]="totalElements()"
          [pageIndex]="pageIndex$ | async"
          [pageSize]="10"
          (page)="onPageChange($event)"
          hidePageSize
        ></mat-paginator>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .table-container {
      display: flex;
      flex-direction: column;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      background: white;
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      gap: 16px;
      background: #fafafa;
    }

    .button-group {
      display: flex;
      gap: 8px;
    }

    .table-wrapper {
      position: relative;
      overflow-x: auto;
      min-height: 200px;
    }

    .actions-header,
    .actions-cell {
      background: white !important;
      padding-left: 16px !important;
    }

    .messages {
      padding: 40px;
      text-align: center;
    }

    .info-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #757575;
      gap: 8px;
    }

    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 16px;
      border-top: 1px solid #e0e0e0;
    }

    .total-count {
      font-weight: 500;
      color: #616161;
    }

    .default-search input {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      width: 250px;
    }
  `,
})
export class GenericTable<T extends { id?: string }> implements OnInit {
  private router = inject(Router);

  // --- Inputs ---
  @Input({ required: true }) dataService!: {
    getData: (params: Record<string, unknown>) => Observable<TableResponse<T>>;
    exportData?: (params: Record<string, unknown>) => Observable<void>;
  };
  @Input() filtersFormGroup: FormGroup = new FormGroup({});
  @Input() autoLoad = true;
  @Input() displayedColumns: string[] = [];
  @Input() elementName = 'items';
  @Input() editLink?: string;
  @Input() showEditAction = true;
  @Input() showDeleteAction = true;
  @Input() customActions: TableAction[] = [];
  @Input() noDataMessage?: string;
  @Input() hideFilters = false;
  @Input() exportColumns: string[] = [];
  @Input() headerExportColumns: string[] = [];

  @Output() deleteItem = new EventEmitter<T>();

  @ContentChild('customSearchTemplate')
  customSearchTemplate?: TemplateRef<unknown>;
  @ContentChildren(TableColumnDirective)
  customColumnTemplates!: QueryList<TableColumnDirective<T>>;

  // --- Reactive State Sources ---
  protected pageIndex$ = new BehaviorSubject<number>(0);
  private sort$ = new BehaviorSubject<Sort>({ active: '', direction: '' });
  private reloadTrigger$ = new Subject<void>();
  private clearTrigger$ = new Subject<void>();

  isLoading = signal(false);
  isInitialState = signal(false);

  // --- The Engine ---
  private dataStream$ = merge(
    this.clearTrigger$.pipe(map(() => ({ content: [], totalElements: 0 }))),
    combineLatest([
      this.pageIndex$,
      this.sort$,
      this.reloadTrigger$.pipe(startWith(null)),
    ]).pipe(
      filter(() => !this.isInitialState()),
      switchMap(([page, sort]) => {
        if (!this.dataService) return of({ content: [], totalElements: 0 });

        this.isLoading.set(true);
        this.isInitialState.set(false);

        return this.dataService.getData(this.buildParams(page, sort)).pipe(
          catchError(() => of({ content: [], totalElements: 0 })),
          finalize(() => this.isLoading.set(false)),
        );
      }),
    ),
  );

  // Bridging to Signals
  private dataResponse = toSignal(this.dataStream$, {
    initialValue: { content: [], totalElements: 0 },
  });

  dataSource = computed(() => this.dataResponse().content);
  totalElements = computed(() => this.dataResponse().totalElements);
  allDisplayedColumns = computed(() => [...this.displayedColumns, 'actions']);

  showInitialMessage = computed(
    () => this.isInitialState() && this.dataSource().length === 0,
  );
  showNoDataMessage = computed(
    () =>
      !this.isInitialState() &&
      this.dataSource().length === 0 &&
      !this.isLoading(),
  );

  ngOnInit() {
    if (!this.autoLoad) this.isInitialState.set(true);
  }

  private buildParams(page: number, sort: Sort) {
    return {
      ...this.filtersFormGroup.value,
      page,
      size: 10,
      sort: sort.active,
      order: sort.direction,
    };
  }

  getCustomTemplate(
    colName: string,
  ): TemplateRef<{ $implicit: unknown; row: unknown }> | null {
    return (
      this.customColumnTemplates?.find((t) => t.columnName === colName)
        ?.template || null
    );
  }

  exportToCsv() {
    if (!this.dataService.exportData) return;
    const params = {
      ...this.buildParams(this.pageIndex$.value, this.sort$.value),
      columns: this.exportColumns,
      headers: this.headerExportColumns,
    };
    this.dataService.exportData(params).pipe(take(1)).subscribe();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex$.next(event.pageIndex);
  }

  onSortChange(sort: Sort) {
    this.pageIndex$.next(0);
    this.sort$.next(sort);
  }

  triggerManualReload() {
    this.isInitialState.set(false);
    this.reloadTrigger$.next();
  }

  clearTable() {
    // Update UI state
    this.isInitialState.set(true);

    this.filtersFormGroup.reset();
    this.pageIndex$.next(0);
    this.sort$.next({ active: '', direction: '' });

    // This triggers the first path in the 'merge',
    // replacing the table data with [] without hitting the API.
    this.clearTrigger$.next();
  }

  goToEdit(id: string) {
    if (this.editLink) this.router.navigate([this.editLink, id]);
  }
}
