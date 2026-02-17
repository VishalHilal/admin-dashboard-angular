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
  
  // Chart data
  monthlyRevenue: { month: string; revenue: number }[] = [];
  maxRevenue: number = 0;
  
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
    
    // Monthly revenue data for chart
    this.monthlyRevenue = [
      { month: 'Jan', revenue: 32000 },
      { month: 'Feb', revenue: 28000 },
      { month: 'Mar', revenue: 35000 },
      { month: 'Apr', revenue: 42000 },
      { month: 'May', revenue: 38000 },
      { month: 'Jun', revenue: 45678 }
    ];
    
    this.maxRevenue = Math.max(...this.monthlyRevenue.map(m => m.revenue));
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
  
  getBarHeight(revenue: number): string {
    return `${(revenue / this.maxRevenue) * 100}%`;
  }
}
