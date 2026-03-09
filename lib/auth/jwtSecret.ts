const MIN_JWT_SECRET_LENGTH = 32;

function normalizeSecret(value: string | undefined) {
  const trimmed = (value || '').trim();
  return trimmed || '';
}

export function getJwtSecretOrNull() {
  const candidates = [
    process.env.JWT_SECRET,
    process.env.NEXTAUTH_SECRET,
    process.env.AUTH_SECRET,
  ];

  for (const candidate of candidates) {
    const secret = normalizeSecret(candidate);
    if (secret.length >= MIN_JWT_SECRET_LENGTH) {
      return secret;
    }
  }

  return null;
}

export function requireJwtSecret() {
  const secret = getJwtSecretOrNull();
  if (!secret) {
    throw new Error(
      `JWT_SECRET or NEXTAUTH_SECRET must be set and at least ${MIN_JWT_SECRET_LENGTH} characters long`
    );
  }
  return secret;
}
