# Logger Usage Guide

## Quick Start

```typescript
import { logger } from './utils/logger';

// Instead of console.log
logger.info('User signed in successfully');

// Instead of console.error
logger.error('Failed to fetch events', error);

// Instead of console.warn
logger.warn('API deprecated, use new endpoint');

// Instead of console.debug
logger.debug('User metadata:', user.metadata);
```

## Log Levels

### `logger.debug()` - Detailed diagnostic information
Use for debugging specific values, tracking flow, etc.
```typescript
logger.debug('Auth callback params:', params);
logger.debug('Session found:', session.user.email);
```

### `logger.info()` - General informational messages
Use for user actions, API calls, navigation events.
```typescript
logger.info('User navigated to profile page');
logger.info('Fetching events for city:', cityName);
```

### `logger.warn()` - Potentially harmful situations
Use for deprecated APIs, recoverable errors, unexpected situations.
```typescript
logger.warn('Unable to open URL, falling back to default');
logger.warn('API response took longer than expected');
```

### `logger.error()` - Error events
Use for exceptions, failed operations, critical issues.
**Note:** Errors are logged even in production (but sanitized).
```typescript
logger.error('Sign in failed:', error);
logger.error('Failed to sync metadata to profile:', updateError);
```

## Advanced Features

### Grouped Logs
```typescript
logger.group('Auth Callback Debug');
logger.debug('Params:', params);
logger.debug('Session:', session);
logger.groupEnd();
```

### Performance Timing
```typescript
logger.time('fetch-events');
await fetchEvents();
logger.timeEnd('fetch-events'); // Logs: "fetch-events: 234ms"
```

### Tables (for arrays)
```typescript
logger.table(events); // Nice table view of array data
```

### Scoped Loggers
Create a logger for a specific module:
```typescript
import { createScopedLogger } from './utils/logger';

const authLogger = createScopedLogger('Auth');
authLogger.info('User signed in'); // [FindLocal:Auth] [INFO] User signed in
```

## Environment Behavior

### Development (`npm start`)
- ✅ All logs shown with timestamps and prefixes
- ✅ Full error details including stack traces
- ✅ Grouping, tables, and timing work

### Production (deployed)
- ❌ Debug, info, warn logs suppressed
- ✅ Errors still logged (but sanitized)
- ⚡ Better performance
- 🔒 No sensitive data leaks

## Migration from console.log

### Before
```typescript
console.log('Auth callback initialized with params:', params);
console.log('Session found:', session.user.email);
console.error('Auth callback error:', error);
```

### After
```typescript
logger.debug('Auth callback initialized with params:', params);
logger.info('Session found:', session.user.email);
logger.error('Auth callback error:', error);
```

## Best Practices

1. **Use appropriate log levels**
   - Don't use `error` for non-errors
   - Don't use `debug` for important user actions

2. **Include context**
   ```typescript
   // ❌ Bad
   logger.error('Failed');
   
   // ✅ Good
   logger.error('Failed to sign in user', { email, error });
   ```

3. **Avoid logging sensitive data**
   ```typescript
   // ❌ Bad
   logger.debug('User password:', password);
   
   // ✅ Good
   logger.debug('User authentication attempt', { email });
   ```

4. **Use consistent formatting**
   ```typescript
   // ✅ Good pattern
   logger.info('Action completed successfully');
   logger.error('Action failed:', error);
   ```

## Configuration

To enable debug logs in production (testing only), add to `app.json`:
```json
{
  "expo": {
    "extra": {
      "enableDebugLogs": true
    }
  }
}
```
