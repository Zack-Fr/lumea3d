import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: any;
  validationErrors?: Array<{
    field: string;
    value: any;
    constraints: string[];
  }>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerError';
    let details: any = undefined;
    let validationErrors: any = undefined;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.constructor.name;
        
        // Handle validation errors from class-validator
        if (responseObj.message && Array.isArray(responseObj.message)) {
          validationErrors = this.formatValidationErrors(responseObj.message);
          message = 'Validation failed';
        }
      } else {
        message = exceptionResponse as string;
        error = exception.constructor.name;
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      status = this.getPrismaErrorStatus(exception.code);
      message = this.getPrismaErrorMessage(exception);
      error = 'DatabaseError';
      details = {
        code: exception.code,
        meta: exception.meta,
      };
    } else if (exception instanceof PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided to database operation';
      error = 'ValidationError';
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.constructor.name;
      
      // Handle specific 3D asset errors
      if (exception.message.includes('GLB')) {
        status = HttpStatus.BAD_REQUEST;
        error = 'InvalidAssetFormat';
        message = 'Invalid GLB file format or corrupted 3D asset';
      } else if (exception.message.includes('texture')) {
        status = HttpStatus.BAD_REQUEST;
        error = 'InvalidTextureFormat';
        message = 'Invalid texture format or unsupported image type';
      } else if (exception.message.includes('transform')) {
        status = HttpStatus.BAD_REQUEST;
        error = 'InvalidTransform';
        message = 'Invalid 3D transform values (position, rotation, or scale)';
      }
    }

    // Log the error for debugging
    this.logger.error(
      `${request.method} ${request.url} - ${status} ${error}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Create consistent error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (details) {
      errorResponse.details = details;
    }

    if (validationErrors) {
      errorResponse.validationErrors = validationErrors;
    }

    response.status(status).json(errorResponse);
  }

  private formatValidationErrors(errors: any[]): Array<{
    field: string;
    value: any;
    constraints: string[];
  }> {
    const formatted: Array<{
      field: string;
      value: any;
      constraints: string[];
    }> = [];

    const processError = (error: any, parentField = '') => {
      if (error.property) {
        const field = parentField ? `${parentField}.${error.property}` : error.property;
        
        if (error.constraints) {
          formatted.push({
            field,
            value: error.value,
            constraints: Object.values(error.constraints),
          });
        }

        // Handle nested validation errors
        if (error.children && error.children.length > 0) {
          error.children.forEach((child: any) => processError(child, field));
        }
      }
    };

    errors.forEach((error) => processError(error));
    return formatted;
  }

  private getPrismaErrorStatus(code: string): HttpStatus {
    switch (code) {
      case 'P2002': // Unique constraint violation
        return HttpStatus.CONFLICT;
      case 'P2025': // Record not found
        return HttpStatus.NOT_FOUND;
      case 'P2003': // Foreign key constraint violation
        return HttpStatus.BAD_REQUEST;
      case 'P2004': // Constraint violation
        return HttpStatus.BAD_REQUEST;
      case 'P2011': // Null constraint violation
        return HttpStatus.BAD_REQUEST;
      case 'P2012': // Missing required value
        return HttpStatus.BAD_REQUEST;
      case 'P2013': // Missing required argument
        return HttpStatus.BAD_REQUEST;
      case 'P2014': // Invalid ID
        return HttpStatus.BAD_REQUEST;
      case 'P2015': // Record not found
        return HttpStatus.NOT_FOUND;
      case 'P2016': // Query interpretation error
        return HttpStatus.BAD_REQUEST;
      case 'P2017': // Records for relation not connected
        return HttpStatus.BAD_REQUEST;
      case 'P2018': // Required connected records not found
        return HttpStatus.BAD_REQUEST;
      case 'P2019': // Input error
        return HttpStatus.BAD_REQUEST;
      case 'P2020': // Value out of range
        return HttpStatus.BAD_REQUEST;
      case 'P2021': // Table does not exist
        return HttpStatus.INTERNAL_SERVER_ERROR;
      case 'P2022': // Column does not exist
        return HttpStatus.INTERNAL_SERVER_ERROR;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private getPrismaErrorMessage(exception: PrismaClientKnownRequestError): string {
    switch (exception.code) {
      case 'P2002':
        const field = exception.meta?.target as string[];
        return `A record with this ${field?.[0] || 'value'} already exists`;
      case 'P2025':
        return 'Record not found or has been deleted';
      case 'P2003':
        return 'Invalid reference to related record';
      case 'P2004':
        return 'Database constraint violation';
      case 'P2011':
        return 'Required field cannot be null';
      case 'P2012':
        return 'Missing required value';
      case 'P2013':
        return 'Missing required field in request';
      case 'P2014':
        return 'Invalid ID format';
      case 'P2015':
        return 'Related record not found';
      case 'P2016':
        return 'Invalid query parameters';
      case 'P2017':
        return 'Records are not properly connected';
      case 'P2018':
        return 'Required related records not found';
      case 'P2019':
        return 'Invalid input data';
      case 'P2020':
        return 'Value exceeds allowed range';
      case 'P2021':
        return 'Database table does not exist';
      case 'P2022':
        return 'Database column does not exist';
      default:
        return exception.message || 'Database operation failed';
    }
  }
}