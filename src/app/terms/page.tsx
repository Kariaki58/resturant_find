import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Terms of Service | resturantme',
  description: 'Terms of Service for resturantme - Read our terms and conditions for using our restaurant management platform.',
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="px-6 h-20 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-50 border-b">
        <Logo size="md" />
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">Home</Link>
          <Link href="/#features" className="text-sm font-medium hover:text-primary transition-colors">Features</Link>
          <Link href="/#pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</Link>
        </nav>
      </header>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <Button variant="ghost" size="sm" asChild className="mb-6">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>

          <div className="prose prose-lg max-w-none">
            <h1 className="text-4xl font-bold font-headline mb-2">Terms of Service</h1>
            <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">1. Acceptance of Terms</h2>
              <p className="text-foreground mb-4">
                By accessing and using resturantme ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
              <p className="text-foreground">
                These Terms of Service ("Terms") govern your access to and use of our website, mobile application, and services provided by resturantme Technologies ("we," "us," or "our").
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">2. Description of Service</h2>
              <p className="text-foreground mb-4">
                resturantme is a restaurant management and online ordering platform that enables:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
                <li>Restaurants to register, manage menus, process orders, and handle subscriptions</li>
                <li>Customers to browse menus, place orders, make payments, and track order status</li>
                <li>Real-time order management and communication between restaurants and customers</li>
                <li>Payment processing through integrated payment gateways (Flutterwave)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">3. User Accounts</h2>
              
              <h3 className="text-xl font-bold font-headline mb-3 mt-6">3.1 Account Registration</h3>
              <p className="text-foreground mb-4">
                To use certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>

              <h3 className="text-xl font-bold font-headline mb-3 mt-6">3.2 Account Termination</h3>
              <p className="text-foreground mb-4">
                We reserve the right to suspend or terminate your account at any time for violations of these Terms, fraudulent activity, or any other reason we deem necessary to protect the integrity of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">4. Restaurant Subscriptions</h2>
              
              <h3 className="text-xl font-bold font-headline mb-3 mt-6">4.1 Subscription Plans</h3>
              <p className="text-foreground mb-4">
                Restaurants must subscribe to a monthly plan to access the full features of the Service. Subscription fees are charged monthly and are non-refundable except as required by law.
              </p>

              <h3 className="text-xl font-bold font-headline mb-3 mt-6">4.2 Payment Terms</h3>
              <p className="text-foreground mb-4">
                By subscribing, you agree to pay all fees associated with your subscription. Payments are processed through Flutterwave. You are responsible for providing valid payment information and authorizing charges.
              </p>

              <h3 className="text-xl font-bold font-headline mb-3 mt-6">4.3 Subscription Renewal and Cancellation</h3>
              <p className="text-foreground mb-4">
                Subscriptions automatically renew monthly unless cancelled. You may cancel your subscription at any time through your dashboard. Cancellation takes effect at the end of the current billing period. No refunds will be provided for partial billing periods.
              </p>

              <h3 className="text-xl font-bold font-headline mb-3 mt-6">4.4 Expired Subscriptions</h3>
              <p className="text-foreground mb-4">
                If your subscription expires, access to the Service will be restricted until payment is renewed. We reserve the right to suspend or terminate accounts with expired subscriptions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">5. Orders and Payments</h2>
              
              <h3 className="text-xl font-bold font-headline mb-3 mt-6">5.1 Order Placement</h3>
              <p className="text-foreground mb-4">
                Customers may place orders through the Service. All orders are subject to acceptance by the restaurant. Restaurants reserve the right to refuse or cancel any order at their discretion.
              </p>

              <h3 className="text-xl font-bold font-headline mb-3 mt-6">5.2 Payment Methods</h3>
              <p className="text-foreground mb-4">
                We support various payment methods including bank transfers. For bank transfers, customers must upload proof of payment, which restaurants will verify before confirming orders.
              </p>

              <h3 className="text-xl font-bold font-headline mb-3 mt-6">5.3 Order Cancellation and Refunds</h3>
              <p className="text-foreground mb-4">
                Order cancellation and refund policies are determined by individual restaurants. We are not responsible for refunds or disputes between restaurants and customers. All refund requests must be directed to the restaurant.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">6. User Conduct</h2>
              <p className="text-foreground mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
                <li>Use the Service for any illegal purpose or in violation of any laws</li>
                <li>Transmit any harmful code, viruses, or malicious software</li>
                <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
                <li>Impersonate any person or entity or misrepresent your affiliation</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use automated systems to access the Service without permission</li>
                <li>Copy, modify, or distribute any content from the Service without authorization</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">7. Intellectual Property</h2>
              <p className="text-foreground mb-4">
                The Service and its original content, features, and functionality are owned by resturantme Technologies and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              <p className="text-foreground mb-4">
                You retain ownership of content you submit to the Service (e.g., menu items, restaurant information). By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display such content for the purpose of providing the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">8. Disclaimers and Limitation of Liability</h2>
              
              <h3 className="text-xl font-bold font-headline mb-3 mt-6">8.1 Service Availability</h3>
              <p className="text-foreground mb-4">
                We strive to provide reliable service but do not guarantee that the Service will be available at all times, uninterrupted, or error-free. We reserve the right to modify, suspend, or discontinue the Service at any time.
              </p>

              <h3 className="text-xl font-bold font-headline mb-3 mt-6">8.2 Third-Party Services</h3>
              <p className="text-foreground mb-4">
                The Service may integrate with third-party services (e.g., payment processors). We are not responsible for the availability, accuracy, or practices of third-party services.
              </p>

              <h3 className="text-xl font-bold font-headline mb-3 mt-6">8.3 Limitation of Liability</h3>
              <p className="text-foreground mb-4">
                To the maximum extent permitted by law, resturantme Technologies shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">9. Indemnification</h2>
              <p className="text-foreground mb-4">
                You agree to indemnify, defend, and hold harmless resturantme Technologies, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with your use of the Service, violation of these Terms, or infringement of any rights of another.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">10. Dispute Resolution</h2>
              <p className="text-foreground mb-4">
                Any disputes arising out of or relating to these Terms or the Service shall be resolved through good faith negotiation. If a resolution cannot be reached, disputes shall be subject to the exclusive jurisdiction of the courts of Nigeria.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">11. Changes to Terms</h2>
              <p className="text-foreground mb-4">
                We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on this page and updating the "Last updated" date. Your continued use of the Service after such changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">12. Contact Information</h2>
              <p className="text-foreground mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-foreground font-medium mb-2">resturantme Technologies</p>
                <p className="text-foreground">Email: support@resturantme.com</p>
                <p className="text-foreground">Address: Nigeria</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="py-12 px-6 border-t bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <Logo size="sm" />
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 resturantme Technologies. Built for Nigeria.</p>
        </div>
      </footer>
    </div>
  );
}

