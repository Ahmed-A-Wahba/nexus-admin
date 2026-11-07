export interface ApiError {
  code: string;
  description: string;
}

export interface ApiResult<T> {
  isSuccess: boolean;
  data?: T;
  error?: ApiError;
}
