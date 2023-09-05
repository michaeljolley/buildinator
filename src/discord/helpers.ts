

export function getSunday(): string {
  const today = new Date();
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const sunday = new Date(midnight.setDate(midnight.getDate() - midnight.getDay()));
  return sunday.toISOString().split('T')[0];
}

export function isThreadOwner(content: string, userId: string): boolean {
  const regex = new RegExp(`<@${userId}>`);
  return regex.test(content);
}