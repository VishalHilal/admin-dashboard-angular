import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  
  totalUsers: number = 0;
  totalOrders: number = 0;
  totalRevenue: number = 0;
  activeUsers: number = 0;
  
  recentActivities: string[] = [];
  
  ngOnInit() {
    this.loadDashboardData();
  }
  
  loadDashboardData() {
    // Simulate loading dashboard data
    this.totalUsers = 1250;
    this.totalOrders = 847;
    this.totalRevenue = 45678;
    this.activeUsers = 342;
    
    this.recentActivities = [
      'New user registration',
      'Order #1234 completed',
      'Product updated',
      'New review submitted',
      'Payment processed'
    ];
  }
  
  refreshData() {
    this.loadDashboardData();
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}
