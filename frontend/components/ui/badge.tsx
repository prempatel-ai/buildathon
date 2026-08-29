import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-bold transition-colors focus:outline-none select-none tracking-wider uppercase",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-900 text-white",
        secondary:
          "border-transparent bg-slate-100 text-slate-800",
        destructive:
          "border-red-200 bg-red-50 text-red-700 border",
        emerald:
          "border-emerald-200 bg-emerald-50 text-emerald-700 border",
        amber:
          "border-amber-200 bg-amber-50 text-amber-700 border",
        indigo:
          "border-indigo-200 bg-indigo-50 text-indigo-700 border",
        outline:
          "text-slate-700 border border-slate-200 bg-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
