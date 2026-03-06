const firebaseAuthErrorMap: Record<string, string> = {
  'auth/email-already-in-use': '이미 가입된 이메일입니다.',
  'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/user-not-found': '가입되지 않은 계정입니다.',
  'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
  'auth/too-many-requests': '요청이 많습니다. 잠시 후 다시 시도해 주세요.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
};

export function toAuthErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const matched = /auth\/[a-z-]+/.exec(error.message);
  if (!matched) {
    return fallback;
  }

  return firebaseAuthErrorMap[matched[0]] ?? fallback;
}
