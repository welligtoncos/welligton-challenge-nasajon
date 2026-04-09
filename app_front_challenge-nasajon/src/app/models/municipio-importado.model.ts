/** Linha válida da planilha após leitura e normalização. */
export interface MunicipioImportado {
  municipio: string;
  populacao: number;
}

/**
 * Estrutura pronta para envio ao backend (regras IBGE e geração de CSV ficam no servidor).
 */
export interface ImportacaoPlanilhaPayload {
  nomeArquivo: string;
  dataImportacao: string;
  municipios: MunicipioImportado[];
}
