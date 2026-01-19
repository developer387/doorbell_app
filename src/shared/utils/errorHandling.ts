/**
 * Comprehensive error handling utilities for the video request flow
 */

export interface ErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  category: 'network' | 'validation' | 'permission' | 'storage' | 'database' | 'system';
}

export class VideoRequestError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly retryable: boolean;
  public readonly category: string;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'VideoRequestError';
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.retryable = details.retryable;
    this.category = details.category;
  }
}

/**
 * Property lookup error handling
 */
export class PropertyLookupErrorHandler {
  static handleError(error: any): VideoRequestError {
    console.error('Property lookup error:', error);

    // Network-related errors
    if (error.code === 'unavailable' || error.message?.includes('network')) {
      return new VideoRequestError({
        code: 'PROPERTY_NETWORK_ERROR',
        message: `Network error during property lookup: ${error.message}`,
        userMessage: 'Network connection issue. Please check your internet connection and try again.',
        retryable: true,
        category: 'network'
      });
    }

    // Permission errors
    if (error.code === 'permission-denied') {
      return new VideoRequestError({
        code: 'PROPERTY_PERMISSION_DENIED',
        message: `Permission denied for property lookup: ${error.message}`,
        userMessage: 'Access denied. This QR code may be invalid or expired.',
        retryable: false,
        category: 'permission'
      });
    }

    // Not found errors
    if (error.code === 'not-found' || error.message?.includes('not found')) {
      return new VideoRequestError({
        code: 'PROPERTY_NOT_FOUND',
        message: `Property not found: ${error.message}`,
        userMessage: 'Property not found. Please verify the QR code and try again.',
        retryable: false,
        category: 'validation'
      });
    }

    // Invalid QR code format
    if (error.message?.includes('Invalid') || error.message?.includes('format')) {
      return new VideoRequestError({
        code: 'INVALID_QR_CODE',
        message: `Invalid QR code format: ${error.message}`,
        userMessage: 'Invalid QR code format. Please scan a valid property QR code.',
        retryable: false,
        category: 'validation'
      });
    }

    // Generic property lookup error
    return new VideoRequestError({
      code: 'PROPERTY_LOOKUP_FAILED',
      message: `Property lookup failed: ${error.message || 'Unknown error'}`,
      userMessage: 'Failed to load property information. Please try scanning the QR code again.',
      retryable: true,
      category: 'system'
    });
  }
}

/**
 * Video upload error handling
 */
export class VideoUploadErrorHandler {
  static handleError(error: any): VideoRequestError {
    console.error('Video upload error:', error);

    // Storage-specific errors
    if (error.code === 'storage/unauthorized') {
      return new VideoRequestError({
        code: 'UPLOAD_UNAUTHORIZED',
        message: `Upload permission denied: ${error.message}`,
        userMessage: 'Upload permission denied. Please check your connection and try again.',
        retryable: true,
        category: 'permission'
      });
    }

    if (error.code === 'storage/quota-exceeded') {
      return new VideoRequestError({
        code: 'UPLOAD_QUOTA_EXCEEDED',
        message: `Storage quota exceeded: ${error.message}`,
        userMessage: 'Storage quota exceeded. Please contact support for assistance.',
        retryable: false,
        category: 'storage'
      });
    }

    if (error.code === 'storage/retry-limit-exceeded') {
      return new VideoRequestError({
        code: 'UPLOAD_RETRY_LIMIT',
        message: `Upload retry limit exceeded: ${error.message}`,
        userMessage: 'Upload failed after multiple attempts. Please check your connection and try again.',
        retryable: true,
        category: 'network'
      });
    }

    if (error.code === 'storage/invalid-format') {
      return new VideoRequestError({
        code: 'UPLOAD_INVALID_FORMAT',
        message: `Invalid video format: ${error.message}`,
        userMessage: 'Invalid video format. Please record a new video.',
        retryable: false,
        category: 'validation'
      });
    }

    // Network-related upload errors
    if (error.message?.includes('network') || error.code === 'storage/unknown') {
      return new VideoRequestError({
        code: 'UPLOAD_NETWORK_ERROR',
        message: `Network error during upload: ${error.message}`,
        userMessage: 'Network error during upload. Please check your connection and try again.',
        retryable: true,
        category: 'network'
      });
    }

    // Generic upload error
    return new VideoRequestError({
      code: 'UPLOAD_FAILED',
      message: `Video upload failed: ${error.message || 'Unknown error'}`,
      userMessage: 'Failed to upload video. Please try recording again.',
      retryable: true,
      category: 'storage'
    });
  }
}

/**
 * Database operation error handling
 */
export class DatabaseErrorHandler {
  static handleError(error: any, operation: string): VideoRequestError {
    console.error(`Database error during ${operation}:`, error);

    // Permission errors
    if (error.code === 'permission-denied') {
      return new VideoRequestError({
        code: 'DB_PERMISSION_DENIED',
        message: `Permission denied for ${operation}: ${error.message}`,
        userMessage: 'Permission denied. The property may not allow guest requests.',
        retryable: false,
        category: 'permission'
      });
    }

    // Not found errors
    if (error.code === 'not-found') {
      return new VideoRequestError({
        code: 'DB_NOT_FOUND',
        message: `Document not found during ${operation}: ${error.message}`,
        userMessage: 'Property not found. Please scan the QR code again.',
        retryable: false,
        category: 'validation'
      });
    }

    // Service unavailable
    if (error.code === 'unavailable') {
      return new VideoRequestError({
        code: 'DB_UNAVAILABLE',
        message: `Database unavailable during ${operation}: ${error.message}`,
        userMessage: 'Service temporarily unavailable. Please try again in a moment.',
        retryable: true,
        category: 'network'
      });
    }

    // Network errors
    if (error.message?.includes('network') || error.code === 'deadline-exceeded') {
      return new VideoRequestError({
        code: 'DB_NETWORK_ERROR',
        message: `Network error during ${operation}: ${error.message}`,
        userMessage: 'Network error. Please check your connection and try again.',
        retryable: true,
        category: 'network'
      });
    }

    // Generic database error
    return new VideoRequestError({
      code: 'DB_OPERATION_FAILED',
      message: `Database operation ${operation} failed: ${error.message || 'Unknown error'}`,
      userMessage: 'Database operation failed. Please try again.',
      retryable: true,
      category: 'database'
    });
  }
}

/**
 * Input validation utilities
 */
export class ValidationUtils {
  /**
   * Validate guest request data before creation
   */
  static validateGuestRequestData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    const requiredFields = ['guestId', 'propertyId', 'propertyDocId', 'propertyName', 'timestamp', 'status', 'userId', 'videoUrl'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Type validation
    if (data.guestId && typeof data.guestId !== 'string') {
      errors.push('Guest ID must be a string');
    }

    if (data.propertyDocId && typeof data.propertyDocId !== 'string') {
      errors.push('Property document ID must be a string');
    }

    if (data.timestamp && !this.isValidISODate(data.timestamp)) {
      errors.push('Timestamp must be a valid ISO date string');
    }

    if (data.status && !['pending', 'accepted', 'declined'].includes(data.status)) {
      errors.push('Status must be one of: pending, accepted, declined');
    }

    if (data.videoUrl && !this.isValidUrl(data.videoUrl)) {
      errors.push('Video URL must be a valid HTTPS URL');
    }

    // Business logic validation
    if (data.guestId && data.guestId.length < 8) {
      errors.push('Guest ID must be at least 8 characters long');
    }

    if (data.propertyDocId && (data.propertyDocId.length < 20 || !/^[a-zA-Z0-9]+$/.test(data.propertyDocId))) {
      errors.push('Property document ID format appears invalid');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate property document ID format
   */
  static validatePropertyDocumentId(docId: any): { isValid: boolean; error?: string } {
    if (!docId) {
      return { isValid: false, error: 'Property document ID is required' };
    }

    if (typeof docId !== 'string') {
      return { isValid: false, error: 'Property document ID must be a string' };
    }

    if (docId.trim().length === 0) {
      return { isValid: false, error: 'Property document ID cannot be empty' };
    }

    if (docId.length < 20 || !/^[a-zA-Z0-9]+$/.test(docId)) {
      return { isValid: false, error: 'Property document ID format appears invalid' };
    }

    return { isValid: true };
  }

  /**
   * Validate video blob before upload
   */
  static validateVideoBlob(blob: Blob): { isValid: boolean; error?: string } {
    if (!blob) {
      return { isValid: false, error: 'Video blob is required' };
    }

    if (blob.size === 0) {
      return { isValid: false, error: 'Video recording is empty' };
    }

    // Check for reasonable file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (blob.size > maxSize) {
      return { isValid: false, error: 'Video file is too large (max 50MB)' };
    }

    // Check MIME type
    if (!blob.type.startsWith('video/')) {
      return { isValid: false, error: 'Invalid video format' };
    }

    return { isValid: true };
  }

  /**
   * Validate guest ID format and content
   */
  static validateGuestId(guestId: any): { isValid: boolean; error?: string } {
    if (!guestId) {
      return { isValid: false, error: 'Guest ID is required' };
    }

    if (typeof guestId !== 'string') {
      return { isValid: false, error: 'Guest ID must be a string' };
    }

    const trimmedId = guestId.trim();
    if (trimmedId.length === 0) {
      return { isValid: false, error: 'Guest ID cannot be empty' };
    }

    if (trimmedId.length < 8) {
      return { isValid: false, error: 'Guest ID must be at least 8 characters long' };
    }

    if (!/^\d+$/.test(trimmedId)) {
      return { isValid: false, error: 'Guest ID must contain only numbers' };
    }

    return { isValid: true };
  }

  /**
   * Validate user ID (property owner)
   */
  static validateUserId(userId: any): { isValid: boolean; error?: string } {
    if (!userId) {
      return { isValid: false, error: 'User ID is required' };
    }

    if (typeof userId !== 'string') {
      return { isValid: false, error: 'User ID must be a string' };
    }

    if (userId.trim().length === 0) {
      return { isValid: false, error: 'User ID cannot be empty' };
    }

    return { isValid: true };
  }

  /**
   * Validate property name
   */
  static validatePropertyName(propertyName: any): { isValid: boolean; error?: string } {
    if (!propertyName) {
      return { isValid: false, error: 'Property name is required' };
    }

    if (typeof propertyName !== 'string') {
      return { isValid: false, error: 'Property name must be a string' };
    }

    const trimmedName = propertyName.trim();
    if (trimmedName.length === 0) {
      return { isValid: false, error: 'Property name cannot be empty' };
    }

    if (trimmedName.length > 100) {
      return { isValid: false, error: 'Property name cannot exceed 100 characters' };
    }

    return { isValid: true };
  }

  /**
   * Validate QR code UUID format
   */
  static validateQRCodeUUID(uuid: any): { isValid: boolean; error?: string } {
    if (!uuid) {
      return { isValid: false, error: 'QR code UUID is required' };
    }

    if (typeof uuid !== 'string') {
      return { isValid: false, error: 'QR code UUID must be a string' };
    }

    const trimmedUuid = uuid.trim();
    if (trimmedUuid.length === 0) {
      return { isValid: false, error: 'QR code UUID cannot be empty' };
    }

    // Allow both UUID format and URL format
    const isUrl = trimmedUuid.includes('doorbell.guestregistration.com');
    const isUuid = /^[a-f0-9-]{36}$/i.test(trimmedUuid);
    
    if (!isUrl && !isUuid && trimmedUuid.length < 10) {
      return { isValid: false, error: 'QR code UUID format appears invalid' };
    }

    return { isValid: true };
  }

  /**
   * Sanitize string input to prevent injection attacks
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes that could break JSON
      .substring(0, 1000); // Limit length to prevent abuse
  }

  /**
   * Validate and sanitize request status
   */
  static validateRequestStatus(status: any): { isValid: boolean; sanitizedStatus?: string; error?: string } {
    if (!status) {
      return { isValid: false, error: 'Request status is required' };
    }

    if (typeof status !== 'string') {
      return { isValid: false, error: 'Request status must be a string' };
    }

    const sanitizedStatus = status.trim().toLowerCase();
    const validStatuses = ['pending', 'accepted', 'declined'];

    if (!validStatuses.includes(sanitizedStatus)) {
      return { 
        isValid: false, 
        error: `Request status must be one of: ${validStatuses.join(', ')}` 
      };
    }

    return { isValid: true, sanitizedStatus };
  }

  /**
   * Comprehensive validation for all request creation inputs
   */
  static validateRequestCreationInputs(inputs: {
    guestId: any;
    propertyDocId: any;
    propertyName: any;
    userId: any;
    videoUrl: any;
    videoBlob?: Blob;
  }): { isValid: boolean; errors: string[]; sanitizedInputs?: any } {
    const errors: string[] = [];
    const sanitizedInputs: any = {};

    // Validate guest ID
    const guestIdValidation = this.validateGuestId(inputs.guestId);
    if (!guestIdValidation.isValid) {
      errors.push(guestIdValidation.error!);
    } else {
      sanitizedInputs.guestId = inputs.guestId.trim();
    }

    // Validate property document ID
    const propertyDocIdValidation = this.validatePropertyDocumentId(inputs.propertyDocId);
    if (!propertyDocIdValidation.isValid) {
      errors.push(propertyDocIdValidation.error!);
    } else {
      sanitizedInputs.propertyDocId = inputs.propertyDocId.trim();
    }

    // Validate property name
    const propertyNameValidation = this.validatePropertyName(inputs.propertyName);
    if (!propertyNameValidation.isValid) {
      errors.push(propertyNameValidation.error!);
    } else {
      sanitizedInputs.propertyName = this.sanitizeString(inputs.propertyName);
    }

    // Validate user ID
    const userIdValidation = this.validateUserId(inputs.userId);
    if (!userIdValidation.isValid) {
      errors.push(userIdValidation.error!);
    } else {
      sanitizedInputs.userId = inputs.userId.trim();
    }

    // Validate video URL
    if (inputs.videoUrl && !this.isValidUrl(inputs.videoUrl)) {
      errors.push('Video URL must be a valid HTTPS URL');
    } else if (inputs.videoUrl) {
      sanitizedInputs.videoUrl = inputs.videoUrl.trim();
    }

    // Validate video blob if provided
    if (inputs.videoBlob) {
      const blobValidation = this.validateVideoBlob(inputs.videoBlob);
      if (!blobValidation.isValid) {
        errors.push(blobValidation.error!);
      }
    }

    // Additional cross-field validation
    if (sanitizedInputs.guestId && sanitizedInputs.propertyDocId) {
      // Ensure guest ID and property doc ID are different (basic sanity check)
      if (sanitizedInputs.guestId === sanitizedInputs.propertyDocId) {
        errors.push('Guest ID cannot be the same as property document ID');
      }
    }

    // Validate that we have either a video blob or video URL (but not both initially)
    if (!inputs.videoBlob && !inputs.videoUrl) {
      errors.push('Either video blob or video URL must be provided');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedInputs: errors.length === 0 ? sanitizedInputs : undefined
    };
  }

  /**
   * Validate timestamp format and ensure it's not in the future
   */
  static validateTimestamp(timestamp: any): { isValid: boolean; error?: string } {
    if (!timestamp) {
      return { isValid: false, error: 'Timestamp is required' };
    }

    if (typeof timestamp !== 'string') {
      return { isValid: false, error: 'Timestamp must be a string' };
    }

    if (!this.isValidISODate(timestamp)) {
      return { isValid: false, error: 'Timestamp must be a valid ISO date string' };
    }

    const date = new Date(timestamp);
    const now = new Date();
    
    // Allow some tolerance for clock differences (5 minutes)
    const tolerance = 5 * 60 * 1000; // 5 minutes in milliseconds
    if (date.getTime() > now.getTime() + tolerance) {
      return { isValid: false, error: 'Timestamp cannot be in the future' };
    }

    // Ensure timestamp is not too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (now.getTime() - date.getTime() > maxAge) {
      return { isValid: false, error: 'Timestamp is too old (max 24 hours)' };
    }

    return { isValid: true };
  }

  /**
   * Validate video file extension and MIME type consistency
   */
  static validateVideoFormat(blob: Blob, expectedExtension?: string): { isValid: boolean; error?: string } {
    if (!blob) {
      return { isValid: false, error: 'Video blob is required' };
    }

    const supportedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!supportedTypes.includes(blob.type)) {
      return { 
        isValid: false, 
        error: `Unsupported video format: ${blob.type}. Supported formats: ${supportedTypes.join(', ')}` 
      };
    }

    // If expected extension is provided, validate consistency
    if (expectedExtension) {
      const typeExtensionMap: Record<string, string[]> = {
        'video/mp4': ['mp4'],
        'video/webm': ['webm'],
        'video/ogg': ['ogg']
      };

      const validExtensions = typeExtensionMap[blob.type] || [];
      if (!validExtensions.includes(expectedExtension.toLowerCase())) {
        return { 
          isValid: false, 
          error: `File extension ${expectedExtension} does not match MIME type ${blob.type}` 
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate that required environment variables or configuration is present
   */
  static validateSystemConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if Firebase is properly configured (basic check)
    if (typeof window !== 'undefined') {
      // Web environment checks
      if (!navigator.mediaDevices) {
        errors.push('Media devices API not available - camera recording may not work');
      }

      if (!window.MediaRecorder) {
        errors.push('MediaRecorder API not available - video recording may not work');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate network connectivity before attempting operations
   */
  static async validateNetworkConnectivity(): Promise<{ isValid: boolean; error?: string }> {
    if (typeof window !== 'undefined' && 'navigator' in window) {
      // Check online status
      if (!navigator.onLine) {
        return { isValid: false, error: 'No internet connection detected' };
      }

      // Perform a simple connectivity test
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return { isValid: true };
      } catch (error) {
        return { isValid: false, error: 'Network connectivity test failed' };
      }
    }

    // For non-web environments, assume connectivity is available
    return { isValid: true };
  }

  /**
   * Comprehensive pre-flight validation before request creation
   */
  static async validatePreFlightChecks(inputs: {
    guestId: any;
    propertyDocId: any;
    propertyName: any;
    userId: any;
    videoBlob?: Blob;
    checkNetwork?: boolean;
  }): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic input validation
    const inputValidation = this.validateRequestCreationInputs({
      ...inputs,
      videoUrl: '' // Will be set after upload
    });

    if (!inputValidation.isValid) {
      errors.push(...inputValidation.errors);
    }

    // System configuration validation
    const systemValidation = this.validateSystemConfiguration();
    if (!systemValidation.isValid) {
      warnings.push(...systemValidation.errors);
    }

    // Network connectivity validation (if requested)
    if (inputs.checkNetwork) {
      try {
        const networkValidation = await this.validateNetworkConnectivity();
        if (!networkValidation.isValid) {
          errors.push(networkValidation.error!);
        }
      } catch (error) {
        warnings.push('Could not verify network connectivity');
      }
    }

    // Video format validation (if blob provided)
    if (inputs.videoBlob) {
      const formatValidation = this.validateVideoFormat(inputs.videoBlob);
      if (!formatValidation.isValid) {
        errors.push(formatValidation.error!);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static isValidISODate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString();
  }

  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

/**
 * Retry logic utilities
 */
export class RetryUtils {
  /**
   * Execute a function with exponential backoff retry logic
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelay?: number;
      maxDelay?: number;
      retryCondition?: (error: any) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      retryCondition = (error) => error instanceof VideoRequestError && error.retryable
    } = options;

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on last attempt or if error is not retryable
        if (attempt === maxAttempts || !retryCondition(error)) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

/**
 * Error logging utilities
 */
export class ErrorLogger {
  /**
   * Log error with context information
   */
  static logError(error: any, context: {
    operation: string;
    userId?: string;
    propertyId?: string;
    guestId?: string;
    additionalData?: Record<string, any>;
  }): void {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      context
    };

    console.error('Video Request Flow Error:', logData);

    // In a production environment, you might want to send this to a logging service
    // Example: sendToLoggingService(logData);
  }
}