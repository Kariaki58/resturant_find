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
  SidebarFooter,
  useSidebar
} from "@/components/ui/sidebar";
import { Utensils, ShoppingBag, LayoutDashboard, Settings, LogOut, Smartphone, User, CreditCard, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

function SidebarHeaderLink({ restaurantName }: { restaurantName: string | null }) {
  const { setOpenMobile } = useSidebar();
  
  const handleClick = () => {
    setOpenMobile(false);
  };

  return (
    <Link href="/dashboard" className="flex items-center" onClick={handleClick}>
      <span className="text-xl font-bold tracking-tighter text-foreground truncate">
        {restaurantName || 'Restaurant'}
      </span>
    </Link>
  );
}

function NavItems() {
  const { setOpenMobile } = useSidebar();
  
  const navItems = [
    { icon: <LayoutDashboard />, label: "Overview", href: "/dashboard" },
    { icon: <ShoppingBag />, label: "Orders", href: "/dashboard/orders" },
    { icon: <Utensils />, label: "Menu Items", href: "/dashboard/menu" },
    { icon: <Smartphone />, label: "QR Tables", href: "/dashboard/tables" },
    { icon: <CreditCard />, label: "Subscription", href: "/dashboard/billing" },
    { icon: <Settings />, label: "Settings", href: "/dashboard/settings" },
  ];

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton asChild tooltip={item.label} className="h-11 rounded-xl px-4 hover:bg-primary/10 hover:text-primary transition-all">
            <Link href={item.href} className="flex items-center gap-3" onClick={handleLinkClick}>
              <span className="shrink-0">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  // const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const supabase = createClient();
  
  // Check if current path is billing page (should be accessible even if expired)
  const isBillingPage = pathname === '/dashboard/billing';

  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, email, restaurant_id')
          .eq('id', user.id)
          .maybeSingle();
        
        if (userData) {
          const typedUserData = userData as { full_name: string; email: string; restaurant_id: string | null } | null;
          
          if (typedUserData) {
            setUserInfo({
              name: typedUserData.full_name,
              email: typedUserData.email,
            });

            // Fetch restaurant name and subscription status if user has a restaurant
            if (typedUserData.restaurant_id) {
              const { data: restaurant } = await supabase
                .from('restaurants')
                .select('name, subscription_status, subscription_expires_at')
                .eq('id', typedUserData.restaurant_id)
                .maybeSingle();
              
              if (restaurant) {
                const typedRestaurant = restaurant as { 
                  name: string; 
                  subscription_status: string; 
                  subscription_expires_at: string | null 
                } | null;
                
                if (typedRestaurant) {
                  setRestaurantName(typedRestaurant.name);
                  
                  // Check if subscription is expired
                  const isExpired = () => {
                    if (!typedRestaurant.subscription_expires_at) return false;
                    return new Date(typedRestaurant.subscription_expires_at) < new Date();
                  };
                  
                  const expired = isExpired() || typedRestaurant.subscription_status === 'expired';
                  setSubscriptionExpired(expired);
                }
              }
            }
            
            setLoadingSubscription(false);
          }
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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        toast({
          title: 'Logout failed',
          description: error.message || 'Failed to log out. Please try again.',
          variant: 'destructive',
        });
        return;
      }
      
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout failed',
        description: 'An error occurred during logout. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Show blocker if subscription expired and not on billing page
  const showBlocker = subscriptionExpired && !isBillingPage && !loadingSubscription;

  return (
    <SidebarProvider defaultOpen={false}>
      <Dialog open={showBlocker} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Subscription Expired
            </DialogTitle>
            <DialogDescription className="pt-2">
              Your subscription has expired. Please renew your subscription to continue using the service.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button asChild className="w-full">
              <Link href="/dashboard/billing">Go to Billing & Renew</Link>
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar variant="sidebar" collapsible="offcanvas" className="border-r border-border/50">
          <SidebarHeader className="h-20 flex items-center px-6">
            <SidebarHeaderLink restaurantName={restaurantName} />
          </SidebarHeader>
          <SidebarContent className="px-3">
            <NavItems />
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
          <header className="h-16 border-b border-border/50 flex items-center px-4 sm:px-6 lg:px-8 sticky top-0 bg-background/80 backdrop-blur-sm z-40 w-full">
            <SidebarTrigger className="mr-4 shrink-0" />
            <div className="flex-1" />
            <div className="flex items-center gap-4 shrink-0">
              <div className="hidden sm:flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">Store Online</span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto w-full">
            <div className="container mx-auto max-w-7xl">
              {showBlocker ? (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <div className="text-center space-y-4">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
                    <h2 className="text-2xl font-bold">Subscription Expired</h2>
                    <p className="text-muted-foreground">
                      Your subscription has expired. Please renew to continue using the service.
                    </p>
                    <Button asChild>
                      <Link href="/dashboard/billing">Renew Subscription</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                children
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}