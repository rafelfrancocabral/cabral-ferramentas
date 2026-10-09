-- ============================================================================
-- Migracao: DATA DA VENDA = DATA EM QUE O PEDIDO FICOU 'entregue'
-- (no painel Dymar a venda concluida == orcamento Entregue). O dashboard usa
-- essa data como referencia da venda em todos os graficos (nao a de criacao),
-- porque orcamentos podem esperar semanas ate serem aprovados/entregues.
-- ============================================================================

ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ;

-- Backfill: vendas ja entregues recebem a data da ultima alteracao de status
UPDATE public.orcamentos
   SET concluido_em = coalesce(updated_at, created_at)
 WHERE status = 'entregue' AND concluido_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_orcamentos_concluido_em ON public.orcamentos (concluido_em);