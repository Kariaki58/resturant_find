import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Smartphone, CreditCard, ShieldCheck } from 'lucide-react';
import { GetStartedButton } from '@/components/get-started-button';
import { AuthNavButtons } from '@/components/auth-nav-buttons';
import { Logo } from '@/components/logo';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-6 h-20 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-50 border-b">
        <Logo size="md" />
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">Features</Link>
          <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</Link>
          <AuthNavButtons />
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 overflow-hidden">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 relative z-10">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full text-primary font-bold text-sm">
                <span className="animate-pulse">●</span> Made for Nigeria
              </div>
              <h1 className="text-5xl md:text-7xl font-bold font-headline leading-[1.1]">
                Modernize Your <span className="text-primary italic">Buka</span> or Restaurant
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                The ultimate restaurant management tool. Accept bank transfers securely, manage dine-in QR orders, and track sales in real-time.
              </p>
              <div className="flex flex-wrap gap-4">
                <GetStartedButton size="lg" className="rounded-full text-lg px-8 py-7">
                  Register Restaurant
                </GetStartedButton>
                <Button size="lg" variant="outline" className="rounded-full text-lg px-8 py-7 bg-white" asChild>
                  <Link href="#features">Learn More</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <img 
                src="https://res.cloudinary.com/duswkmqbu/image/upload/v1771751287/resturant_w8gbba.jpg" 
                alt="Restaurant Dashboard" 
                className="relative rounded-2xl shadow-2xl border-4 border-white"
                data-ai-hint="restaurant dashboard"
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-white px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-20">
              <h2 className="text-4xl font-bold font-headline">Built for the Nigerian Reality</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                No complex card systems. We focus on what works: Bank Transfers, QR Codes, and Real-time notifications.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <CreditCard className="w-8 h-8 text-primary" />,
                  title: "Bank Transfer Proofs",
                  desc: "Customers pay via transfer and upload proof. You confirm in one click."
                },
                {
                  icon: <Smartphone className="w-8 h-8 text-primary" />,
                  title: "Dine-In QR Orders",
                  desc: "Put QR codes on your tables. Customers scan and order instantly."
                },
                {
                  icon: <ShieldCheck className="w-8 h-8 text-primary" />,
                  title: "SaaS Multi-tenancy",
                  desc: "Your data is yours. Completely isolated, secure, and always accessible."
                }
              ].map((f, i) => (
                <div key={i} className="p-8 rounded-2xl bg-background hover:shadow-lg transition-all border border-transparent hover:border-primary/20">
                  <div className="mb-6 p-4 bg-white rounded-xl w-fit shadow-sm">{f.icon}</div>
                  <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 px-6 bg-primary/5">
          <div className="max-w-4xl mx-auto bg-white rounded-3xl p-12 border shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
              <div className="bg-primary text-white font-bold px-4 py-1 rounded-full text-xs uppercase tracking-widest">Most Popular</div>
            </div>
            <div className="text-center space-y-6">
              <h2 className="text-3xl font-bold">Simple Professional Plan</h2>
              <div className="flex items-center justify-center gap-1">
                <span className="text-5xl font-extrabold">₦3,800</span>
                <span className="text-muted-foreground font-medium">/ month</span>
              </div>
              <ul className="grid md:grid-cols-2 gap-4 text-left max-w-md mx-auto py-8">
                {["Unlimited Orders", "QR Table System", "Bank Transfer Verification", "Menu Management", "Real-time Sales", "Multi-staff Support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <ShieldCheck className="text-primary w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <GetStartedButton size="lg" className="w-full rounded-full py-8 text-lg font-bold">
                Get Started Now
              </GetStartedButton>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Cancel anytime</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 border-t bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">© 2024 resturantme Technologies. Built for Nigeria.</p>
        </div>
      </footer>
    </div>
  );
}
