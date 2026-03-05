import { NextResponse } from 'next/server';

import type { ApiError, ApiResponse } from '@/types/api';

export function ok<T>(data: T, status = 200) {
  const body: ApiResponse<T> = {
    success: true,
    data,
    error: null,
  };

  return NextResponse.json(body, { status });
}

export function fail(error: ApiError, status = 400) {
  const body: ApiResponse<null> = {
    success: false,
    data: null,
    error,
  };

  return NextResponse.json(body, { status });
}
