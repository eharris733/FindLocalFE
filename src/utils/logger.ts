/**
 * Global logging utility for FindLocal
 * 
 * Logs are only shown in development environments to:
 * 1. Improve performance in production
 * 2. Prevent sensitive information leakage
 * 3. Keep production console clean
 * 
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   
 *   logger.debug('Detailed debug info', { userId: 123 });
 *   logger.info('General information');
 *   logger.warn('Warning message');
 *   logger.error('Error occurred', error);
 */

import Constants from 'expo-constants';

// Determine if we're in development mode
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

// Optional: You can also check for specific debug flags
const isDebugEnabled = isDevelopment || Constants.expoConfig?.extra?.enableDebugLogs === true;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  prefix?: string;
  showTimestamp?: boolean;
  minLevel?: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private readonly config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enabled: isDebugEnabled,
      prefix: '[FindLocal]',
      showTimestamp: true,
      minLevel: 'debug',
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    
    const currentLevelValue = LOG_LEVELS[level];
    const minLevelValue = LOG_LEVELS[this.config.minLevel || 'debug'];
    
    return currentLevelValue >= minLevelValue;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = [];
    
    if (this.config.prefix) {
      parts.push(this.config.prefix);
    }
    
    if (this.config.showTimestamp) {
      const time = new Date().toLocaleTimeString();
      parts.push(`[${time}]`);
    }
    
    parts.push(`[${level.toUpperCase()}]`, message);
    
    return parts.join(' ');
  }

  /**
   * Debug level - for detailed diagnostic information
   * Use for: debugging specific values, flow tracking, etc.
   */
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  /**
   * Info level - for general informational messages
   * Use for: user actions, API calls, navigation events
   */
  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  /**
   * Warning level - for potentially harmful situations
   * Use for: deprecated API usage, recoverable errors, unexpected but handled situations
   */
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  /**
   * Error level - for error events
   * Use for: exceptions, failed operations, critical issues
   * Note: Errors are logged even in production (but sanitized)
   */
  error(message: string, ...args: any[]): void {
    // Always log errors, but sanitize sensitive data in production
    if (this.config.enabled) {
      console.error(this.formatMessage('error', message), ...args);
    } else {
      // In production, log only the message without potentially sensitive args
      console.error(this.formatMessage('error', message));
    }
  }

  /**
   * Group related logs together (collapsed by default)
   */
  group(label: string, collapsed: boolean = true): void {
    if (this.shouldLog('debug')) {
      if (collapsed) {
        console.groupCollapsed(this.formatMessage('debug', label));
      } else {
        console.group(this.formatMessage('debug', label));
      }
    }
  }

  /**
   * End a log group
   */
  groupEnd(): void {
    if (this.shouldLog('debug')) {
      console.groupEnd();
    }
  }

  /**
   * Log a table (useful for arrays of objects)
   */
  table(data: any): void {
    if (this.shouldLog('debug')) {
      console.table(data);
    }
  }

  /**
   * Start a timer
   */
  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(this.formatMessage('debug', label));
    }
  }

  /**
   * End a timer and log the duration
   */
  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(this.formatMessage('debug', label));
    }
  }
}

// Create and export the default logger instance
export const logger = new Logger();

// Export the Logger class for creating custom loggers
export { Logger };

// Utility function to create a scoped logger with a specific prefix
export function createScopedLogger(scope: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger({
    ...config,
    prefix: `[FindLocal:${scope}]`,
  });
}
