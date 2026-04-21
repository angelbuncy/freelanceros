$base = "c:\Users\Angelina\Documents\freelanceros-complete"
$dirs = @("$base\app", "$base\components")
$files = Get-ChildItem -Recurse -Include "*.tsx" -Path $dirs | Where-Object { $_.FullName -notmatch "node_modules|\.next" }
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($content -match "GlowingCard") {
        $content = $content.Replace('import { GlowingCard } from "@/components/ui/glowing-card";', 'import { GlowCard } from "@/components/ui/spotlight-card";')
        $content = $content.Replace("<GlowingCard>", "<GlowCard customSize>")
        $content = $content.Replace("</GlowingCard>", "</GlowCard>")
        $content = [regex]::Replace($content, '<GlowingCard className="([^"]*)">', '<GlowCard customSize className="$1">')
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Updated: $($file.Name)"
    }
}
Write-Host "DONE"
