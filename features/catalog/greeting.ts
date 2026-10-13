/**
 * Greeting of the home page from the visitor's local time (FR-001).
 */
import { EVENING_START_HOUR, MORNING_START_HOUR } from "@/lib/constants/catalog";

import { GREETING_MESSAGES } from "./messages";

/**
 * Chooses the greeting for a time of day.
 *
 * @param date - Current date, in the visitor's time zone.
 * @returns « Bonjour » from 5 h to 17 h 59, « Bonsoir » otherwise.
 */
export function greetingFor(date: Date): string {
  const hour = date.getHours();
  return hour >= MORNING_START_HOUR && hour < EVENING_START_HOUR
    ? GREETING_MESSAGES.morning
    : GREETING_MESSAGES.evening;
}
