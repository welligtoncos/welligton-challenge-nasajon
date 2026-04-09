/** Resposta de POST /api/processar-csv/ */

export interface ProcessarCsvStats {
  total_municipios: number;
  total_ok: number;
  total_nao_encontrado: number;
  total_erro_api: number;
  pop_total_ok: number;
  medias_por_regiao: Record<string, number>;
}

export interface ProcessarCsvLinha {
  municipio_input: string;
  populacao_input: string;
  municipio_ibge: string;
  uf: string;
  regiao: string;
  id_ibge: number | null;
  status: string;
}

export interface ProcessarCsvResponse {
  linhas: ProcessarCsvLinha[];
  stats: ProcessarCsvStats;
  resultado_csv: string;
}
