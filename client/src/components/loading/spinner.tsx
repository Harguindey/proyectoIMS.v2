import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <Loader2 
      className={cn(
        "animate-spin text-slate-500",
        sizeClasses[size],
        className
      )} 
    />
  );
}

interface LoadingSpinnerProps {
  text?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ text = "Cargando...", size = "md" }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center space-x-2 py-8">
      <Spinner size={size} />
      <span className="text-sm text-slate-500">{text}</span>
    </div>
  );
}