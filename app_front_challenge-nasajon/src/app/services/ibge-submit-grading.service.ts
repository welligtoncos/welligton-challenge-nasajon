import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';
import { IBGE_SUBMIT_FUNCTION_URL } from '../config/supabase.config';
import type { IbgeGradingResponse } from '../models/ibge-grading-response.model';
import type { ProcessarCsvStats } from '../models/processar-csv-response.model';
import { AuthService } from './auth.service';

export interface IbgeSubmitStatsBody {
  stats: ProcessarCsvStats;
}

@Injectable({ providedIn: 'root' })
export class IbgeSubmitGradingService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /**
   * Envia as estatísticas calculadas para a Edge Function de correção.
   * Retorna vazio (sem emissão) se a URL não estiver configurada ou não houver token.
   */
  submitStats(stats: ProcessarCsvStats): Observable<IbgeGradingResponse> {
    const url = IBGE_SUBMIT_FUNCTION_URL.trim();
    if (!url) {
      console.warn('[correção] IBGE_SUBMIT_FUNCTION_URL vazio — envio à correção desativado.');
      return EMPTY;
    }

    const token = this.auth.getToken();
    if (!token) {
      console.warn('[correção] Sem token de acesso — faça login para enviar o resultado à correção.');
      return EMPTY;
    }

    const body: IbgeSubmitStatsBody = { stats };
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    return this.http.post<IbgeGradingResponse>(url, body, { headers });
  }
}
