import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { Home, LayoutDashboard, Hospital, Ambulance, Bot, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function MobileBottomNav() {
  const [location] = useLocation();
  const { t } = useI18n();

  const navItems = [
    { href: "/", label: t.nav.home || "Home", icon: Home },
    { href: "/dashboard", label: t.nav.dashboard || "Dashboard", icon: LayoutDashboard },
    { href: "/hospitals", label: t.nav.hospitals || "Hospitals", icon: Hospital },
    { href: "/book", label: t.nav.bookAmbulance || "Book", icon: Ambulance, highlight: true },
    { href: "/ai", label: "AI Hub", icon: Sparkles },
    { href: "/ai/chatbot", label: "Chatbot", icon: Bot },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 lg:hidden shadow-lg">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center w-full py-1 text-[11px] font-medium transition-colors cursor-pointer",
                  isActive
                    ? "text-indigo-600 font-bold"
                    : item.highlight
                    ? "text-red-600 font-semibold"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                <div
                  className={cn(
                    "p-1 rounded-full mb-0.5",
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : item.highlight
                      ? "bg-red-50 text-red-600"
                      : "text-gray-500"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="truncate max-w-[64px]">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
