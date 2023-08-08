/**
 * Function that validates internal line number input
 * @param {*} internalLineNumber internal line number as comma-separated string
 * @returns true if the input is valid (numbers separated by ',') false otherwise
 */
export function validateInternalLineNumber(internalLineNumber) {
  let stringList = internalLineNumber.split(",");
  for (let i = 0; i < stringList.length; i++) {
    if (stringList[i] && !containsOnlyNumbers(stringList[i])) return false;
  }

  return true;
}

/**
 * Checks if a string contains only digits
 * @param {*} stringValue the string to be checked
 * @returns true if the string contains only digits, false otherwise
 */
export function containsOnlyNumbers(stringValue) {
  // Checks for only digits.
  if (stringValue.match(/^[0-9]+$/) != null) return true;

  return false;
}

/**
 * Removes all commas (',') at the end of comma-separated string
 * @param {*} commmaSeparatedString the comma-separated string to be fixed
 * @returns comma-separated string without any commas at the end of the string
 */
export function removeTralingCommasFromCommaSeparatedString(
  commmaSeparatedString
) {
  let idx = commmaSeparatedString.lastIndexOf(",");
  while (idx >= 0 && idx === commmaSeparatedString.length - 1) {
    commmaSeparatedString = commmaSeparatedString.substring(0, idx);
    idx = commmaSeparatedString.lastIndexOf(",");
  }

  return commmaSeparatedString;
}
