import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Ambulance,
  PhoneCall,
  ClipboardList,
  LineChart,
  Bell,
  Brain,
  ScanLine,
  Heart,
  FileSearch,
  UserCheck,
  Stethoscope,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

export function SidebarNav() {
  const [location] = useLocation();
  const { t } = useI18n();

  const mainNavItems = [
    { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
    { href: "/hospitals", label: t.nav.hospitals, icon: Building2 },
    { href: "/ambulances", label: t.nav.ambulances, icon: Ambulance },
    { href: "/book", label: t.nav.bookAmbulance, icon: PhoneCall },
    { href: "/bookings", label: t.nav.bookings, icon: ClipboardList },
    { href: "/analytics", label: t.nav.analytics, icon: LineChart },
    { href: "/alerts", label: t.nav.alerts, icon: Bell },
  ];

  const aiNavItems = [
    { href: "/ai", label: t.nav.aiToolsHub, icon: Stethoscope },
    { href: "/ai/chatbot", label: t.nav.healthChatbot, icon: MessageCircle },
    { href: "/ai/symptom-checker", label: t.nav.symptomChecker, icon: Brain },
    { href: "/ai/image-detect", label: t.nav.skinWoundAI, icon: ScanLine },
    { href: "/ai/home-care", label: t.nav.homeCare, icon: Heart },
    { href: "/ai/prescription-scanner", label: t.nav.prescriptionOCR, icon: FileSearch },
    { href: "/ai/specialist", label: t.nav.findSpecialist, icon: UserCheck },
  ];

  const isActive = (href: string) =>
    href === "/ai"
      ? location === "/ai"
      : location === href || (location.startsWith(href) && href !== "/");

  return (
    <nav className="space-y-1 p-4">
      {mainNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive(item.href)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}

      <div className="pt-3 pb-1">
        <div className="flex items-center gap-2 px-3 mb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.nav.aiHealthTools}</span>
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">Beta</Badge>
        </div>
      </div>

      {aiNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive(item.href)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}

      <div className="pt-3 pb-1">
        <div className="flex items-center gap-2 px-3 mb-1">
          <span className="text-xs font-semibold text-cyan-700 uppercase tracking-wider">Driver Sector 🚑</span>
          <Badge className="text-[10px] py-0 px-1.5 h-4 bg-cyan-700">Sector 2</Badge>
        </div>
      </div>

      <Link
        href="/driver/dashboard"
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive("/driver/dashboard")
            ? "bg-cyan-700 text-white"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Ambulance className="h-4 w-4 text-cyan-600" />
        Driver Dashboard
      </Link>
      <Link
        href="/driver/register"
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive("/driver/register")
            ? "bg-cyan-700 text-white"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <UserCheck className="h-4 w-4 text-cyan-600" />
        Driver Onboarding
      </Link>
    </nav>
  );
}
