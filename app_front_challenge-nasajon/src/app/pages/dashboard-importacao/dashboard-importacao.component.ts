import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { IBGE_SUBMIT_FUNCTION_URL } from '../../config/supabase.config';
import type { IbgeGradingResponse } from '../../models/ibge-grading-response.model';
import type { MunicipioImportado } from '../../models/municipio-importado.model';
import type { ProcessarCsvStats } from '../../models/processar-csv-response.model';
import { AuthService } from '../../services/auth.service';
import { IbgeProcessorApiService } from '../../services/ibge-processor-api.service';
import { IbgeSubmitGradingService } from '../../services/ibge-submit-grading.service';
import { UploadPlanilhaService } from '../../services/upload-planilha.service';
import { downloadTextAsFile } from '../../utils/download-text-file';

@Component({
  selector: 'app-dashboard-importacao',
  templateUrl: './dashboard-importacao.component.html',
  styleUrl: './dashboard-importacao.component.css',
})
export class DashboardImportacaoComponent {
  private readonly planilha = inject(UploadPlanilhaService);
  private readonly ibgeApi = inject(IbgeProcessorApiService);
  private readonly gradingSubmit = inject(IbgeSubmitGradingService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly errors = signal<string[]>([]);
  readonly previewRows = signal<MunicipioImportado[]>([]);
  readonly selectedFileName = signal<string | null>(null);
  /** Arquivo original (CSV ou XLSX) para reenvio fiel ao backend quando for CSV. */
  readonly selectedFile = signal<File | null>(null);

  readonly backendLoading = signal(false);
  readonly backendError = signal<string | null>(null);
  readonly backendStats = signal<ProcessarCsvStats | null>(null);

  readonly gradingLoading = signal(false);
  readonly gradingResult = signal<IbgeGradingResponse | null>(null);
  readonly gradingError = signal<string | null>(null);

  readonly accept = '.csv,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';

    this.errors.set([]);
    this.previewRows.set([]);
    this.selectedFileName.set(null);
    this.selectedFile.set(null);
    this.backendError.set(null);
    this.backendStats.set(null);
    this.resetGradingUi();

    if (!file) {
      return;
    }

    this.selectedFile.set(file);
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
        this.errors.set(['Algo deu errado ao abrir o arquivo. Tente de novo.']);
      },
    });
  }

  /**
   * Chama a API Django, recebe ``resultado_csv`` e inicia o download de ``resultado.csv``.
   * CSV original é enviado como veio; para XLSX, monta um CSV equivalente à prévia.
   */
  processarServidorEBaixar(): void {
    const file = this.selectedFile();
    const rows = this.previewRows();
    if (!this.podeProcessarNoServidor() || !file) {
      return;
    }

    this.backendLoading.set(true);
    this.backendError.set(null);
    this.resetGradingUi();

    const upload = file.name.toLowerCase().endsWith('.csv')
      ? file
      : this.criarArquivoCsvDasLinhas(rows);

    this.ibgeApi.processarCsv(upload).subscribe({
      next: (res) => {
        this.backendLoading.set(false);
        this.backendStats.set(res.stats);
        downloadTextAsFile(res.resultado_csv, 'resultado.csv');
      },
      error: (err: unknown) => {
        this.backendLoading.set(false);
        this.backendError.set(this.mapHttpError(err));
      },
    });
  }

  /**
   * Envia o JSON `{ stats }` para a Edge Function de correção (somente após clique do usuário).
   */
  enviarParaCorrecao(): void {
    const stats = this.backendStats();
    if (!stats || this.gradingLoading()) {
      return;
    }

    if (!IBGE_SUBMIT_FUNCTION_URL.trim()) {
      this.gradingError.set('O endereço da correção ainda não foi configurado.');
      return;
    }
    if (!this.auth.getToken()) {
      this.gradingError.set('Entre na sua conta para enviar o resultado à correção.');
      return;
    }

    this.gradingLoading.set(true);
    this.gradingError.set(null);

    this.gradingSubmit.submitStats(stats).subscribe({
      next: (grading) => {
        this.gradingLoading.set(false);
        this.gradingResult.set(grading);
        console.log('[correção] Nota (score):', grading.score);
        if (grading.feedback) {
          console.log('[correção] Feedback:', grading.feedback);
        }
      },
      error: (err: unknown) => {
        this.gradingLoading.set(false);
        this.gradingResult.set(null);
        this.gradingError.set(this.mapHttpError(err));
        console.warn('[correção] Falha ao enviar:', err);
      },
    });
  }

  podeEnviarCorrecao(): boolean {
    return (
      this.backendStats() !== null &&
      !this.loading() &&
      !this.backendLoading() &&
      !this.gradingLoading()
    );
  }

  formatScore(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  podeProcessarNoServidor(): boolean {
    return (
      !this.loading() &&
      !this.backendLoading() &&
      this.previewRows().length > 0 &&
      this.errors().length === 0 &&
      this.selectedFile() !== null
    );
  }

  formatPopulacao(value: number): string {
    return value.toLocaleString('pt-BR');
  }

  formatInt(value: number): string {
    return Math.round(value).toLocaleString('pt-BR');
  }

  formatDecimal(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  mediasRegiaoEntries(st: ProcessarCsvStats): [string, number][] {
    return Object.entries(st.medias_por_regiao).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  }

  private mapHttpError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { detail?: string } | string | null;
      if (typeof body === 'string' && body.length > 0) {
        return body;
      }
      if (body && typeof body === 'object' && typeof body.detail === 'string') {
        return body.detail;
      }
      if (err.status === 0) {
        return 'Sem conexão com o serviço. Confira a internet e tente de novo.';
      }
      return err.message || `Algo deu errado (código ${err.status}). Tente de novo.`;
    }
    return 'Não conseguimos concluir a operação. Tente de novo.';
  }

  private csvEscape(cell: string): string {
    const s = String(cell);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  private resetGradingUi(): void {
    this.gradingLoading.set(false);
    this.gradingResult.set(null);
    this.gradingError.set(null);
  }

  private criarArquivoCsvDasLinhas(rows: MunicipioImportado[]): File {
    const lines = [
      'municipio,populacao',
      ...rows.map((r) => `${this.csvEscape(r.municipio)},${r.populacao}`),
    ];
    return new File([lines.join('\n')], 'input.csv', { type: 'text/csv;charset=utf-8' });
  }
}
