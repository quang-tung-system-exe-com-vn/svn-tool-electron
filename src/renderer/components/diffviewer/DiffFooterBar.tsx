import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { useState } from 'react'

const languages = [
  { label: 'ABAP', value: 'abap' },
  { label: 'Apex', value: 'apex' },
  { label: 'AZ CLI', value: 'azcli' },
  { label: 'Batch', value: 'bat' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'CSS', value: 'css' },
  { label: 'Dart', value: 'dart' },
  { label: 'Dockerfile', value: 'dockerfile' },
  { label: 'F#', value: 'fsharp' },
  { label: 'Go', value: 'go' },
  { label: 'GraphQL', value: 'graphql' },
  { label: 'Handlebars', value: 'handlebars' },
  { label: 'HTML', value: 'html' },
  { label: 'INI', value: 'ini' },
  { label: 'Java', value: 'java' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'JSON', value: 'json' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'Less', value: 'less' },
  { label: 'Lua', value: 'lua' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Objective-C', value: 'objective-c' },
  { label: 'Perl', value: 'perl' },
  { label: 'PHP', value: 'php' },
  { label: 'PowerShell', value: 'powershell' },
  { label: 'Python', value: 'python' },
  { label: 'R', value: 'r' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Rust', value: 'rust' },
  { label: 'SCSS', value: 'scss' },
  { label: 'Shell Script', value: 'shell' },
  { label: 'SQL', value: 'sql' },
  { label: 'Swift', value: 'swift' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'VB.NET', value: 'vb' },
  { label: 'XML', value: 'xml' },
  { label: 'YAML', value: 'yaml' },
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
  const [open, setOpen] = useState(false)
  return (
    <div className="w-full h-6 px-2 text-xs flex items-center justify-between bg-muted text-muted-foreground border-t">
      <div className="flex items-center gap-2 h-full">
        <span>
          Ln {cursorPosition?.line ?? 1}, Col {cursorPosition?.column ?? 1}
        </span>
        <Separator orientation="vertical" className="h-3" />
        <span>Spaces: {indent}</span>
        <Separator orientation="vertical" className="h-3" />
        <span>{encoding}</span>
      </div>

      <div className="flex items-center h-full">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" aria-expanded={open} className="h-full justify-between border-0 rounded-none">
              {languages.find(item => item.value === language)?.label ?? 'Select language...'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[120px] p-0">
            <Command>
              <CommandInput placeholder="Search" />
              <CommandList>
                <CommandEmpty>No language found.</CommandEmpty>
                <CommandGroup>
                  {languages.map(lang => (
                    <CommandItem
                      key={lang.value}
                      value={lang.value}
                      onSelect={currentValue => {
                        setLanguage(currentValue)
                        setOpen(false)
                      }}
                    >
                      {lang.label}
                      <Check className={cn('ml-auto h-4 w-4', language === lang.value ? 'opacity-100' : 'opacity-0')} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
