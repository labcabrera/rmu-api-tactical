import { Response } from 'express';
import { IApiError } from '../types';

const sendErrorResponse = (res: Response, error: IApiError): void => {
    try {
        const status: number = error.status || 500;
        if (status === 500) {
            console.error(error);
        }
        res.status(status).json({
            code: status.toString(),
            message: error.message,
            timestamp: new Date().toISOString()
        });
    } catch (ignore) {
        console.error(ignore);
    }
};

export default {
    sendErrorResponse
};
