const MIN_JWT_SECRET_LENGTH = 32;

function normalizeSecret(value: string | undefined) {
  const trimmed = (value || '').trim();
  return trimmed || '';
}

export function getJwtSecretOrNull() {
  const secret = normalizeSecret(process.env.JWT_SECRET);
  if (!secret) return null;
  if (secret.length < MIN_JWT_SECRET_LENGTH) return null;
  return secret;
}

export function requireJwtSecret() {
  const secret = getJwtSecretOrNull();
  if (!secret) {
    throw new Error(
      `JWT_SECRET must be set and at least ${MIN_JWT_SECRET_LENGTH} characters long`
    );
  }
  return secret;
}
