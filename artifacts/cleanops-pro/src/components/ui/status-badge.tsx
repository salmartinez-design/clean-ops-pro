import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type StatusType = 
  | 'scheduled' | 'in_progress' | 'complete' | 'cancelled'
  | 'draft' | 'sent' | 'paid' | 'overdue'
  | 'active' | 'inactive';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StatusType;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  let colorClass = "";
  let label = status.replace('_', ' ').toUpperCase();

  switch (status) {
    case 'complete':
    case 'paid':
    case 'active':
      colorClass = "bg-[#3B6D11] text-[#EAF3DE] hover:bg-[#3B6D11]/90 border-transparent";
      break;
    case 'in_progress':
    case 'overdue':
      colorClass = "bg-[#854F0B] text-[#FAEEDA] hover:bg-[#854F0B]/90 border-transparent";
      break;
    case 'scheduled':
    case 'sent':
      colorClass = "bg-[#185FA5] text-white hover:bg-[#185FA5]/90 border-transparent";
      break;
    case 'cancelled':
    case 'draft':
    case 'inactive':
      colorClass = "bg-[#888780] text-[#F1EFE8] hover:bg-[#888780]/90 border-transparent";
      break;
  }

  return (
    <Badge 
      className={cn("px-2 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider", colorClass, className)}
      {...props}
    >
      {label}
    </Badge>
  )
}
