import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "online":
    case "active":
      return "text-success";
    case "offline":
    case "pending_verification":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

export function getActionColor(action: string): string {
  return action === "Blocked" ? "text-destructive" : "text-yellow-500";
}

export function getSourceColor(source: string): string {
  switch (source) {
    case "Rule Engine":
      return "text-blue-500";
    case "ML Engine":
      return "text-purple-500";
    case "Hybrid":
      return "text-accent";
    default:
      return "text-muted-foreground";
  }
}
