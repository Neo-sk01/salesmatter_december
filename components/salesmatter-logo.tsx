export function SalesMatterLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="32" height="32" rx="8" fill="currentColor" className="text-primary" />
      <path
        d="M8 16C8 11.5817 11.5817 8 16 8C20.4183 8 24 11.5817 24 16"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M12 16C12 13.7909 13.7909 12 16 12C18.2091 12 20 13.7909 20 16"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2" fill="white" />
      <path d="M16 18V24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
