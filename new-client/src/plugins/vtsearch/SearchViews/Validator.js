/**
 * Function that validates internal line number input. Will make sure the input is
 * on the form digit,digit,digit etc. One ',' at the end of the string is allowed.
 * @param {*} internalLineNumber internal line number as comma-separated string
 * @returns true if the input is valid (numbers separated by ',') false otherwise
 */
export function validateInternalLineNumber(internalLineNumber) {
  let stringList = internalLineNumber.split(",");
  for (let i = 0; i < stringList.length; i++) {
    if (i === stringList.length - 1) {
      if (stringList[i] && !containsOnlyNumbers(stringList[i])) return false;
    } else {
      if (!containsOnlyNumbers(stringList[i])) return false;
    }
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
