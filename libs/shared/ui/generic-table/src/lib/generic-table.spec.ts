import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenericTable } from './generic-table';
import { of } from 'rxjs';
import { FormControl, FormGroup } from '@angular/forms';

describe('GenericTable', () => {
  let component: GenericTable;
  let fixture: ComponentFixture<GenericTable>;

  const mockDataService = {
    getData: jest.fn().mockReturnValue(
      of({
        content: [{ id: 1, name: 'Test User' }],
        totalElements: 1,
      }),
    ),
    exportData: jest.fn().mockReturnValue(of(null)),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericTable],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericTable);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('dataService', mockDataService);
    fixture.componentRef.setInput('displayedColumns', ['id', 'name']);
    fixture.componentRef.setInput(
      'filtersFormGroup',
      new FormGroup({ search: new FormControl('') }),
    );

    jest.clearAllMocks();
  });

  it('should create', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component).toBeTruthy();
  });

  it('should call getData on init automatically', async () => {
    fixture.componentRef.setInput('autoLoad', true);
    component.onPageChange({ pageIndex: 0, pageSize: 10, length: 0 });

    await Promise.resolve();
    fixture.detectChanges();

    expect(mockDataService.getData).toHaveBeenCalled();
  });

  it('should NOT call getData on init if autoLoad is false', async () => {
    fixture.componentRef.setInput('autoLoad', false);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockDataService.getData).not.toHaveBeenCalled();
  });
});
