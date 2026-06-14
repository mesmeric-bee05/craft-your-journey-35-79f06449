import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, MessageSquare, Share2, BarChart3, Wallet, Users, 
  Video, Package, Sparkles, ArrowRight, Check, Star,
  Shield, Globe, Smartphone, ChevronRight, Brain, Camera, Eye, 
  Workflow, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SEO } from '@/components/seo/SEO';

const features = [
  {
    icon: MessageSquare,
    title: 'Unified Inbox',
    description: 'Manage WhatsApp, SMS, Email, Instagram & Facebook DMs from one powerful inbox with AI-suggested replies.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Sparkles,
    title: 'AI Marketing Engine',
    description: 'Generate captions, emails, ad copy & hashtags in English, Swahili or Sheng — optimized for African audiences.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Share2,
    title: 'Social Media Manager',
    description: 'Schedule posts, preview across platforms, track analytics, and manage templates — all in one place.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    icon: Video,
    title: 'Live Studio',
    description: 'Multi-platform streaming with live chat, polls, overlays, and audience moderation tools.',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    icon: Wallet,
    title: 'Payments & M-Pesa',
    description: 'Send money, receive payments, and manage your wallet with M-Pesa integration built for Kenya.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: Users,
    title: 'Talent Marketplace',
    description: 'Post jobs, find freelancers, manage contracts, and process payouts — your hiring pipeline simplified.',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: Package,
    title: 'Inventory Intelligence',
    description: 'Track products, suppliers, stock movements with low-stock alerts and AI-powered demand forecasting.',
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
  },
  {
    icon: BarChart3,
    title: 'Analytics & SLA',
    description: 'Real-time dashboards, SLA tracking, CSAT surveys, team performance, and exportable reports.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
  },
  {
    icon: Brain,
    title: 'Biashara Mind™',
    description: 'Mental wellness companion for entrepreneurs — mood tracking, burnout alerts, journaling, and AI therapy in Swahili.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Camera,
    title: 'SmartReach Vision',
    description: 'AI-powered product photography tips — get studio-quality composition advice from your phone camera.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Eye,
    title: 'CompetEdge Intelligence',
    description: 'Monitor competitors, track viral content, analyze hashtags, and discover content gaps in your niche.',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
  {
    icon: Workflow,
    title: 'Automation Workflows',
    description: 'Build no-code automations for auto-replies, follow-ups, lead assignment, and team notifications.',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
];

const stats = [
  { value: '10K+', label: 'African SMEs' },
  { value: '2M+', label: 'Messages Managed' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9★', label: 'User Rating' },
];

const integrations = [
  { name: 'M-Pesa', emoji: '💚' },
  { name: 'WhatsApp', emoji: '💬' },
  { name: 'Instagram', emoji: '📸' },
  { name: 'TikTok', emoji: '🎵' },
  { name: 'Facebook', emoji: '👥' },
  { name: 'YouTube', emoji: '▶️' },
  { name: 'Safaricom', emoji: '📱' },
  { name: 'Gmail', emoji: '📧' },
];

const faqs = [
  {
    q: 'Is my data safe and private?',
    a: 'Absolutely. SmartReach AI uses enterprise-grade security with row-level data isolation, encrypted storage, MFA support, and full audit logging. We are ODPC (Office of the Data Protection Commissioner) compliant and your data never leaves secured servers.',
  },
  {
    q: 'How does M-Pesa integration work?',
    a: 'We integrate directly with Safaricom\'s M-Pesa API via STK Push. Your customers can pay via their phone, and you receive instant notifications with automatic reconciliation in your dashboard. No third-party middlemen.',
  },
  {
    q: 'Does the AI really understand Swahili and Sheng?',
    a: 'Yes! Our AI content engine is trained to generate marketing copy, captions, and customer responses in English, Swahili, and Sheng — with cultural nuances that resonate with East African audiences.',
  },
  {
    q: 'Can I use SmartReach AI on my phone?',
    a: 'SmartReach AI is mobile-first by design. The entire platform is optimized for mobile browsers with lightweight performance, so you can manage your business from anywhere — even on slow connections.',
  },
  {
    q: 'What is Biashara Mind™?',
    a: 'Biashara Mind™ is our built-in mental wellness companion designed specifically for entrepreneurs. It includes mood tracking, burnout risk monitoring, AI-powered therapy conversations in Swahili, journaling, and crisis support with local Kenyan helplines.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes! Our Starter plan is completely free and includes 1 team member, 500 messages/month, 3 social channels, and basic AI content generation. Upgrade anytime as your business grows.',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'Perfect for solo entrepreneurs getting started',
    features: ['1 Team Member', '500 Messages/mo', '3 Social Channels', 'AI Content (10/mo)', 'Basic Analytics'],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: 'KES 2,999',
    period: '/mo',
    description: 'For growing businesses scaling their operations',
    features: ['5 Team Members', 'Unlimited Messages', 'All Social Channels', 'AI Content (Unlimited)', 'Advanced Analytics & SLA', 'M-Pesa Integration', 'Inventory Management', 'Biashara Mind™', 'Priority Support'],
    cta: 'Start 14-Day Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large teams with custom requirements',
    features: ['Unlimited Team', 'Dedicated Account Manager', 'Custom Integrations', 'White-label Options', 'API Access', 'SLA Guarantee', 'CompetEdge Intelligence', 'On-premise Option'],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const testimonials = [
  {
    quote: "SmartReach AI transformed how we manage customer conversations. Our response time dropped by 70%.",
    name: "Amina Osei",
    role: "CEO, Nairobi Crafts Co.",
    rating: 5,
  },
  {
    quote: "The AI content generator saves us hours every week. It understands our Kenyan audience perfectly.",
    name: "David Mutua",
    role: "Marketing Director, Safari Tours KE",
    rating: 5,
  },
  {
    quote: "M-Pesa integration and inventory tracking in one platform — exactly what African businesses need.",
    name: "Grace Wanjiku",
    role: "Founder, Mama Grace Foods",
    rating: 5,
  },
];

export default function Index() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SmartReach AI",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Intelligent marketing and business operations platform built for African SMEs. Unify social media, inbox, payments, inventory, and AI marketing.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "KES",
      "description": "Free starter plan available"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "1247",
      "bestRating": "5"
    },
    "author": {
      "@type": "Organization",
      "name": "SmartReach AI",
      "url": "https://craft-your-journey-35.lovable.app"
    }
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a }
    }))
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="SmartReach AI — SME Growth OS for Africa"
        description="Unify social inbox, M-Pesa payments, inventory and AI marketing for Kenyan SMEs. Swahili-aware AI, offline-first, mobile-ready."
        path="/"
        jsonLd={[softwareLd, faqLd]}
      />


      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-display font-bold text-foreground">SmartReach</span>
              <span className="text-sm font-semibold text-accent">AI</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
              <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/auth" className="hidden sm:block">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth" className="hidden sm:block">
                <Button size="sm" className="bg-gradient-primary text-primary-foreground">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border py-4 space-y-3 animate-fade-in">
              <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#testimonials" className="block text-sm text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
              <a href="#faq" className="block text-sm text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              <div className="flex gap-2 pt-2">
                <Link to="/auth" className="flex-1">
                  <Button variant="outline" className="w-full" size="sm">Sign In</Button>
                </Link>
                <Link to="/auth" className="flex-1">
                  <Button className="w-full bg-gradient-primary text-primary-foreground" size="sm">Get Started</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Static mesh gradient (no continuous animation to keep LCP fast) */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none motion-safe:animate-[spin_60s_linear_infinite]"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 40%, hsl(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 70% 60%, hsl(var(--accent)) 0%, transparent 50%), radial-gradient(circle at 50% 20%, hsl(var(--chart-5)) 0%, transparent 40%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Intelligent Marketing for African SMEs
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold text-foreground leading-tight tracking-tight">
              One Platform to{' '}
              <span className="text-gradient-primary">Grow Your</span>{' '}
              <span className="text-gradient-accent">Business</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Unify your social media, customer inbox, payments, inventory, and marketing 
              — powered by AI that understands African markets.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-primary text-primary-foreground px-8 h-12 text-base shadow-glow-primary">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="px-8 h-12 text-base">
                  See All Features
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-success" /> No credit card needed</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-success" /> M-Pesa ready</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-success" /> Swahili & Sheng AI</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted Integrations Strip */}
      <section className="border-y border-border/50 bg-muted/20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-medium text-muted-foreground uppercase tracking-widest mb-5">Integrates With Your Favorite Tools</p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {integrations.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <span className="text-xl">{item.emoji}</span>
                <span className="text-sm font-medium">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="bg-gradient-dark py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-display font-bold text-white">{stat.value}</p>
                <p className="text-sm text-white/85 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
              Everything You Need to Dominate
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Built specifically for African entrepreneurs — from M-Pesa payments to Swahili AI content.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="group hover:shadow-medium transition-all hover:-translate-y-1 border-border/50">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Highlights */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Why SmartReach AI</Badge>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-6">
                Built for Africa, By Africans
              </h2>
              <div className="space-y-6">
                {[
                  { icon: Globe, title: 'Local Market Intelligence', desc: 'AI trained on African business contexts — understands local slang, cultural nuances, and market dynamics.' },
                  { icon: Smartphone, title: 'Mobile-First Design', desc: 'Optimized for the mobile-first African market with M-Pesa integration and lightweight performance.' },
                  { icon: Shield, title: 'Enterprise-Grade Security', desc: 'Row-level security, encrypted data, MFA support, and audit logging — your data stays protected.' },
                  { icon: Brain, title: 'Entrepreneur Wellness', desc: 'Biashara Mind™ monitors burnout risk, offers AI therapy in Swahili, and celebrates your wins.' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-card rounded-2xl border shadow-medium p-8 space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">SmartReach AI Dashboard</p>
                    <p className="text-xs text-muted-foreground">Real-time business overview</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Messages Today', value: '247', change: '+18%' },
                    { label: 'Revenue (KES)', value: '124K', change: '+23%' },
                    { label: 'Active Customers', value: '1,842', change: '+12%' },
                    { label: 'CSAT Score', value: '4.8/5', change: '+0.3' },
                  ].map((m) => (
                    <div key={m.label} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-lg font-bold text-foreground">{m.value}</p>
                      <p className="text-xs text-success">{m.change}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">No hidden fees. Start free and scale as you grow.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card key={plan.name} className={`relative ${plan.highlighted ? 'border-primary shadow-glow-primary scale-105' : 'border-border/50'}`}>
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="text-xl font-display font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  <div className="mt-6 mb-6">
                    <span className="text-4xl font-display font-bold text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth">
                    <Button className={`w-full ${plan.highlighted ? 'bg-gradient-primary text-primary-foreground' : ''}`} variant={plan.highlighted ? 'default' : 'outline'}>
                      {plan.cta}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
              Loved by African Entrepreneurs
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-foreground leading-relaxed mb-6">"{t.quote}"</p>
                  <div>
                    <p className="font-semibold text-foreground">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
              Frequently Asked Questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-foreground">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-dark rounded-3xl p-12 sm:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
                Ready to Transform Your Business?
              </h2>
              <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
                Join thousands of African SMEs already using SmartReach AI to grow their businesses.
              </p>
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-accent text-accent-foreground px-10 h-12 text-base shadow-glow-accent">
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold text-foreground">SmartReach AI</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                The SME Growth Operating System — built for African businesses.
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" /> ODPC Compliant
                </Badge>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><Link to="/auth" className="hover:text-foreground transition-colors">Sign Up</Link></li>
                <li><a href="#testimonials" className="hover:text-foreground transition-colors">Testimonials</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/help" className="hover:text-foreground transition-colors">Help Center</Link></li>
                <li><a href="mailto:support@smartreach.ai" className="hover:text-foreground transition-colors">Contact Us</a></li>
                <li><a href="mailto:hello@smartreach.ai" className="hover:text-foreground transition-colors">Partnerships</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Data Protection</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} SmartReach AI. Made with ❤️ in Kenya.</p>
            <div className="flex items-center gap-6">
              <a href="https://twitter.com/smartreachai" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Twitter/X</a>
              <a href="https://linkedin.com/company/smartreachai" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">LinkedIn</a>
              <a href="https://instagram.com/smartreachai" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Instagram</a>
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Nairobi, KE</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
