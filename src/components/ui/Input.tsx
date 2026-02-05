import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
  /** Optional class for the label (e.g. text-antreva-navy in admin for contrast). */
  labelClassName?: string;
}

export function Input({ label, error, className, labelClassName, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={clsx("mb-1 block text-sm font-medium text-gray-700", labelClassName)}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          "w-full rounded-lg border px-3 py-2 text-antreva-navy",
          error ? "border-red-500" : "border-gray-300",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
