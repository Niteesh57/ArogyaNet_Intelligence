import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const GlassModal = ({ open, onClose, title, children }: GlassModalProps) => (
  <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="glass-panel border-border/30 text-foreground max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif text-xl text-foreground">{title}</DialogTitle>
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
);

interface GlassInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}

export const GlassInput = ({ label, value, onChange, type = "text", placeholder }: GlassInputProps) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-foreground/70">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-background/40 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-primary/60 focus:bg-background/60"
    />
  </div>
);

export const GlassSelect = ({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-foreground/70">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-background/40 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-300 focus:border-primary/60 appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-background text-foreground">{o.label}</option>
      ))}
    </select>
  </div>
);

export const GlassButton = ({ children, onClick, variant = "primary", className = "", disabled = false }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "danger" | "ghost";
  className?: string; disabled?: boolean;
}) => {
  const base = "px-4 py-2.5 rounded-lg font-semibold text-sm tracking-wide transition-all duration-300 disabled:opacity-50";
  const styles = {
    primary: "bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:shadow-[0_0_25px_hsla(170,66%,51%,0.3)] hover:-translate-y-0.5",
    danger: "bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-background/40",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};

export const PageHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-6 opacity-0 animate-fade-up" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
    <h1 className="font-serif text-3xl font-bold text-foreground">{title}</h1>
    {action}
  </div>
);

export const GlassTable = ({ headers, children }: { headers: string[]; children: React.ReactNode }) => (
  <div className="glass-panel rounded-xl overflow-hidden opacity-0 animate-fade-up" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
    <div className="overflow-x-auto scrollbar-themed">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/30">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/20">{children}</tbody>
      </table>
    </div>
  </div>
);

export const SearchBar = ({ value, onChange, placeholder = "Search..." }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="bg-background/40 border border-border/50 rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-primary/60 w-full max-w-xs"
  />
);

export const Shimmer = () => (
  <div className="space-y-4 animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-12 rounded-lg bg-background/30" />
    ))}
  </div>
);
