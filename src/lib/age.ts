export function calculateAge(
  birthday: string,
  until: string = new Date().toISOString(),
): number {
  const birth = new Date(birthday);
  const end = new Date(until);
  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate()))
    age--;
  return age;
}
