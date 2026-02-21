import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { Observable } from 'rxjs';

// Functional interceptor for Angular 15+
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  // Get token from localStorage since we can't inject AuthService here
  const token = localStorage.getItem('auth_token');
  
  // Don't add token to login/register requests
  const authUrls = ['/api/auth/login', '/api/auth/register'];
  const requiresAuth = !authUrls.some(url => req.url.includes(url));
  
  if (token && requiresAuth) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }

  return next(req);
};
