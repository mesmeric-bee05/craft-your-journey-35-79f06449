import { ReactNode, useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Users,
  Wallet,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  Zap,
  Video,
  Share2,
  Package,
  Contact,
  Workflow,
  FileText,
  Sun,
  Moon,
  Monitor,
  Heart,
  Target,
  Camera,
  Brain,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { GlobalSearchDialog } from '@/components/search/GlobalSearchDialog';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useQuery } from '@tanstack/react-query';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Social Inbox', icon: MessageSquare, href: '/inbox' },
  { label: 'Social Manager', icon: Share2, href: '/social' },
  { label: 'AI Marketing', icon: Sparkles, href: '/marketing' },
  { label: 'Live Studio', icon: Video, href: '/live' },
  { label: 'Talent Hub', icon: Users, href: '/talent' },
  { label: 'Customers', icon: Contact, href: '/customers' },
  { label: 'Automations', icon: Workflow, href: '/automations' },
  { label: 'Inventory', icon: Package, href: '/inventory' },
  { label: 'Payments', icon: Wallet, href: '/payments' },
  { label: 'Analytics', icon: BarChart3, href: '/analytics' },
  { label: 'Reports', icon: FileText, href: '/reports' },
  { label: 'Competitors', icon: Target, href: '/competitors' },
  { label: 'Vision', icon: Camera, href: '/vision' },
  { label: 'Biashara Mind', icon: Brain, href: '/wellness' },
];

const bottomNavItems: NavItem[] = [
  { label: 'Settings', icon: Settings, href: '/settings' },
  { label: 'Help Center', icon: HelpCircle, href: '/help' },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };
  const icon = theme === 'dark' ? <Moon className="w-5 h-5" /> : theme === 'light' ? <Sun className="w-5 h-5" /> : <Monitor className="w-5 h-5" />;
  return (
    <Button variant="ghost" size="icon" onClick={cycleTheme} title={`Theme: ${theme}`}>
      {icon}
    </Button>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const { business } = useBusiness();
  useSessionTimeout();

  // Dynamic unread count for inbox badge
  const { data: unreadCount } = useQuery({
    queryKey: ['inbox-unread-count', business?.id],
    queryFn: async () => {
      if (!business?.id) return 0;
      const { count } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gt('unread_count', 0);
      return count || 0;
    },
    enabled: !!business?.id,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const navItems = useMemo(() => mainNavItems.map(item =>
    item.href === '/inbox' && unreadCount ? { ...item, badge: unreadCount } : item
  ), [unreadCount]);

  // Keyboard shortcut for search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const userInitials = (profile?.full_name || user?.user_metadata?.full_name)
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
            <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-display font-bold text-sidebar-foreground">SmartReach</span>
              <span className="text-sm text-sidebar-primary font-medium ml-1">AI</span>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow-accent'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-accent text-accent-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Navigation */}
          <div className="px-4 py-4 border-t border-sidebar-border space-y-1">
            {bottomNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-8 bg-background/80 backdrop-blur-xl border-b border-border">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Search Button */}
          <div className="hidden md:flex flex-1 max-w-md ml-4 lg:ml-0">
            <Button
              variant="outline"
              className="w-full justify-start text-muted-foreground bg-muted/50 border-0 hover:bg-muted"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="mr-2 h-4 w-4" />
              <span>Search anything...</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>

          {/* Global Search Dialog */}
          <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <NotificationCenter />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm font-medium">
                    {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/help')}>
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Help Center
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
