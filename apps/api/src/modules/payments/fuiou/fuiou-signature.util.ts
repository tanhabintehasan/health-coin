import * as crypto from 'crypto';

export function buildFuiouSign(params: Record<string, string>, apiKey: string): string {
  // Sort keys, build query string, append key, MD5
  const sorted = Object.keys(params)
    .filter((k) => k !== 'sign' && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');

  const stringToSign = `${sorted}&key=${apiKey}`;
  return crypto.createHash('md5').update(stringToSign, 'utf8').digest('hex').toUpperCase();
}

export function verifyFuiouSign(params: Record<string, string>, apiKey: string): boolean {
  const receivedSign = params['sign'];
  if (!receivedSign) return false;
  const expected = buildFuiouSign(params, apiKey);
  return receivedSign === expected;
}
