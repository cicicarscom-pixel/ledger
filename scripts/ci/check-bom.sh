#!/usr/bin/env bash
echo "Checking for BOM..."
has_bom=0
for file in $(find . -type f -not -path '*/.git/*' -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/.expo/*'); do
    if head -c 3 "$file" | grep -q $'ï»¿'; then
        echo "BOM found in $file"
        has_bom=1
    fi
done
if [ $has_bom -eq 1 ]; then
    echo "ERROR: BOM detected in one or more files."
    exit 1
fi
echo "No BOM found. Check passed."
