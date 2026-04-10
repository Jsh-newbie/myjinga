import { describe, expect, it, vi } from 'vitest';

import {
  buildAccountRecoveryTips,
  requestPasswordReset,
} from '@/lib/auth/recovery';

describe('requestPasswordReset', () => {
  it('trims the email before requesting a reset email', async () => {
    const sender = vi.fn().mockResolvedValue(undefined);

    await requestPasswordReset({ currentUser: null }, '  student@example.com  ', sender);

    expect(sender).toHaveBeenCalledWith({ currentUser: null }, 'student@example.com');
  });

  it('throws when the email is empty', async () => {
    const sender = vi.fn().mockResolvedValue(undefined);

    await expect(requestPasswordReset({ currentUser: null }, '   ', sender)).rejects.toThrow(
      '비밀번호 재설정 메일을 받을 이메일을 먼저 입력해 주세요.'
    );
    expect(sender).not.toHaveBeenCalled();
  });
});

describe('buildAccountRecoveryTips', () => {
  it('includes the typed email when available', () => {
    const tips = buildAccountRecoveryTips('student@example.com');

    expect(tips[0]).toContain('student@example.com');
  });

  it('falls back to a generic message when no email is typed', () => {
    const tips = buildAccountRecoveryTips('');

    expect(tips[0]).toContain('가입할 때 사용한 이메일');
  });
});
