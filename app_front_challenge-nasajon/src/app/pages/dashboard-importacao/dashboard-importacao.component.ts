import { Component, inject, signal } from '@angular/core';
import type { ImportacaoPlanilhaPayload, MunicipioImportado } from '../../models/municipio-importado.model';
import { UploadPlanilhaService } from '../../services/upload-planilha.service';

@Component({
  selector: 'app-dashboard-importacao',
  templateUrl: './dashboard-importacao.component.html',
  styleUrl: './dashboard-importacao.component.css',
})
export class DashboardImportacaoComponent {
  private readonly planilha = inject(UploadPlanilhaService);

  readonly loading = signal(false);
  readonly errors = signal<string[]>([]);
  readonly previewRows = signal<MunicipioImportado[]>([]);
  readonly selectedFileName = signal<string | null>(null);
  readonly payload = signal<ImportacaoPlanilhaPayload | null>(null);

  readonly accept = '.csv,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';

    this.payload.set(null);
    this.errors.set([]);
    this.previewRows.set([]);
    this.selectedFileName.set(null);

    if (!file) {
      return;
    }

    this.selectedFileName.set(file.name);
    this.loading.set(true);

    this.planilha.processarArquivo(file).subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result.ok) {
          this.previewRows.set(result.rows);
        } else {
          this.errors.set(result.errors);
        }
      },
      error: () => {
        this.loading.set(false);
        this.errors.set(['Erro inesperado ao processar o arquivo.']);
      },
    });
  }

  prepararEnvio(): void {
    const nome = this.selectedFileName();
    const rows = this.previewRows();
    if (!nome || rows.length === 0 || this.errors().length > 0) {
      return;
    }

    const built = this.planilha.buildPayload(nome, rows);
    this.payload.set(built);
    console.log('[importacao] payload pronto para o backend', built);
  }

  podePrepararEnvio(): boolean {
    return (
      !this.loading() &&
      this.previewRows().length > 0 &&
      this.errors().length === 0 &&
      this.selectedFileName() !== null
    );
  }

  formatPopulacao(value: number): string {
    return value.toLocaleString('pt-BR');
  }
}
