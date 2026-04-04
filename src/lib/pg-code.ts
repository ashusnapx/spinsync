export const PG_CODE_LENGTH = 6;
export const PG_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const PG_CODE_REGEX = new RegExp(
  `^[${PG_CODE_ALPHABET}]{${PG_CODE_LENGTH}}$`
);

export function normalizePgCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidPgCode(code: string): boolean {
  return PG_CODE_REGEX.test(normalizePgCode(code));
}

export function generatePgCode(): string {
  const values = crypto.getRandomValues(new Uint8Array(PG_CODE_LENGTH));

  return Array.from(values, (value) => {
    const index = value % PG_CODE_ALPHABET.length;
    return PG_CODE_ALPHABET[index];
  }).join("");
}
