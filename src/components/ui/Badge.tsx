interface BadgeProps {
  label: string;
  variant?: "gold" | "rose" | "mint" | "gray";
}

const variantClasses = {
  gold: "bg-brand-gold/10 text-brand-gold-dark",
  rose: "bg-brand-rose/15 text-brand-rose",
  mint: "bg-brand-mint/15 text-brand-mint",
  gray: "bg-brand-text/10 text-brand-text/70",
};

export default function Badge({ label, variant = "gold" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium font-poppins ${variantClasses[variant]}`}
    >
      {label}
    </span>
  );
}
