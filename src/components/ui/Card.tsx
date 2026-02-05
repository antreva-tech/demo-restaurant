interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, children, className = "" }: CardProps) {
  return (
    <div className={`rounded-xl border bg-white shadow-sm ${className}`}>
      {title && (
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
