import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/supabase.config';
import type { SupabaseAuthTokenResponse } from '../models/auth-response.model';

const TOKEN_STORAGE_KEY = 'supabase.auth.access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly tokenUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

  /**
   * Realiza login no Supabase e, em caso de sucesso, persiste o access_token.
   * O token é retornado no corpo da resposta HTTP 200, no campo `access_token`.
   */
  login(email: string, password: string): Observable<SupabaseAuthTokenResponse> {
    const headers = new HttpHeaders({
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    });

    return this.http
      .post<SupabaseAuthTokenResponse>(this.tokenUrl, { email, password }, { headers })
      .pipe(
        tap((response) => this.saveToken(response.access_token)),
        catchError((err: HttpErrorResponse) => throwError(() => new Error(this.mapLoginError(err)))),
      );
  }

  saveToken(token: string): void {
    if (!token) {
      return;
    }
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  /** Remove o token salvo (logout). */
  removeToken(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  logout(): void {
    this.removeToken();
  }

  /**
   * Cabeçalho pronto para chamadas autenticadas futuras (ex.: HttpClient ou interceptor).
   */
  getAuthorizationHeader(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private mapLoginError(err: HttpErrorResponse): string {
    const body = err.error;

    if (body && typeof body === 'object') {
      const description = (body as { error_description?: string }).error_description;
      if (typeof description === 'string' && description.length > 0) {
        return description;
      }
      const msg = (body as { msg?: string }).msg;
      if (typeof msg === 'string' && msg.length > 0) {
        return msg;
      }
      const message = (body as { message?: string }).message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
      const error = (body as { error?: string }).error;
      if (typeof error === 'string' && error.length > 0) {
        return error;
      }
    }

    if (err.status === 0) {
      return 'Não foi possível conectar. Verifique sua rede e tente novamente.';
    }

    if (err.status === 400 || err.status === 401) {
      return 'E-mail ou senha inválidos.';
    }

    return err.statusText || 'Falha na autenticação. Tente novamente.';
  }
}
