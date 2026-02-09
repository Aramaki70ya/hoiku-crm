-- 面接削除を許可するRLSポリシー追加
-- Supabase の SQL Editor で実行してください。
-- （interviews に DELETE ポリシーが無く、削除がブロックされていたため）

CREATE POLICY "Authenticated users can delete interviews"
  ON interviews FOR DELETE TO authenticated USING (true);
