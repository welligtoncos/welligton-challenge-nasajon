import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { DashboardImportacaoComponent } from './dashboard-importacao.component';
import { UploadPlanilhaService } from '../../services/upload-planilha.service';

describe('DashboardImportacaoComponent', () => {
  let component: DashboardImportacaoComponent;
  let fixture: ComponentFixture<DashboardImportacaoComponent>;
  let planilha: jasmine.SpyObj<UploadPlanilhaService>;

  beforeEach(async () => {
    planilha = jasmine.createSpyObj('UploadPlanilhaService', ['processarArquivo', 'buildPayload']);
    planilha.processarArquivo.and.returnValue(of({ ok: true, rows: [] }));
    planilha.buildPayload.and.returnValue({
      nomeArquivo: 't.csv',
      dataImportacao: '2026-01-01T00:00:00.000Z',
      municipios: [{ municipio: 'A', populacao: 1 }],
    });

    await TestBed.configureTestingModule({
      imports: [DashboardImportacaoComponent],
      providers: [{ provide: UploadPlanilhaService, useValue: planilha }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardImportacaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('prepararEnvio should build payload when rows exist', () => {
    component.selectedFileName.set('dados.csv');
    component.previewRows.set([{ municipio: 'X', populacao: 10 }]);
    component.errors.set([]);

    component.prepararEnvio();

    expect(planilha.buildPayload).toHaveBeenCalledWith('dados.csv', [{ municipio: 'X', populacao: 10 }]);
    expect(component.payload()?.nomeArquivo).toBe('t.csv');
  });

  it('should surface errors when processarArquivo fails', () => {
    planilha.processarArquivo.and.returnValue(of({ ok: false, errors: ['x'] }));

    const input = document.createElement('input');
    input.type = 'file';
    const file = new File(['a'], 'f.csv', { type: 'text/csv' });
    Object.defineProperty(input, 'files', { value: [file], writable: false });

    component.onFileSelected({ target: input } as unknown as Event);

    expect(component.errors()).toEqual(['x']);
  });

  it('should handle unexpected errors from processarArquivo', () => {
    planilha.processarArquivo.and.returnValue(throwError(() => new Error('boom')));

    const input = document.createElement('input');
    input.type = 'file';
    const file = new File(['a'], 'f.csv', { type: 'text/csv' });
    Object.defineProperty(input, 'files', { value: [file], writable: false });

    component.onFileSelected({ target: input } as unknown as Event);

    expect(component.errors().length).toBe(1);
  });
});
