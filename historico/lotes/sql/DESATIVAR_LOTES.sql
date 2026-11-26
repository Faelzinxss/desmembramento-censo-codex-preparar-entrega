-- Desativação de emergência, preservando todos os dados e históricos.
-- Revoga apenas as operações do navegador. Não apaga tabelas, casos ou lotes.
begin;
revoke execute on function public.criar_snapshot_lotes_web() from authenticated;
revoke execute on function public.ler_snapshot_lotes_web(uuid,integer) from authenticated;
revoke execute on function public.confirmar_lotes_web(uuid,uuid,text,text,text,numeric,jsonb) from authenticated;
commit;
notify pgrst,'reload schema';
