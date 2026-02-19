import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, CommonModule],
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
  
  // Notification system
  notifications: any[] = [];
  unreadCount: number = 0;
  showNotifications: boolean = false;
  
  // User table data
  users: any[] = [];
  filteredUsers: any[] = [];
  searchTerm: string = '';
  selectedStatus: string = 'all';
  
  // Export functionality
  showExportModal: boolean = false;
  exportFormat: string = 'csv';
  dateRange: string = 'all';
  selectedData: string = 'users';
  
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
    
    // Sample notifications
    this.notifications = [
      { id: 1, type: 'success', message: 'New order received: #5678', time: '2 min ago', read: false },
      { id: 2, type: 'warning', message: 'Inventory low for product SKU-1234', time: '15 min ago', read: false },
      { id: 3, type: 'info', message: 'System maintenance scheduled for tonight', time: '1 hour ago', read: true },
      { id: 4, type: 'error', message: 'Payment gateway timeout detected', time: '2 hours ago', read: true },
      { id: 5, type: 'success', message: 'Monthly report generated successfully', time: '3 hours ago', read: true }
    ];
    
    this.updateUnreadCount();
    
    // Sample user data
    this.users = [
      { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', joinDate: '2024-01-15', orders: 12 },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'active', joinDate: '2024-01-20', orders: 8 },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'inactive', joinDate: '2024-02-01', orders: 5 },
      { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'active', joinDate: '2024-02-10', orders: 15 },
      { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', status: 'pending', joinDate: '2024-02-15', orders: 3 },
      { id: 6, name: 'Diana Davis', email: 'diana@example.com', status: 'active', joinDate: '2024-03-01', orders: 20 },
      { id: 7, name: 'Edward Miller', email: 'edward@example.com', status: 'inactive', joinDate: '2024-03-05', orders: 7 },
      { id: 8, name: 'Fiona Garcia', email: 'fiona@example.com', status: 'active', joinDate: '2024-03-10', orders: 11 }
    ];
    
    this.filteredUsers = [...this.users];
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
  
  // Notification methods
  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }
  
  markAsRead(notificationId: number) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.updateUnreadCount();
    }
  }
  
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.updateUnreadCount();
  }
  
  deleteNotification(notificationId: number) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.updateUnreadCount();
  }
  
  updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }
  
  getNotificationIcon(type: string): string {
    switch(type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  }
  
  getNotificationColor(type: string): string {
    switch(type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  }
  
  // Search and filter functionality
  onSearchChange() {
    this.filterUsers();
  }
  
  onStatusChange() {
    this.filterUsers();
  }
  
  filterUsers() {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = this.selectedStatus === 'all' || user.status === this.selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }
  
  getStatusColor(status: string): string {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  
  getUserInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  // Export functionality
  openExportModal() {
    this.showExportModal = true;
  }
  
  closeExportModal() {
    this.showExportModal = false;
  }
  
  exportData() {
    let dataToExport: any[] = [];
    
    switch(this.selectedData) {
      case 'users':
        dataToExport = this.filteredUsers;
        break;
      case 'revenue':
        dataToExport = this.monthlyRevenue;
        break;
      case 'activities':
        dataToExport = this.recentActivities.map((activity, index) => ({
          id: index + 1,
          activity: activity,
          timestamp: new Date().toISOString()
        }));
        break;
    }
    
    if (this.exportFormat === 'csv') {
      this.downloadCSV(dataToExport);
    } else if (this.exportFormat === 'excel') {
      this.downloadExcel(dataToExport);
    } else if (this.exportFormat === 'pdf') {
      this.downloadPDF(dataToExport);
    }
    
    this.closeExportModal();
  }
  
  downloadCSV(data: any[]) {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selectedData}_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  
  downloadExcel(data: any[]) {
    // Simple Excel-like CSV with proper formatting
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join('\t'),
      ...data.map(row => headers.map(header => row[header]).join('\t'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selectedData}_export_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  
  downloadPDF(data: any[]) {
    // Simple PDF generation using window.print()
    if (data.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const headers = Object.keys(data[0]);
    let htmlContent = `
      <html>
        <head>
          <title>${this.selectedData.toUpperCase()} Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .header { text-align: center; margin-bottom: 30px; }
            .date { text-align: right; color: #666; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${this.selectedData.toUpperCase()} Report</h1>
            <div class="date">Generated: ${new Date().toLocaleDateString()}</div>
          </div>
          <table>
            <thead>
              <tr>
                ${headers.map(header => `<th>${header.toUpperCase()}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => 
                `<tr>${headers.map(header => `<td>${row[header] || ''}</td>`).join('')}</tr>`
              ).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  }
  
  generateReport() {
    // Generate comprehensive report
    const reportData = {
      summary: {
        totalUsers: this.totalUsers,
        totalOrders: this.totalOrders,
        totalRevenue: this.totalRevenue,
        activeUsers: this.activeUsers,
        generatedDate: new Date().toLocaleDateString()
      },
      users: this.filteredUsers,
      revenue: this.monthlyRevenue,
      activities: this.recentActivities
    };
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    let htmlContent = `
      <html>
        <head>
          <title>Dashboard Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { color: #333; }
            .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
            .summary-item { display: inline-block; margin: 10px 20px 10px 0; }
            .summary-label { font-weight: bold; color: #666; }
            .summary-value { font-size: 1.2em; color: #333; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .section { margin-bottom: 40px; }
            .date { text-align: right; color: #666; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="date">Generated: ${new Date().toLocaleDateString()}</div>
          <h1>Dashboard Report</h1>
          
          <div class="section">
            <h2>Summary</h2>
            <div class="summary">
              <div class="summary-item">
                <div class="summary-label">Total Users:</div>
                <div class="summary-value">${reportData.summary.totalUsers.toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Orders:</div>
                <div class="summary-value">${reportData.summary.totalOrders.toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Revenue:</div>
                <div class="summary-value">${this.formatCurrency(reportData.summary.totalRevenue)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Active Users:</div>
                <div class="summary-value">${reportData.summary.activeUsers.toLocaleString()}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>User Data</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Join Date</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.users.map(user => 
                  `<tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.status}</td>
                    <td>${user.joinDate}</td>
                    <td>${user.orders}</td>
                  </tr>`
                ).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Revenue Trend</h2>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.revenue.map(item => 
                  `<tr>
                    <td>${item.month}</td>
                    <td>${this.formatCurrency(item.revenue)}</td>
                  </tr>`
                ).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  }
}
