#!/usr/bin/env bash
# Takip edilen metin dosyalarının başında UTF-8 BOM (EF BB BF) olmamalı. Varsa listeler ve hata verir.
# Editörde "UTF-8" olarak kaydet; "UTF-8 with BOM" DEĞİL. PowerShell Set-Content/Out-File BOM ekler — kullanma.
set -uo pipefail
bad=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  if [ "$(head -c3 "$f" | od -An -tx1 | tr -d ' \n')" = "efbbbf" ]; then echo "BOM: $f"; bad=1; fi
done < <(git -c core.quotepath=off ls-files | grep -E '\.(js|jsx|mjs|cjs|ts|tsx|json|md|sql|toml|yml|yaml|css|sh|txt)$|(^|/)\.(gitignore|editorconfig)$')
if [ "$bad" -ne 0 ]; then echo "HATA: BOM'lu dosya var"; exit 1; fi
echo "OK: BOM yok"
