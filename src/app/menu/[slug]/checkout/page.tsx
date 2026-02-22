'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CreditCard, Upload, CheckCircle2, Building2, User, Phone, Mail, FileText, Image as ImageIcon, X, Truck, Store, Utensils, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  available: boolean;
  category_id: string;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  delivery_enabled: boolean;
}

export default function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    note: '',
    paymentReference: '',
    buyerTransferName: '',
    deliveryMethod: 'pickup' as 'delivery' | 'pickup' | 'dine_in',
  });

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }

    fetchRestaurant();
  }, [slug]);

  const fetchRestaurant = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, slug, bank_name, account_number, account_name, delivery_enabled')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({
          title: 'Restaurant not found',
          description: 'The restaurant you are looking for does not exist.',
          variant: 'destructive',
        });
        router.push(`/menu/${slug}`);
        return;
      }

      setRestaurant(data);
    } catch (error: any) {
      console.error('Error fetching restaurant:', error);
      toast({
        title: 'Error',
        description: 'Failed to load restaurant information.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, or WebP image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setPaymentProofFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadPaymentProof = async (): Promise<string | null> => {
    if (!paymentProofFile) {
      return null;
    }

    setUploadingProof(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', paymentProofFile);

      const response = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload payment proof');
      }

      return data.url;
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload payment proof',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploadingProof(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getTotal = () => {
    return cart.reduce((total, item) => total + item.menuItem.price * item.quantity, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items to your cart before placing an order.',
        variant: 'destructive',
      });
      return;
    }

    if (!paymentProofFile) {
      toast({
        title: 'Payment proof required',
        description: 'Please upload a screenshot of your payment receipt.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload payment proof first
      const paymentProofUrl = await uploadPaymentProof();
      if (!paymentProofUrl) {
        setSubmitting(false);
        return;
      }

      // Create order
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId: restaurant!.id,
          cart: cart.map((item) => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            price: item.menuItem.price,
          })),
          customerInfo: {
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
          },
          paymentInfo: {
            paymentReference: formData.paymentReference,
            buyerTransferName: formData.buyerTransferName,
            paymentProofUrl: paymentProofUrl,
          },
          note: formData.note || null,
          tableNumber: searchParams.get('table') ? parseInt(searchParams.get('table')!) : null,
          deliveryMethod: formData.deliveryMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Clear cart
      localStorage.removeItem('cart');

      // Redirect to success page
      router.push(`/menu/${slug}/order-success?orderId=${data.orderId}`);
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        title: 'Order failed',
        description: error.message || 'Failed to place your order. Please try again.',
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-6">
          <div className="flex gap-4 items-center">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-[400px] rounded-3xl" />
            <Skeleton className="h-[400px] rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant || cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <h2 className="text-2xl font-bold">Cart is Empty</h2>
            <p className="text-muted-foreground">Please add items to your cart before checkout.</p>
            <Button asChild>
              <Link href={`/menu/${slug}`}>Back to Menu</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-background/80">
              <Link href={`/menu/${slug}`}>
                <ArrowLeft size={20} />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold font-headline tracking-tight">Checkout</h1>
              <p className="text-muted-foreground text-sm">Fine dining from {restaurant.name}</p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit px-4 py-1.5 rounded-full border-primary/20 bg-primary/5 text-primary font-medium">
            <Lock className="w-3.5 h-3.5 mr-2" /> Secure Checkout
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-12 gap-8">
          {/* Left Column - Order Details & Payment */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="border-none shadow-xl shadow-foreground/5 rounded-3xl overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-xl">Your Order</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                  {cart.map((item) => (
                    <div key={item.menuItem.id} className="flex items-center gap-4 pb-4 border-b last:border-0 last:pb-0">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted shrink-0 shadow-inner">
                        {item.menuItem.image_url ? (
                          <img
                            src={item.menuItem.image_url}
                            alt={item.menuItem.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground opacity-30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold truncate text-sm">{item.menuItem.name}</h4>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-primary">{formatCurrency(item.menuItem.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t-2 border-dashed">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
                    <span className="text-xl font-black text-foreground">{formatCurrency(getTotal())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card className="border-none shadow-xl shadow-foreground/5 rounded-3xl overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User size={18} className="text-primary" />
                  Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider opacity-70">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                      placeholder="Enter your name"
                      className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider opacity-70">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      placeholder="+234..."
                      className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider opacity-70">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="your@email.com"
                    className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note" className="text-xs font-bold uppercase tracking-wider opacity-70">Special Requests</Label>
                  <Textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Extra spices, allergies, etc..."
                    rows={2}
                    className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Order Type Selection */}
            <Card className="border-none shadow-xl shadow-foreground/5 rounded-3xl overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Utensils size={18} className="text-primary" />
                  How would you like your meal?
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryMethod: 'dine_in' })}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                      formData.deliveryMethod === 'dine_in'
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/20'
                        : 'border-muted bg-white hover:border-primary/30'
                    }`}
                  >
                    <div className={`p-2 rounded-full mb-2 ${formData.deliveryMethod === 'dine_in' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                      <Utensils size={20} />
                    </div>
                    <span className="font-bold text-sm">Dine In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryMethod: 'pickup' })}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                      formData.deliveryMethod === 'pickup'
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/20'
                        : 'border-muted bg-white hover:border-primary/30'
                    }`}
                  >
                    <div className={`p-2 rounded-full mb-2 ${formData.deliveryMethod === 'pickup' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                      <Store size={20} />
                    </div>
                    <span className="font-bold text-sm">Pickup</span>
                  </button>
                  {restaurant.delivery_enabled ? (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, deliveryMethod: 'delivery' })}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                        formData.deliveryMethod === 'delivery'
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/20'
                          : 'border-muted bg-white hover:border-primary/30'
                      }`}
                    >
                      <div className={`p-2 rounded-full mb-2 ${formData.deliveryMethod === 'delivery' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                        <Truck size={20} />
                      </div>
                      <span className="font-bold text-sm">Delivery</span>
                    </button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* Payment Verification (Mobile Optimization: Reordered for flow) */}
            <Card className="border-none shadow-xl shadow-foreground/5 rounded-3xl overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard size={18} className="text-primary" />
                  Payment Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentReference" className="text-xs font-bold uppercase tracking-wider opacity-70">Payment Ref *</Label>
                    <Input
                      id="paymentReference"
                      value={formData.paymentReference}
                      onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                      required
                      placeholder="Ref number"
                      className="rounded-xl bg-muted/30 border-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyerTransferName" className="text-xs font-bold uppercase tracking-wider opacity-70">Sender Name *</Label>
                    <Input
                      id="buyerTransferName"
                      value={formData.buyerTransferName}
                      onChange={(e) => setFormData({ ...formData, buyerTransferName: e.target.value })}
                      required
                      placeholder="Who transfered?"
                      className="rounded-xl bg-muted/30 border-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentProof" className="text-xs font-bold uppercase tracking-wider opacity-70">Proof of Payment *</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="paymentProof" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/20 rounded-2xl cursor-pointer hover:bg-muted/30 transition-colors relative overflow-hidden group">
                        {paymentProofPreview ? (
                          <img src={paymentProofPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" />
                        ) : null}
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10">
                          <Upload className={`w-8 h-8 mb-3 ${paymentProofPreview ? 'text-white' : 'text-muted-foreground/50'}`} />
                          <p className={`text-xs font-medium ${paymentProofPreview ? 'text-white drop-shadow-md' : 'text-muted-foreground'}`}>
                            {paymentProofFile ? paymentProofFile.name : 'Click to upload receipt'}
                          </p>
                        </div>
                        <Input
                          id="paymentProof"
                          type="file"
                          accept="image/*"
                          onChange={handlePaymentProofChange}
                          className="hidden"
                          required={!paymentProofPreview}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-6">
            {/* Bank Account Details - Sticky on Desktop */}
            <Card className="border-none shadow-2xl shadow-primary/10 rounded-3xl overflow-hidden bg-primary text-white lg:sticky lg:top-24">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Building2 size={120} />
              </div>
              <CardHeader className="relative">
                <CardTitle className="text-xl">Payment Details</CardTitle>
                <CardDescription className="text-white/70">Please transfer exactly {formatCurrency(getTotal())}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative pt-2">
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Bank Name</p>
                    <p className="text-lg font-bold">{restaurant.bank_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Account Number</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-2xl font-black font-mono tracking-tighter">{restaurant.account_number}</p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-full bg-white text-primary hover:bg-blue-50 h-8 font-bold"
                        onClick={() => {
                          navigator.clipboard.writeText(restaurant.account_number);
                          toast({ title: 'Copied!', description: 'Account number saved' });
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Account Name</p>
                    <p className="text-lg font-bold">{restaurant.account_name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-bold uppercase tracking-widest opacity-70">Steps to finish:</p>
                  <div className="grid gap-3">
                    {[
                      { step: 1, text: "Copy the account details" },
                      { step: 2, text: "Make the bank transfer" },
                      { step: 3, text: "Upload the receipt below" }
                    ].map((s) => (
                      <div key={s.step} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">{s.step}</div>
                        <p className="text-xs font-medium">{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-14 text-lg font-black rounded-2xl bg-white text-primary hover:bg-blue-50 shadow-lg"
                  disabled={submitting || uploadingProof}
                >
                  {submitting || uploadingProof ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      SUBMIT ORDER
                    </>
                  )}
                </Button>
                
                <p className="text-[10px] text-center text-white/50 px-4">
                  Our system will verify your payment within 1-5 minutes of submission.
                </p>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}

