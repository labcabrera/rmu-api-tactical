import axios from 'axios';
import { BadGatewayError, ValidationError } from '../../domain/errors';

export function handleAxiosError(err: any, url: string): Error {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ECONNREFUSED') {
      return new BadGatewayError(`API is not available (${url})`);
    } else if (err.response && err.response.status) {
      if (err.response.status === 400) {
        return new ValidationError(`Invalid request (${url})`);
      }
    }
  }
  return err as Error;
}
