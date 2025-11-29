
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Search, RefreshCw, Download, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MasterAdminActivityLogs() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/master-admin/activity-logs'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/master-admin/activity-logs?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch activity logs');
      const data = await res.json();
      return data;
    }
  });

  const logs = Array.isArray(logsData) ? logsData : (logsData?.logs || []);

  const filteredLogs = logs.filter((log: any) => {
    const matchesSearch = log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    const variants: Record<string, any> = {
      create: { variant: 'default', className: 'bg-green-600' },
      update: { variant: 'default', className: 'bg-blue-600' },
      delete: { variant: 'default', className: 'bg-red-600' },
      login: { variant: 'default', className: 'bg-purple-600' },
      logout: { variant: 'secondary' }
    };
    const actionType = action.split('_')[0].toLowerCase();
    const config = variants[actionType] || { variant: 'outline' };
    return <Badge variant={config.variant} className={config.className}>{action}</Badge>;
  };

  const handleExportLogs = () => {
    const csvData = [
      ['Timestamp', 'User', 'Action', 'Resource', 'IP Address', 'Status'],
      ...filteredLogs.map((log: any) => [
        new Date(log.timestamp).toLocaleString(),
        log.user,
        log.action,
        log.resource || 'N/A',
        log.ipAddress || 'N/A',
        log.status
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-purple-600" />
            Activity Logs
          </h2>
          <p className="text-slate-600 mt-1">Monitor all administrative actions</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search logs by action or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="login">Login</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Activity History ({filteredLogs.length})</CardTitle>
          <CardDescription>Complete audit trail of administrative actions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-purple-600" />
            </div>
          ) : (
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        No activity logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">{log.user}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="text-sm text-slate-600">{log.resource || 'N/A'}</TableCell>
                        <TableCell className="text-sm text-slate-600">{log.ipAddress || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className={log.status === 'success' ? 'bg-green-600' : ''}>
                            {log.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
