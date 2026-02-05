import { clsx } from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "rounded-lg font-medium transition disabled:opacity-50",
        variant === "primary" && "bg-antreva-blue text-white hover:opacity-90",
        variant === "secondary" && "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        variant === "ghost" && "text-gray-700 hover:bg-gray-100",
        size === "sm" && "px-2 py-1 text-sm",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-4 py-3 text-base",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
