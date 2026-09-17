import crypto from 'crypto';

/**
 * Generates the JazzCash pp_SecureHash HMAC-SHA256 signature.
 * 
 * Algorithm:
 * 1. Collect all non-empty fields (excluding pp_SecureHash).
 * 2. Sort the parameter keys in ascending alphabetical order (a-z).
 * 3. Prepend Integrity Salt and join sorted values with '&'.
 * 4. Generate HMAC-SHA256 hash using the Integrity Salt as the secret key.
 * 5. Return the hex digest in uppercase.
 */
export function generateJazzCashSecureHash(
  params: Record<string, string | number | undefined | null>,
  integritySalt: string
): string {
  if (!integritySalt) {
    throw new Error('JazzCash Integrity Salt is required to generate secure hash.');
  }

  // 1. Filter out empty/null/undefined values and pp_SecureHash
  const validKeys = Object.keys(params)
    .filter(
      (key) =>
        key !== 'pp_SecureHash' &&
        params[key] !== undefined &&
        params[key] !== null &&
        params[key] !== ''
    )
    .sort();

  // 2. Concatenate: IntegritySalt & val1 & val2 & ...
  let hashString = integritySalt;
  for (const key of validKeys) {
    hashString += `&${params[key]}`;
  }

  // 3. Compute HMAC-SHA256 with Integrity Salt as secret
  const hmac = crypto.createHmac('sha256', integritySalt);
  hmac.update(hashString);
  return hmac.digest('hex').toUpperCase();
}

/**
 * Validates an incoming callback/webhook response from JazzCash.
 */
export function verifyJazzCashResponse(
  responseParams: Record<string, string | number | undefined | null>,
  integritySalt: string
): boolean {
  const receivedHash = responseParams.pp_SecureHash;
  if (!receivedHash || typeof receivedHash !== 'string') {
    return false;
  }

  const calculatedHash = generateJazzCashSecureHash(responseParams, integritySalt);
  return calculatedHash === receivedHash.toUpperCase();
}
