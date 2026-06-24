/**
 * Utility functions for consistent formatting across the application.
 */

/**
 * Formats a number to a specified number of decimal places.
 * Default is 1 decimal place.
 */
export const formatNumber = (value: number | string, decimals: number = 1): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  // If it's an integer and we don't explicitly want decimals, return as is
  if (num % 1 === 0 && decimals === 0) {
    return num.toLocaleString();
  }

  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

/**
 * Formats a number as a rounded integer.
 */
export const formatInteger = (value: number | string): string => {
  return formatNumber(value, 0);
};

/**
 * Formats weight values (kg).
 */
export const formatWeight = (value: number | string): string => {
  return `${formatNumber(value, 1)} kg`;
};

/**
 * Formats BMI value.
 */
export const formatBMI = (value: number | string): string => {
  return formatNumber(value, 1);
};

/**
 * Formats energy values (kcal).
 */
export const formatKcal = (value: number | string): string => {
  return `${formatInteger(value)} kcal`;
};

/**
 * Formats water intake (L).
 */
export const formatWater = (value: number | string): string => {
  return `${formatNumber(value, 1)} L`;
};

/**
 * Formats a percentage.
 */
export const formatPercent = (value: number | string): string => {
  return `${formatNumber(value, 1)}%`;
};

/**
 * Formats a range of values.
 */
export const formatRange = (min: number | string, max: number | string, unit: string = ''): string => {
  const formattedMin = formatNumber(min, 1);
  const formattedMax = formatNumber(max, 1);
  return `${formattedMin}–${formattedMax}${unit ? ' ' + unit : ''}`;
};
