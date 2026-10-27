import type { TrackedHoursPoint } from "@/types/workspace";

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function buildTrackedHours(
  entries: { date: string; seconds: number }[],
  now: Date,
): {
  monthlyTrackedHours: TrackedHoursPoint[];
  yearlyTrackedHours: TrackedHoursPoint[];
} {
  const currentYear = now.getUTCFullYear();
  const monthlyTrackedHours = monthLabels.map((label) => ({ label, hours: 0 }));
  const yearlyTrackedHours = Array.from({ length: 6 }, (_, index) => ({
    label: String(currentYear - 5 + index),
    hours: 0,
  }));

  for (const entry of entries) {
    const date = new Date(`${entry.date}T00:00:00Z`);
    const hours = entry.seconds / 3600;
    if (date.getUTCFullYear() === currentYear) {
      monthlyTrackedHours[date.getUTCMonth()].hours += hours;
    }
    const year = yearlyTrackedHours.find(
      (item) => item.label === String(date.getUTCFullYear()),
    );
    if (year) year.hours += hours;
  }

  return { monthlyTrackedHours, yearlyTrackedHours };
}
