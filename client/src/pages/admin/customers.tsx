
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, Users, UserCheck, UserX, DollarSign, RefreshCw, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  orders: number;
  spent: string;
  status: 'Active' | 'VIP' | 'New' | 'Inactive';
  joinedDate: string;
  firstName: string;
  lastName: string;
  recentOrders?: Array<{
    id: string;
    date: string;
    status: string;
    total: string;
  }>;
}

export default function AdminCustomers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      } else {
        console.error('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetails = async (customerId: number) => {
    try {
      setCustomerDetailsLoading(true);
      const response = await fetch(`/api/admin/customers/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedCustomer(data);
      } else {
        console.error('Failed to fetch customer details');
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
    } finally {
      setCustomerDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  // Calculate stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'Active' || c.status === 'VIP').length;
  const vipCustomers = customers.filter(c => c.status === 'VIP').length;
  const newCustomers = customers.filter(c => c.status === 'New').length;

  const totalRevenue = customers.reduce((sum, customer) => {
    const amount = parseFloat(customer.spent.replace(/[₹,]/g, ''));
    return sum + amount;
  }, 0);

  const stats = [
    { label: "Total Customers", value: totalCustomers.toString(), icon: Users, color: "from-blue-500 to-cyan-500" },
    { label: "Active Customers", value: activeCustomers.toString(), icon: UserCheck, color: "from-green-500 to-emerald-500" },
    { label: "VIP Customers", value: vipCustomers.toString(), icon: UserX, color: "from-purple-500 to-pink-500" },
    { label: "Total Revenue", value: `₹${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "from-yellow-500 to-orange-500" },
  ];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'VIP': return 'default';
      case 'Active': return 'secondary';
      case 'New': return 'outline';
      case 'Inactive': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Customer Management
          </h2>
          <p className="text-slate-600 mt-1">Manage customer relationships and track their activity</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchCustomers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Customers Table */}
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Customer Database</CardTitle>
          <CardDescription>
            {filteredCustomers.length} of {totalCustomers} customers
            {searchTerm && ` matching "${searchTerm}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? `No customers found matching "${searchTerm}"` : 'No customers found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">{customer.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-1" />
                          {customer.email}
                        </div>
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 mr-1" />
                          {customer.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{customer.orders}</TableCell>
                    <TableCell>{customer.spent}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(customer.status)}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{customer.joinedDate}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => fetchCustomerDetails(customer.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Profile
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Customer Profile</DialogTitle>
                            <DialogDescription>
                              Detailed information about the customer
                            </DialogDescription>
                          </DialogHeader>
                          {customerDetailsLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <RefreshCw className="h-6 w-6 animate-spin" />
                            </div>
                          ) : selectedCustomer ? (
                            <div className="space-y-6">
                              {/* Customer Info */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                                  <p className="text-lg font-medium">{selectedCustomer.name}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                                  <div className="mt-1">
                                    <Badge variant={getStatusBadgeVariant(selectedCustomer.status)}>
                                      {selectedCustomer.status}
                                    </Badge>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                                  <p>{selectedCustomer.email}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                                  <p>{selectedCustomer.phone}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Total Orders</Label>
                                  <p className="text-lg font-medium">{selectedCustomer.orders}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Total Spent</Label>
                                  <p className="text-lg font-medium text-green-600">{selectedCustomer.spent}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                                  <p>{selectedCustomer.joinedDate}</p>
                                </div>
                              </div>

                              {/* Recent Orders */}
                              {selectedCustomer.recentOrders && selectedCustomer.recentOrders.length > 0 && (
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Recent Orders</Label>
                                  <div className="mt-2 space-y-2">
                                    {selectedCustomer.recentOrders.map((order) => (
                                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                          <p className="font-medium">{order.id}</p>
                                          <p className="text-sm text-muted-foreground">{order.date}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-medium">{order.total}</p>
                                          <Badge variant="outline" className="text-xs">
                                            {order.status}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-center py-8 text-muted-foreground">
                              Failed to load customer details
                            </p>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
