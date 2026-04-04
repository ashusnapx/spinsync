import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: any;
  label?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
  className?: string;
}

export function FormInput({ 
  field, 
  id, 
  label, 
  icon: Icon,
  type = "text",
  placeholder,
  className,
  ...props 
}: FormInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  
  // Only show errors if the field was touched to avoid aggressive red text early on
  const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
  
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id || field.name}>
          {label}
        </Label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-muted-foreground/60" />
          </div>
        )}
        <Input
          id={id || field.name}
          type={inputType}
          name={field.name}
          value={field.state.value as string}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          aria-invalid={isInvalid}
          className={cn(
            Icon && "pl-10", 
            isPassword && "pr-10",
            isInvalid && "border-rose-500/50 focus-visible:ring-rose-500 data-[state=invalid]:border-rose-500"
          )}
          placeholder={placeholder}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/60 hover:text-primary transition-colors focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      {isInvalid && (
        <p className="text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
          {field.state.meta.errors.map((err: unknown) => typeof err === "object" && err !== null && "message" in err ? String(err.message) : String(err)).join(", ")}
        </p>
      )}
    </div>
  );
}
