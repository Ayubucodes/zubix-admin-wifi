import { BarChart3, CreditCard, LayoutDashboard, LogOut, Package, Repeat, Settings, Ticket, Users, Wifi } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../features/auth/AuthContext";
import type { PermissionCode } from "../types/api";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: PermissionCode;
}

/** Only pages that exist and have backend endpoints are listed. */
const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, permission: "reports:read" },
  { to: "/packages", label: "Packages", icon: Package, permission: "packages:read" },
  { to: "/customers", label: "Customers", icon: Users, permission: "customers:read" },
  { to: "/payments", label: "Payments", icon: CreditCard, permission: "payments:read" },
  { to: "/vouchers", label: "Vouchers", icon: Ticket, permission: "vouchers:read" },
  { to: "/subscriptions", label: "Subscriptions", icon: Repeat, permission: "subscriptions:read" },
  { to: "/network", label: "Network", icon: Wifi, permission: "network:read" },
  { to: "/reports", label: "Reports", icon: BarChart3, permission: "reports:read" },
  { to: "/settings", label: "Settings", icon: Settings, permission: "settings:manage" },
];

export function AppLayout() {
  const { user, hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(item.permission));

  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="h-dvh overflow-hidden md:flex">
      <aside className="shrink-0 border-b border-brand-800 bg-brand-900 md:h-dvh md:w-56 md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:py-5">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight text-solid-white">
            <img src="/favicon.svg" alt="" className="size-8 rounded-md" />
            Zubix WiFi
          </span>
          <span className="text-xs text-solid-white/70 md:hidden">{user?.fullName}</span>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3 md:pb-0">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 ${
                isActive ? "bg-gold-500 text-brand-900" : "text-solid-white/75 hover:bg-white/10 hover:text-solid-white"
                }`
              }
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-3 md:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-900">{user?.fullName}</p>
            <p className="truncate text-xs text-neutral-500">
              {user?.roles.join(", ").replaceAll("_", " ").toLowerCase()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
