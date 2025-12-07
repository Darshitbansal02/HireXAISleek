import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function parseUTCTime(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;
  // If it doesn't end with Z and doesn't have a timezone offset, assume it's UTC and append Z
  if (!dateString.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(dateString)) {
    return new Date(dateString + "Z");
  }
  return new Date(dateString);
}
