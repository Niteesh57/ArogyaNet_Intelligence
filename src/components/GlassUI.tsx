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
    <DialogContent className="bg-background border-border sm:max-w-lg shadow-lg">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-foreground">{title}</DialogTitle>
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
  <div className="space-y-2">
    <label className="block text-sm font-medium text-foreground">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    />
  </div>
);

export const GlassSelect = ({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-foreground">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
  const base = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";
  const styles = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};

export const PageHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-6">
    <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
    {action}
  </div>
);

export const GlassTable = ({ headers, children }: { headers: string[]; children: React.ReactNode }) => (
  <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            {headers.map((h) => (
              <th key={h} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">{children}</tbody>
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
