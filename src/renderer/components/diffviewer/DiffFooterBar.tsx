import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

const languages = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JSON', value: 'json' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'Python', value: 'python' },
  { label: 'Plain Text', value: 'plaintext' },
]

export function DiffFooterBar({
  language,
  setLanguage,
  cursorPosition,
  encoding = 'UTF-8',
  indent = 2,
}: {
  language: string
  setLanguage: (lang: string) => void
  cursorPosition?: { line: number; column: number }
  encoding?: string
  indent?: number
}) {
  return (
    <div className="w-full h-10 px-4 text-xs flex items-center justify-between bg-muted text-muted-foreground border-t">
      <div className="flex items-center gap-2">
        <span>
          Ln {cursorPosition?.line ?? 1}, Col {cursorPosition?.column ?? 1}
        </span>
        <Separator orientation="vertical" className="h-3" />
        <span>Spaces: {indent}</span>
        <Separator orientation="vertical" className="h-3" />
        <span>{encoding}</span>
      </div>

      <div className="flex items-center gap-1">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-[120px] h-4 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map(lang => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
