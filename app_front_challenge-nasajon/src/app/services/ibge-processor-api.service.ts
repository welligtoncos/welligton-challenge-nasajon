import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import type { ProcessarCsvResponse } from '../models/processar-csv-response.model';

@Injectable({ providedIn: 'root' })
export class IbgeProcessorApiService {
  private readonly http = inject(HttpClient);

  /**
   * Envia CSV ao Django (campo multipart ``arquivo``).
   */
  processarCsv(arquivo: File): Observable<ProcessarCsvResponse> {
    const body = new FormData();
    body.append('arquivo', arquivo, arquivo.name);
    const base = API_BASE_URL.replace(/\/$/, '');
    const url = `${base}/api/processar-csv/`;
    return this.http.post<ProcessarCsvResponse>(url, body);
  }
}
