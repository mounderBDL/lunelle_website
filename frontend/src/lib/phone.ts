function toAsciiDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // Arabic-Indic digits
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0)); // Persian digits
}

const withLeadingZero = (rest: string) => (rest.startsWith("0") ? rest : `0${rest}`);

/** Returns 0XXXXXXXXX for a valid Algerian mobile number (05, 06 or 07), otherwise null. */
export function normalizePhone(raw: string): string | null {
  let digits = toAsciiDigits(raw).replace(/\D/g, "");
  if (digits.startsWith("00213")) {
    digits = withLeadingZero(digits.slice(5));
  } else if (digits.startsWith("213")) {
    digits = withLeadingZero(digits.slice(3));
  } else if (digits.length === 9) {
    digits = `0${digits}`;
  }
  return /^0[5-7]\d{8}$/.test(digits) ? digits : null;
}