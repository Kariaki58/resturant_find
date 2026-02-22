'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon, Save, Building2, CreditCard, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  delivery_enabled: boolean;
}

interface UserData {
  full_name: string;
  email: string;
  phone: string;
}

export default function SettingsPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    slug: '',
    bank_name: '',
    account_number: '',
    account_name: '',
    delivery_enabled: false,
  });
  const [userForm, setUserForm] = useState({
    full_name: '',
    phone: '',
  });
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('restaurant_id, full_name, email, phone')
        .eq('id', user.id)
        .single();

      if (!userData) return;

      setUserForm({
        full_name: userData.full_name,
        phone: userData.phone,
      });
      setUserData({
        full_name: userData.full_name,
        email: userData.email,
        phone: userData.phone,
      });

      if (userData.restaurant_id) {
        const { data: restaurantData } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', userData.restaurant_id)
          .single();

        if (restaurantData) {
          setRestaurant(restaurantData);
          setRestaurantForm({
            name: restaurantData.name,
            slug: restaurantData.slug,
            bank_name: restaurantData.bank_name,
            account_number: restaurantData.account_number,
            account_name: restaurantData.account_name,
            delivery_enabled: restaurantData.delivery_enabled || false,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching settings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!restaurant) return;

      // Check if name or slug is already taken by another restaurant
      const { data: existing } = await supabase
        .from('restaurants')
        .select('id, name, slug')
        .or(`name.eq."${restaurantForm.name}",slug.eq."${restaurantForm.slug}"`)
        .neq('id', restaurant.id)
        .maybeSingle();

      if (existing) {
        if (existing.name === restaurantForm.name) {
          toast({
            title: 'Error',
            description: 'This restaurant name is already taken',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: 'This slug is already taken by another restaurant',
            variant: 'destructive',
          });
        }
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('restaurants')
        .update({
          name: restaurantForm.name,
          slug: restaurantForm.slug,
          bank_name: restaurantForm.bank_name,
          account_number: restaurantForm.account_number,
          account_name: restaurantForm.account_name,
          delivery_enabled: restaurantForm.delivery_enabled,
        })
        .eq('id', restaurant.id);

      if (error) throw error;

      toast({ title: 'Restaurant settings updated successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update restaurant settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .update({
          full_name: userForm.full_name,
          phone: userForm.phone,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({ title: 'Profile updated successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-7xl mx-auto">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">Manage your restaurant and account settings</p>
      </div>

      <Tabs defaultValue="restaurant" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="restaurant">
            <Building2 className="mr-2 h-4 w-4" /> Restaurant
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" /> Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="restaurant">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Restaurant Information</CardTitle>
              <CardDescription>Update your restaurant details and payment information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRestaurantSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurant_name">Restaurant Name *</Label>
                  <Input
                    id="restaurant_name"
                    value={restaurantForm.name}
                    onChange={(e) => {
                      setRestaurantForm({
                        ...restaurantForm,
                        name: e.target.value,
                        slug: generateSlug(e.target.value),
                      });
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurant_slug">Restaurant URL Slug *</Label>
                  <Input
                    id="restaurant_slug"
                    value={restaurantForm.slug}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, slug: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Your menu will be available at: /menu/{restaurantForm.slug || 'your-slug'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name *</Label>
                  <Input
                    id="bank_name"
                    value={restaurantForm.bank_name}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, bank_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_number">Account Number *</Label>
                  <Input
                    id="account_number"
                    value={restaurantForm.account_number}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, account_number: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_name">Account Name *</Label>
                  <Input
                    id="account_name"
                    value={restaurantForm.account_name}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, account_name: e.target.value })}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2 pt-4 border-t">
                  <input
                    type="checkbox"
                    id="delivery_enabled"
                    checked={restaurantForm.delivery_enabled}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, delivery_enabled: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="delivery_enabled" className="font-medium cursor-pointer">
                    Enable Delivery Service
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  When enabled, customers can choose delivery or pickup when placing orders.
                </p>
                <Button type="submit" disabled={saving} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userData?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

