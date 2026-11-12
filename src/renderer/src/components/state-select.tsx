import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { canonicalState, isValidState, UF_LIST } from '../../../shared/states'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  ariaLabel?: string
}

export function StateSelect({
  value,
  onChange,
  placeholder = 'UF',
  className,
  ariaLabel,
}: Props) {
  const state = canonicalState(value)
  const current = isValidState(state) ? state : ''
  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger
        className={cn('w-24', className)}
        aria-label={ariaLabel}
        aria-invalid={state.length === 2 && !isValidState(state)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {UF_LIST.map(uf => (
          <SelectItem key={uf} value={uf}>
            {uf}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
