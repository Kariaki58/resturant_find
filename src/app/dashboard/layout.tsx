'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarInset,
  SidebarTrigger,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Utensils, ShoppingBag, LayoutDashboard, Settings, LogOut, Smartphone, User, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setUserInfo({
            name: userData.full_name,
            email: userData.email,
          });
        } else {
          setUserInfo({
            name: user.user_metadata?.full_name || 'User',
            email: user.email || '',
          });
        }
      }
    };
    fetchUserInfo();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
    router.push('/auth/login');
  };
  const navItems = [
    { icon: <LayoutDashboard />, label: "Overview", href: "/dashboard" },
    { icon: <ShoppingBag />, label: "Orders", href: "/dashboard/orders" },
    { icon: <Utensils />, label: "Menu Items", href: "/dashboard/menu" },
    { icon: <Smartphone />, label: "QR Tables", href: "/dashboard/tables" },
    { icon: <CreditCard />, label: "Subscription", href: "/dashboard/billing" },
    { icon: <Settings />, label: "Settings", href: "/dashboard/settings" },
  ];

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background">
        <Sidebar variant="sidebar" collapsible="icon" className="border-r border-border/50">
          <SidebarHeader className="h-20 flex items-center px-6">
            <Link href="/dashboard" className="flex items-center">
              <span className="text-2xl font-bold tracking-tighter text-foreground truncate">
                resturant<span className="text-primary">me</span>
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="px-3">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild tooltip={item.label} className="h-11 rounded-xl px-4 hover:bg-primary/10 hover:text-primary transition-all">
                    <Link href={item.href} className="flex items-center gap-3">
                      <span className="shrink-0">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-border/50">
            {userInfo && (
            <div className="flex items-center gap-3 px-2 py-3 bg-muted/50 rounded-xl mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <User size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{userInfo.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{userInfo.email}</p>
                </div>
              </div>
            )}
            <SidebarMenuButton 
              onClick={handleLogout}
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl h-11 cursor-pointer"
            >
              <LogOut size={18} className="mr-3" />
              <span className="font-medium">Logout</span>
            </SidebarMenuButton>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-border/50 flex items-center px-6 sticky top-0 bg-background/80 backdrop-blur-sm z-40">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">Store Online</span>
              </div>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
