
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowRightLeft,
  LayoutDashboard,
  LogOut,
  Shield,
  User,
  Wallet,
  Wrench,
  Home,
  Send,
  Briefcase,
  Activity,
  PlusCircle,
  Users as TeamIcon,
  MessageSquare,
  Phone,
  Megaphone,
  X as CloseIcon,
  Contact,
  DollarSign,
  Package,
  LineChart,
  Users2,
  History,
  Landmark,
  Settings2,
  Download,
} from 'lucide-react';
import { FaWhatsapp, FaTelegram } from 'react-icons/fa';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { CurrencyProvider, useCurrency } from '@/context/currency-context';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { UserProfile } from '@/lib/types';


const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Depósitos' },
  { href: '/dashboard/plans', icon: Package, label: 'Planes' },
  { href: '/dashboard/investments', icon: LineChart, label: 'Inversiones' },
  { href: '/dashboard/team', icon: Users2, label: 'Equipo' },
  {
    href: '/dashboard/transactions',
    icon: History,
    label: 'Transacciones',
  },
  { href: '/dashboard/addresses', icon: Landmark, label: 'Retirar' },
];

const adminNavItems = [
  { href: '/dashboard/admin', icon: Settings2, label: 'Admin' },
];

function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  const toggleCurrency = () => {
    setCurrency(currency === 'USD' ? 'COP' : 'USD');
  };

  return (
    <Button variant="outline" size="sm" onClick={toggleCurrency} className="w-20">
      {currency}
    </Button>
  );
}

function TopBar() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { appConfig } = useCurrency();

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  const userPhoneNumber = React.useMemo(() => {
    return user?.email?.split('@')[0];
  }, [user?.email]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-4 font-semibold">
        <Link href="/dashboard" className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline-block">MoneyGo</span>
        </Link>
        <div className="flex items-center gap-2 font-semibold text-sm">
            {userPhoneNumber && (
                <>
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{userPhoneNumber}</span>
                </>
            )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <CurrencySwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Contact className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            {appConfig?.apkDownloadUrl && (
                <DropdownMenuItem asChild>
                    <a href={appConfig.apkDownloadUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        <span>Descargar App</span>
                    </a>
                </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function BottomNavBar() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const checkAdminStatus = async () => {
      if (user && firestore) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            if (userData.isSuperAdmin || userData.isDepositAdmin) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [user, firestore]);

  const allNavItems = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-center gap-2">
        {allNavItems.map((item) => {
          const isActive =
            pathname.startsWith(item.href) &&
            (item.href === '/dashboard' ? pathname === item.href : true);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive && 'text-primary'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SupportButton() {
  const { appConfig } = useCurrency();

  const hasSupportOptions =
    appConfig?.support_whatsapp_group ||
    appConfig?.support_whatsapp_number ||
    appConfig?.support_telegram_group;

  if (!hasSupportOptions) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="end" side="top">
        <div className="flex flex-col gap-2">
          {appConfig.support_whatsapp_number && (
            <Button
              asChild
              variant="ghost"
              className="justify-start gap-3 px-3"
            >
              <a
                href={`https://wa.me/${appConfig.support_whatsapp_number.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaWhatsapp className="h-5 w-5 text-green-500" />
                <span>Contactar Asesor</span>
              </a>
            </Button>
          )}
          {appConfig.support_whatsapp_group && (
            <Button
              asChild
              variant="ghost"
              className="justify-start gap-3 px-3"
            >
              <a
                href={appConfig.support_whatsapp_group}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaWhatsapp className="h-5 w-5 text-green-500" />
                <span>Grupo WhatsApp</span>
              </a>
            </Button>
          )}
          {appConfig.support_telegram_group && (
            <Button
              asChild
              variant="ghost"
              className="justify-start gap-3 px-3"
            >
              <a
                href={appConfig.support_telegram_group}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaTelegram className="h-5 w-5 text-blue-500" />
                <span>Grupo Telegram</span>
              </a>
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FloatingAnnouncement() {
    const { appConfig } = useCurrency();

    if (!appConfig?.announcement_enabled || !appConfig?.announcement_message) {
        return null;
    }

    return (
        <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-primary/10 px-6 py-2.5 sm:px-3.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="text-sm leading-6 text-foreground">
                    <Megaphone className="inline h-5 w-5 mr-2" />
                    <strong className="font-semibold">Aviso:</strong>
                    <svg viewBox="0 0 2 2" className="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true"><circle cx="1" cy="1" r="1" /></svg>
                    {appConfig.announcement_message}
                </p>
            </div>
        </div>
    );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <TopBar />
      <FloatingAnnouncement />
      <main className="flex-1 p-4 pb-24 sm:p-6">{children}</main>
      <SupportButton />
      <BottomNavBar />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CurrencyProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </CurrencyProvider>
  );
}
