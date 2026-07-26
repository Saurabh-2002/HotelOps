import * as React from "react"
import { cn } from "@/lib/utils"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value?: string | number;
  onChange?: (e: any) => void;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, value, onChange, placeholder = "Select an option...", ...props }, ref) => {
    const options = React.Children.toArray(children)
      .filter((child): child is React.ReactElement<any> => React.isValidElement(child) && child.type === 'option')
      .map(child => ({
        value: child.props.value?.toString() || '',
        label: child.props.children,
        disabled: child.props.disabled
      }))
      .filter(opt => opt.value !== ''); // filter out the placeholder option if it exists

    return (
      <SelectPrimitive.Root 
        value={value?.toString()} 
        onValueChange={(val) => {
          if (onChange) {
            // Provide a synthetic event to maintain backwards compatibility with existing <select> usages
            onChange({
              target: { value: val }
            });
          }
        }}
      >
        <SelectPrimitive.Trigger 
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder}>
            {options.find(opt => opt.value === value?.toString())?.label || placeholder}
          </SelectPrimitive.Value>
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content 
            className="relative z-[9999] max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-white text-slate-900 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1 h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]">
              {options.map((opt, i) => (
                <SelectPrimitive.Item
                  key={i}
                  value={opt.value}
                  disabled={opt.disabled}
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  )}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-4 w-4" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    )
  }
)
Select.displayName = "Select"
