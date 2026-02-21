import { Utensils, ShoppingBag, CreditCard, TrendingUp, Bell, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function DashboardPage() {
  // Dummy data for visual representation
  const stats = [
    { title: "Total Revenue", value: "₦142,500", icon: <TrendingUp className="text-primary" />, trend: "+12% this week" },
    { title: "Orders Today", value: "24", icon: <ShoppingBag className="text-primary" />, trend: "+4 from yesterday" },
    { title: "Active Tables", value: "8 / 12", icon: <Utensils className="text-primary" />, trend: "Busy period" },
    { title: "Awaiting Confirmation", value: "3", icon: <Bell className="text-orange-600 animate-bounce" />, trend: "Action needed" },
  ];

  const recentOrders = [
    { id: "ORD-9281", type: "Dine-in", table: "T-04", amount: "₦4,200", status: "preparing", time: "5 mins ago" },
    { id: "ORD-9280", type: "Online", table: null, amount: "₦8,500", status: "awaiting_confirmation", time: "12 mins ago" },
    { id: "ORD-9279", type: "Pre-order", table: null, amount: "₦12,000", status: "confirmed", time: "25 mins ago" },
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Welcome back, Mama Put!</h1>
          <p className="text-muted-foreground">Here's what's happening in your restaurant today.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full bg-white">
            <Clock className="mr-2 h-4 w-4" /> Shift History
          </Button>
          <Button className="rounded-full">
            <Utensils className="mr-2 h-4 w-4" /> Manage Menu
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Live Orders</CardTitle>
              <CardDescription>Monitor your kitchen and incoming transfers</CardDescription>
            </div>
            <Button variant="ghost" className="text-primary text-sm font-bold" asChild>
              <Link href="/dashboard/orders">View All Orders</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-transparent hover:border-primary/20 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${order.status === 'awaiting_confirmation' ? 'bg-orange-100' : 'bg-primary/10'}`}>
                      <CreditCard className={order.status === 'awaiting_confirmation' ? 'text-orange-600' : 'text-primary'} size={20} />
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        {order.id}
                        <Badge variant="outline" className="text-[10px] uppercase">{order.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{order.table ? `Table ${order.table}` : 'Online Order'} • {order.time}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className="font-bold">{order.amount}</span>
                    <Badge 
                      className={
                        order.status === 'awaiting_confirmation' ? 'bg-orange-500 hover:bg-orange-600' :
                        order.status === 'preparing' ? 'bg-blue-500 hover:bg-blue-600' :
                        'bg-green-500 hover:bg-green-600'
                      }
                    >
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Subscription & Support */}
        <div className="space-y-6">
          <Card className="bg-primary text-white border-none shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <ShieldCheck size={80} />
            </div>
            <CardHeader>
              <CardTitle className="text-lg">Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm opacity-80">Plan: Professional</p>
                <p className="text-2xl font-bold">Active</p>
              </div>
              <p className="text-xs opacity-80">Next billing: Dec 24, 2024 (₦3,800)</p>
              <Button variant="secondary" className="w-full font-bold">Manage Billing</Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-20 flex-col gap-2 bg-white rounded-xl">
                <Utensils size={20} /> <span className="text-xs">Menu</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 bg-white rounded-xl">
                <Smartphone size={20} /> <span className="text-xs">QR Codes</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 bg-white rounded-xl">
                <TrendingUp size={20} /> <span className="text-xs">Analytics</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 bg-white rounded-xl">
                <Bell size={20} /> <span className="text-xs">Settings</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}