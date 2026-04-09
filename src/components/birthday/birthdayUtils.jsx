/**
 * Birthday utility functions
 * Checks if today is an employee's birthday based on their birthday field (YYYY-MM-DD format)
 */

/**
 * Check if today is the employee's birthday (matches month and day only)
 */
export function isBirthdayToday(employee) {
  if (!employee?.birthday) return false;
  const today = new Date();
  const todayMonth = today.getMonth(); // 0-indexed
  const todayDay = today.getDate();
  
  // birthday is stored as "YYYY-MM-DD"
  const parts = employee.birthday.split("-");
  if (parts.length < 3) return false;
  
  const bMonth = parseInt(parts[1], 10) - 1; // convert to 0-indexed
  const bDay = parseInt(parts[2], 10);
  
  return todayMonth === bMonth && todayDay === bDay;
}

/**
 * Get all employees who have a birthday today
 */
export function getBirthdayEmployees(employees) {
  if (!employees || !Array.isArray(employees)) return [];
  return employees.filter(isBirthdayToday);
}