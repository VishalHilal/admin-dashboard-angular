import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  address?: string;
  joinDate: string;
  orders: number;
  lastLogin?: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private tokenKey = 'auth_token';
  
  // Authentication state
  private authStateSubject = new BehaviorSubject<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false
  });
  
  authState$ = this.authStateSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check for existing token on initialization
    this.initializeAuth();
  }

  private initializeAuth() {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      this.validateToken(token);
    }
  }

  private validateToken(token: string) {
    this.http.get<LoginResponse>(`${this.apiUrl}/profile`).subscribe({
      next: (response) => {
        this.setAuthState(response.user, token);
      },
      error: () => {
        // Token is invalid, clear it
        this.logout();
      }
    });
  }

  private setAuthState(user: User, token: string) {
    const state: AuthState = {
      user,
      token,
      isAuthenticated: true,
      isLoading: false
    };
    
    this.authStateSubject.next(state);
    localStorage.setItem(this.tokenKey, token);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    this.setLoading(true);
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => {
        this.setAuthState(response.user, response.token);
      })
    );
  }

  logout() {
    const state: AuthState = {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false
    };
    
    this.authStateSubject.next(state);
    localStorage.removeItem(this.tokenKey);
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/change-password`, {
      currentPassword,
      newPassword
    });
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile`);
  }

  getToken(): string | null {
    return this.authStateSubject.value.token;
  }

  getCurrentUser(): User | null {
    return this.authStateSubject.value.user;
  }

  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  isManager(): boolean {
    return this.hasRole('manager');
  }

  isUser(): boolean {
    return this.hasRole('user');
  }

  canAccessAdminFeatures(): boolean {
    return this.hasAnyRole(['admin', 'manager']);
  }

  private setLoading(isLoading: boolean) {
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({
      ...currentState,
      isLoading
    });
  }
}
