import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import * as XLSX from 'xlsx';
import type { MunicipioImportado } from '../models/municipio-importado.model';

const REQUIRED_CANONICAL = ['municipio', 'populacao'] as const;

export type ResultadoLeituraPlanilha =
  | { ok: true; rows: MunicipioImportado[] }
  | { ok: false; errors: string[] };

@Injectable({ providedIn: 'root' })
export class UploadPlanilhaService {
  /**
   * Lê .csv ou .xlsx, valida colunas obrigatórias e retorna linhas tipadas.
   */
  processarArquivo(file: File): Observable<ResultadoLeituraPlanilha> {
    return from(this.readAndValidate(file));
  }

  private async readAndValidate(file: File): Promise<ResultadoLeituraPlanilha> {
    const ext = this.resolveExtension(file.name);
    if (!ext) {
      return {
        ok: false,
        errors: ['Use um arquivo CSV ou Excel (.xlsx). Outros formatos não são aceitos.'],
      };
    }

    let workbook: XLSX.WorkBook;

    try {
      if (ext === 'csv') {
        let text = await file.text();
        text = text.replace(/^\uFEFF/, '');
        if (!text.trim()) {
          return { ok: false, errors: ['O arquivo está vazio.'] };
        }
        workbook = XLSX.read(text, { type: 'string', raw: false });
      } else {
        const buffer = await file.arrayBuffer();
        if (buffer.byteLength === 0) {
          return { ok: false, errors: ['O arquivo está vazio.'] };
        }
        workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', raw: false });
      }
    } catch {
      return {
        ok: false,
        errors: ['Não conseguimos abrir este arquivo. Ele pode estar danificado ou protegido.'],
      };
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { ok: false, errors: ['O arquivo parece vazio ou não tem planilha para ler.'] };
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });

    if (rows.length === 0) {
      return {
        ok: false,
        errors: ['Não há linhas de dados depois do cabeçalho. Confira se a planilha tem conteúdo.'],
      };
    }

    const headerKeys = Object.keys(rows[0] ?? {});
    if (headerKeys.length === 0) {
      return { ok: false, errors: ['Não encontramos o cabeçalho da planilha (primeira linha com nomes das colunas).'] };
    }

    const keyMunicipio = this.findColumnKey(headerKeys, 'municipio');
    const keyPopulacao = this.findColumnKey(headerKeys, 'populacao');

    const missing: string[] = [];
    if (!keyMunicipio) {
      missing.push('municipio');
    }
    if (!keyPopulacao) {
      missing.push('populacao');
    }
    if (missing.length > 0) {
      return {
        ok: false,
        errors: [
          `Faltam colunas ou o nome está diferente: na primeira linha use as colunas "municipio" e "populacao" ` +
            `(maiúsculas ou minúsculas não importam). Faltando: ${missing.join(', ')}.`,
        ],
      };
    }

    const errors: string[] = [];
    const data: MunicipioImportado[] = [];

    rows.forEach((row, index) => {
      const line = index + 2;
      const municipio = this.asTrimmedString(row[keyMunicipio!]);
      const populacao = this.parsePopulacao(row[keyPopulacao!]);

      if (!municipio && populacao === null) {
        return;
      }
      if (!municipio) {
        errors.push(`Linha ${line}: falta o nome do município.`);
        return;
      }
      if (populacao === null) {
        errors.push(`Linha ${line}: população inválida ou em branco (valor: "${String(row[keyPopulacao!])}").`);
        return;
      }

      data.push({ municipio, populacao });
    });

    if (data.length === 0) {
      return {
        ok: false,
        errors: ['Nenhuma linha válida. Confira se cada linha tem município e população corretos.'],
      };
    }

    if (errors.length > 0) {
      const max = 15;
      const shown = errors.slice(0, max);
      const extra = errors.length > max ? [`… e mais ${errors.length - max} aviso(s) nas outras linhas.`] : [];
      return { ok: false, errors: [...shown, ...extra] };
    }

    return { ok: true, rows: data };
  }

  private resolveExtension(fileName: string): 'csv' | 'xlsx' | null {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.csv')) {
      return 'csv';
    }
    if (lower.endsWith('.xlsx')) {
      return 'xlsx';
    }
    return null;
  }

  private normalizeHeader(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private findColumnKey(headerKeys: string[], canonical: (typeof REQUIRED_CANONICAL)[number]): string | undefined {
    const target = canonical;
    return headerKeys.find((k) => this.normalizeHeader(k) === target);
  }

  private asTrimmedString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim();
  }

  /**
   * Aceita número do Excel ou texto com separadores comuns (milhar com ponto, decimal com vírgula).
   */
  private parsePopulacao(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const n = Math.round(value);
      return n < 0 ? null : n;
    }

    let s = String(value).trim().replace(/\s/g, '').replace(/\u00a0/g, '');
    if (s === '') {
      return null;
    }

    if (/^\d+$/.test(s)) {
      return Number(s);
    }

    const comma = s.indexOf(',');
    const dot = s.indexOf('.');

    if (comma >= 0 && dot >= 0) {
      s = comma > dot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    } else if (comma >= 0) {
      const parts = s.split(',');
      if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
        s = `${parts[0].replace(/\./g, '')}.${parts[1]}`;
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (dot >= 0) {
      const parts = s.split('.');
      const last = parts[parts.length - 1] ?? '';
      if (parts.length > 2 || (parts.length === 2 && last.length === 3)) {
        s = parts.join('');
      }
    }

    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) {
      return null;
    }
    return Math.round(n);
  }
}
