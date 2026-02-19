import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

interface User {
  _id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  phone?: string;
  address?: string;
  joinDate: string;
  orders: number;
}

interface Notification {
  _id: string;
  type: string;
  message: string;
  time: string;
  read: boolean;
}

interface Stats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  activeUsers: number;
}

interface Activity {
  _id: string;
  description: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:3000/api';
  private socket: Socket;
  
  // Real-time data subjects
  private usersSubject = new BehaviorSubject<User[]>([]);
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private statsSubject = new BehaviorSubject<Stats>({});
  private activitiesSubject = new BehaviorSubject<string[]>([]);
  
  // Observable streams
  users$ = this.usersSubject.asObservable();
  notifications$ = this.notificationsSubject.asObservable();
  stats$ = this.statsSubject.asObservable();
  activities$ = this.activitiesSubject.asObservable();
  
  constructor(private http: HttpClient) {
    this.initSocket();
  }
  
  private initSocket() {
    this.socket = io('http://localhost:3000');
    
    // Listen for real-time updates
    this.socket.on('userAdded', (user: User) => {
      const currentUsers = this.usersSubject.value;
      this.usersSubject.next([...currentUsers, user]);
    });
    
    this.socket.on('userUpdated', (user: User) => {
      const currentUsers = this.usersSubject.value;
      const index = currentUsers.findIndex(u => u._id === user._id);
      if (index !== -1) {
        currentUsers[index] = user;
        this.usersSubject.next([...currentUsers]);
      }
    });
    
    this.socket.on('userDeleted', (data: { id: string }) => {
      const currentUsers = this.usersSubject.value;
      this.usersSubject.next(currentUsers.filter(u => u._id !== data.id));
    });
    
    this.socket.on('newNotification', (notification: Notification) => {
      const currentNotifications = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...currentNotifications]);
    });
    
    this.socket.on('notificationRead', (notification: Notification) => {
      const currentNotifications = this.notificationsSubject.value;
      const index = currentNotifications.findIndex(n => n._id === notification._id);
      if (index !== -1) {
        currentNotifications[index] = notification;
        this.notificationsSubject.next([...currentNotifications]);
      }
    });
    
    this.socket.on('newActivity', (activity: Activity) => {
      const currentActivities = this.activitiesSubject.value;
      this.activitiesSubject.next([activity.description, ...currentActivities.slice(0, 9)]);
    });
    
    this.socket.on('orderUpdate', (data: { userId: string; newOrderCount: number; message: string }) => {
      // Update user order count
      const currentUsers = this.usersSubject.value;
      const index = currentUsers.findIndex(u => u._id === data.userId);
      if (index !== -1) {
        currentUsers[index].orders = data.newOrderCount;
        this.usersSubject.next([...currentUsers]);
      }
      
      // Update stats
      this.loadStats();
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }
  
  // API Methods
  getStats(): Observable<Stats> {
    return this.http.get<Stats>(`${this.apiUrl}/stats`);
  }
  
  loadStats() {
    this.getStats().subscribe(stats => {
      this.statsSubject.next(stats);
    });
  }
  
  getUsers(search?: string, status?: string): Observable<User[]> {
    const params: any = {};
    if (search) params['search'] = search;
    if (status) params['status'] = status;
    
    return this.http.get<User[]>(`${this.apiUrl}/users`, { params });
  }
  
  loadUsers(search?: string, status?: string) {
    this.getUsers(search, status).subscribe(users => {
      this.usersSubject.next(users);
    });
  }
  
  createUser(user: Partial<User>): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, user);
  }
  
  updateUser(id: string, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, user);
  }
  
  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`);
  }
  
  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/notifications`);
  }
  
  loadNotifications() {
    this.getNotifications().subscribe(notifications => {
      this.notificationsSubject.next(notifications);
    });
  }
  
  createNotification(notification: Partial<Notification>): Observable<Notification> {
    return this.http.post<Notification>(`${this.apiUrl}/notifications`, notification);
  }
  
  markNotificationAsRead(id: string): Observable<Notification> {
    return this.http.put<Notification>(`${this.apiUrl}/notifications/${id}/read`, {});
  }
  
  getRevenue(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/revenue`);
  }
  
  getActivities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/activities`);
  }
  
  loadActivities() {
    this.getActivities().subscribe(activities => {
      this.activitiesSubject.next(activities);
    });
  }
  
  seedDatabase(): Observable<any> {
    return this.http.post(`${this.apiUrl}/seed`, {});
  }
  
  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
