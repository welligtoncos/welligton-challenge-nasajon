/** Resposta da Edge Function de correção (POST com body `{ stats }`). */
export interface IbgeGradingResponse {
  user_id: string;
  email: string;
  score: number;
  feedback: string;
  components: Record<string, unknown>;
}
