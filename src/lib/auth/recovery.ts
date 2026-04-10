import type { Auth } from 'firebase/auth';

type PasswordResetSender = (auth: Auth, email: string) => Promise<void>;

export async function requestPasswordReset(
  auth: Auth,
  email: string,
  sender: PasswordResetSender
) {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    throw new Error('비밀번호 재설정 메일을 받을 이메일을 먼저 입력해 주세요.');
  }

  await sender(auth, normalizedEmail);
  return normalizedEmail;
}

export function buildAccountRecoveryTips(email: string) {
  const normalizedEmail = email.trim();

  return [
    normalizedEmail
      ? `${normalizedEmail}로 가입했는지 먼저 확인해 보세요.`
      : '가입할 때 사용한 이메일을 먼저 확인해 보세요.',
    '개인 메일함과 학교 메일함에서 마진가, myjinga, Firebase 메일을 검색해 보세요.',
    '기존 계정을 찾지 못하면 새 계정으로 가입해도 테스트는 계속할 수 있습니다.',
  ];
}
