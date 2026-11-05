import { ApiResponse } from '../../utils/ApiResponse.js';

import {
  SERVICE_NAME,
  SERVICE_VERSION
} from '../../utils/constants.js';

export const healthController = (req, res) => {
  const response = ApiResponse.success(
    {
      service: SERVICE_NAME,
      status: 'healthy',
      timestamp: new Date().toISOString()
    },
    'AI service is running.'
  );

  return res.status(response.statusCode).json(response.toJSON());
};

export const readinessController = (req, res) => {
  const response = ApiResponse.success(
    {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      status: 'ready',
      checks: {
        application: 'ok',
        configuration: 'loaded'
      },
      timestamp: new Date().toISOString()
    },
    'AI service is ready.'
  );

  return res.status(response.statusCode).json(response.toJSON());
};