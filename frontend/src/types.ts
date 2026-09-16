export type Status = 'PENDENTE' | 'CONFIRMADO' | 'NAO_VAI'
export interface EventInfo {
  nome_evento: string; nome_casal: string; data: string | null; data_limite_confirmacao: string | null; hora: string | null;
  endereco: string; maps_url: string; texto_apresentacao: string; texto_presentes: string;
  acompanhantes_habilitados: boolean;
}
export interface Member { id: number; nome: string; status_presenca: Status }
export interface MemberInput { id?: number; nome: string; status_presenca: Status }
export interface Invitation { nome: string; status_presenca: Status; quantidade_acompanhantes: number; evento: EventInfo; membros: Member[]; convite_familiar: boolean; quantidade_confirmados: number }
export interface Guest extends Omit<Invitation, 'evento'> { id: number; token: string; slug: string; observacao: string }
export interface Gift {
  id: number; nome: string; descricao: string; imagem_url: string; produto_url: string;
  quantidade_desejada: number; quantidade_comprada: number; quantidade_restante: number;
  completo: boolean; ativo: boolean; ordem: number;
}
export type GiftInput = Omit<Gift, 'id' | 'quantidade_comprada' | 'quantidade_restante' | 'completo'>
export interface DashboardData {
  total_convidados: number; confirmados: number; nao_vao: number; pendentes: number;
  pessoas_confirmadas: number; pessoas_convidadas: number; total_presentes: number; presentes_completos: number;
  unidades_desejadas: number; unidades_compradas: number;
}
