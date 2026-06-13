import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

import { getAccessToken } from './auth-token';

const axiosInstance = axios.create({
  baseURL: '',
});

axiosInstance.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

export async function apiClient<T>(
  config: AxiosRequestConfig,
): Promise<T> {
  const response: AxiosResponse<T> = await axiosInstance.request<T>(config);

  return response.data;
}

export type ErrorType<Error = unknown> = AxiosError<Error>;
export type BodyType<BodyData = unknown> = BodyData;