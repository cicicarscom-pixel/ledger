SELECT tablename, policyname, qual FROM pg_policies WHERE tablename IN ('posts', 'comments', 'conversations');
