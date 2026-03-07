import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Privacy Policy | karimeals',
  description: 'Privacy Policy for karimeals - Learn how we collect, use, and protect your personal information.',
};

export default function PrivacyPage() {
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
            <h1 className="text-4xl font-bold font-headline mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">1. Introduction</h2>
              <p className="text-foreground mb-4">
                Welcome to karimeals ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our restaurant management and ordering platform.
              </p>
              <p className="text-foreground">
                By using karimeals, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-bold font-headline mb-3 mt-6">2.1 Personal Information</h3>
              <p className="text-foreground mb-4">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
                <li>Name, email address, and phone number</li>
                <li>Restaurant information (name, address, contact details)</li>
                <li>Payment information (processed securely through Flutterwave)</li>
                <li>Order details and preferences</li>
                <li>Account credentials and profile information</li>
              </ul>

              <h3 className="text-xl font-bold font-headline mb-3 mt-6">2.2 Automatically Collected Information</h3>
              <p className="text-foreground mb-4">
                When you use our services, we automatically collect certain information, including:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data (pages visited, features used, time spent)</li>
                <li>Location data (if you enable location services)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">3. How We Use Your Information</h2>
              <p className="text-foreground mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and manage subscriptions</li>
                <li>Send order confirmations and updates</li>
                <li>Communicate with you about your account and our services</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Detect, prevent, and address technical issues and fraud</li>
                <li>Comply with legal obligations</li>
                <li>Analyze usage patterns to improve user experience</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-foreground mb-4">
                We do not sell your personal information. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
                <li><strong>Service Providers:</strong> We may share information with third-party service providers who perform services on our behalf (e.g., payment processing, cloud hosting)</li>
                <li><strong>Restaurants:</strong> When you place an order, we share necessary information with the restaurant to fulfill your order</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights and safety</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale, your information may be transferred</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">5. Data Security</h2>
              <p className="text-foreground mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">6. Your Rights</h2>
              <p className="text-foreground mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
                <li>Access and receive a copy of your personal data</li>
                <li>Rectify inaccurate or incomplete information</li>
                <li>Request deletion of your personal data</li>
                <li>Object to processing of your personal data</li>
                <li>Request restriction of processing</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <p className="text-foreground">
                To exercise these rights, please contact us at the email address provided below.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">7. Cookies and Tracking Technologies</h2>
              <p className="text-foreground mb-4">
                We use cookies and similar tracking technologies to track activity on our platform and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">8. Children's Privacy</h2>
              <p className="text-foreground mb-4">
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">9. Changes to This Privacy Policy</h2>
              <p className="text-foreground mb-4">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold font-headline mb-4">10. Contact Us</h2>
              <p className="text-foreground mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-foreground font-medium mb-2">karimeals Technologies</p>
                <p className="text-foreground">Email: privacy@karimeals.com</p>
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
          <p className="text-sm text-muted-foreground">© 2024 karimeals Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

