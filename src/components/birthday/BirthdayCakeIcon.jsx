/**
 * Birthday cake icon that appears next to employee names on their birthday
 */
import { Cake } from "lucide-react";
import { isBirthdayToday } from "./birthdayUtils";

export default function BirthdayCakeIcon({ employee, className = "" }) {
  if (!isBirthdayToday(employee)) return null;
  
  return (
    <Cake className={`w-4 h-4 text-pink-500 flex-shrink-0 ${className}`} />
  );
}