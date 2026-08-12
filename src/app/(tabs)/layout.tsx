"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { Mail, Sprout, Home, User, Plus } from "lucide-react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

// 方案 A 导航：[信箱][行动] [＋] [花园][我的]，花园为首页
const leftTabs = [
  { href: "/mailbox", label: "信箱", icon: Mail, badge: "mailbox" as const },
  { href: "/actions", label: "行动", icon: Sprout, badge: "actions" as const },
];
const rightTabs = [
  { href: "/garden", label: "花园", icon: Home },
  { href: "/me", label: "我的", icon: User },
];

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useSWR("/api/me", fetcher, { refreshInterval: 5000 });
  const mailboxUnread = data?.counts?.mailboxUnread ?? 0;

  const Tab = ({ t }: { t: { href: string; label: string; icon: typeof Mail; badge?: "mailbox" | "actions" } }) => {
    const active = pathname.startsWith(t.href);
    const Icon = t.icon;
    const badge = t.badge === "mailbox" ? mailboxUnread : 0;
    return (
      <Link
        href={t.href}
        className="relative flex flex-1 flex-col items-center gap-0.5 py-2"
        style={{ color: active ? "var(--color-primary)" : "var(--color-ink-3)" }}
      >
        <Icon size={22} strokeWidth={active ? 2.4 : 1.9} />
        <span className="text-[10px] font-bold">{t.label}</span>
        {badge > 0 && (
          <span className="absolute right-3 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-alert px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex-1 pb-24">{children}</div>

      {/* 底部导航（＋发布居中凸起）*/}
      <nav
        className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-[480px] -translate-x-1/2 items-end justify-around bg-card pb-[env(safe-area-inset-bottom)] pt-1"
        style={{ boxShadow: "0 -2px 20px rgba(48,76,57,0.06)", height: 74 }}
      >
        {leftTabs.map((t) => (
          <Tab key={t.href} t={t} />
        ))}

        {/* 中央发布 */}
        <div className="flex flex-1 justify-center">
          <button
            aria-label="种下一件想做的事"
            onClick={() => router.push("/seed/new")}
            className="flex h-[58px] w-[58px] -translate-y-4 items-center justify-center rounded-full text-white"
            style={{
              background: "var(--color-primary)",
              border: "5px solid #fff",
              boxShadow: "0 10px 24px rgba(63,120,81,0.28)",
            }}
          >
            <Plus size={28} strokeWidth={2.4} />
          </button>
        </div>

        {rightTabs.map((t) => (
          <Tab key={t.href} t={t} />
        ))}
      </nav>
    </div>
  );
}
