import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface AlertProps {
  children: ReactNode;
  variant?: "info" | "warning" | "error" | "success";
  className?: string;
}

const variantStyles = {
  info: "bg-blue-900/20 border-blue-500/50 text-blue-100",
  warning: "bg-yellow-900/20 border-yellow-500/50 text-yellow-100",
  error: "bg-red-900/20 border-red-500/50 text-red-100",
  success: "bg-green-900/20 border-green-500/50 text-green-100"
};

export function Alert({ children, variant = "info", className }: AlertProps) {
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      variantStyles[variant],
      className
    )}>
      {children}
    </div>
  );
}

interface AlertTitleProps {
  children: ReactNode;
  className?: string;
}

export function AlertTitle({ children, className }: AlertTitleProps) {
  return (
    <h5 className={cn("font-medium text-base mb-1", className)}>
      {children}
    </h5>
  );
}

interface AlertDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function AlertDescription({ children, className }: AlertDescriptionProps) {
  return (
    <div className={cn("text-sm", className)}>
      {children}
    </div>
  );
} 