import * as crypto from 'crypto';

export function generateLcswSign(params: Record<string, any>, accessToken: string): string {
  const keys = Object.keys(params)
    .filter((k) => k !== 'key_sign' && params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort();

  const string1 = keys.map((k) => `${k}=${params[k]}`).join('&');
  const string2 = `${string1}&access_token=${accessToken}`;
  return crypto.createHash('md5').update(string2).digest('hex');
}

export function verifyLcswSign(params: Record<string, any>, accessToken: string, sign: string): boolean {
  return generateLcswSign(params, accessToken) === sign;
}
