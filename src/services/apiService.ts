import axios, { type AxiosRequestConfig } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const axiosInstance = axios.create({
  baseURL: process.env.SERVER_URL,
});

class APIService<T, K = T> {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  public async get(config?: AxiosRequestConfig): Promise<K> {
    const response = await axiosInstance.get<K>(this.endpoint, { ...config });
    return response.data;
  }

  public async post(data?: T, config?: AxiosRequestConfig): Promise<K> {
    const response = await axiosInstance.post<K>(this.endpoint, data, {
      ...config,
    });
    return response.data;
  }

  public async put(data?: T, config?: AxiosRequestConfig): Promise<K> {
    const response = await axiosInstance.put<K>(this.endpoint, data, {
      ...config,
    });
    return response.data;
  }

  public async delete(config?: AxiosRequestConfig): Promise<K> {
    const response = await axiosInstance.delete<K>(this.endpoint, {
      ...config,
    });

    return response.data;
  }
}

export default APIService;
