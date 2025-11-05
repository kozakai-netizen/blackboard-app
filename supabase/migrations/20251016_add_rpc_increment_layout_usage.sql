-- RPC関数: レイアウト使用回数インクリメント
CREATE OR REPLACE FUNCTION public.increment_layout_usage(layout_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  UPDATE public.layouts
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = layout_id;
END;
$;

-- 権限設定
GRANT EXECUTE ON FUNCTION public.increment_layout_usage(UUID) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.increment_layout_usage IS 'レイアウトの使用回数を1増やす';
