
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Users, 
  Settings, 
  Activity, 
  Database,
  Server,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  Lock,
  Eye,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MasterAdminDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { data: systemStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['/api/master-admin/system-stats'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/master-admin/system-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch system stats');
      return res.json();
    }
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['/api/master-admin/activity-logs'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/master-admin/activity-logs?limit=10', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch activity logs');
      return res.json();
    }
  });

  const handleSystemAction = async (action: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/master-admin/system/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast({ title: "Success", description: `${action} completed successfully` });
        refetchStats();
      } else {
        throw new Error(`Failed to ${action}`);
      }
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      title: "Total Users",
      value: systemStats?.totalUsers || "0",
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      description: `${systemStats?.activeUsers || 0} active`,
    },
    {
      title: "Admin Users",
      value: systemStats?.adminUsers || "0",
      icon: Shield,
      color: "from-purple-500 to-pink-500",
      description: `${systemStats?.masterAdmins || 0} master admins`,
    },
    {
      title: "System Health",
      value: systemStats?.systemHealth || "Good",
      icon: Activity,
      color: "from-green-500 to-emerald-500",
      description: "All systems operational",
    },
    {
      title: "Database Size",
      value: systemStats?.dbSize || "N/A",
      icon: Database,
      color: "from-orange-500 to-red-500",
      description: `${systemStats?.tableCount || 0} tables`,
    },
  ];

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <Shield className="h-8 w-8 text-purple-600" />
            Master Admin Dashboard
          </h2>
          <p className="text-slate-600 mt-1">Complete system control and monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => refetchStats()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Badge variant="default" className="bg-purple-600">
            <Lock className="h-3 w-3 mr-1" />
            Master Access
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
                <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick System Actions
          </CardTitle>
          <CardDescription>Manage critical system operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => handleSystemAction('clear-cache')}
              disabled={loading}
            >
              <Database className="h-5 w-5" />
              <span className="text-sm">Clear Cache</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => handleSystemAction('optimize-db')}
              disabled={loading}
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm">Optimize DB</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => window.location.href = '/admin/master/users'}
            >
              <Users className="h-5 w-5" />
              <span className="text-sm">Manage Users</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => window.location.href = '/admin/master/settings'}
            >
              <Settings className="h-5 w-5" />
              <span className="text-sm">System Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Admin Activity
          </CardTitle>
          <CardDescription>Latest administrative actions across the system</CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-purple-600" />
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity: any, index: number) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                    <p className="text-xs text-slate-500">{activity.user} • {activity.timestamp}</p>
                    {activity.details && (
                      <p className="text-xs text-slate-600 mt-1">{activity.details}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity to display</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              System Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Database', status: 'operational', uptime: '99.9%' },
                { name: 'API Server', status: 'operational', uptime: '99.8%' },
                { name: 'File Storage', status: 'operational', uptime: '100%' },
                { name: 'Email Service', status: 'operational', uptime: '99.5%' },
              ].map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{service.uptime}</span>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      {service.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Alerts & Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemStats?.alerts && systemStats.alerts.length > 0 ? (
                systemStats.alerts.map((alert: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-900">{alert.message}</p>
                      <p className="text-xs text-orange-700 mt-1">{alert.timestamp}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
                  <p>No active alerts</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
