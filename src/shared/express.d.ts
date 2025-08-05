/**
 * Express.js type augmentation for authentication support.
 * 
 * This declaration file extends the Express Request interface to include
 * an optional 'user' property, enabling type-safe access to authenticated
 * user data throughout the application.
 * 
 * Usage:
 * - Middleware can set req.user after successful authentication
 * - Controllers can access req.user with full TypeScript support
 * - Provides IntelliSense and compile-time type checking
 * 
 * @example
 * ```typescript
 * // In a controller
 * const username = req.user?.username; // Type-safe access
 * const userId = req.user?.id;         // IntelliSense works
 * ```
 */
import { User } from '@domain/entities/auth';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
