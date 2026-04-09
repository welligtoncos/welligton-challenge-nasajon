import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { DashboardImportacaoComponent } from './dashboard-importacao.component';
import { IbgeProcessorApiService } from '../../services/ibge-processor-api.service';
import { UploadPlanilhaService } from '../../services/upload-planilha.service';

describe('DashboardImportacaoComponent', () => {
  let component: DashboardImportacaoComponent;
  let fixture: ComponentFixture<DashboardImportacaoComponent>;
  let planilha: jasmine.SpyObj<UploadPlanilhaService>;
  let ibgeApi: jasmine.SpyObj<IbgeProcessorApiService>;

  beforeEach(async () => {
    planilha = jasmine.createSpyObj('UploadPlanilhaService', ['processarArquivo']);
    planilha.processarArquivo.and.returnValue(of({ ok: true, rows: [] }));

    ibgeApi = jasmine.createSpyObj('IbgeProcessorApiService', ['processarCsv']);
    ibgeApi.processarCsv.and.returnValue(
      of({
        linhas: [],
        stats: {
          total_municipios: 1,
          total_ok: 1,
          total_nao_encontrado: 0,
          total_erro_api: 0,
          pop_total_ok: 10,
          medias_por_regiao: { Sudeste: 10 },
        },
        resultado_csv: 'municipio_input,x\n',
      }),
    );

    await TestBed.configureTestingModule({
      imports: [DashboardImportacaoComponent],
      providers: [
        { provide: UploadPlanilhaService, useValue: planilha },
        { provide: IbgeProcessorApiService, useValue: ibgeApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardImportacaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
