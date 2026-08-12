"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { Home, Mail, Sprout, Trees, User, Plus } from "lucide-react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

const tabs = [
  { href: "/garden", label: "花园", icon: Home },
  { href: "/mailbox", label: "信箱", icon: Mail },
  { href: "/actions", label: "行动中", icon: Sprout },
  { href: "/forest", label: "森林", icon: Trees },
  { href: "/me", label: "我的", icon: User },
];

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useSWR("/api/me", fetcher, { refreshInterval: 5000 });
  const unread = data?.counts?.mailboxUnread ?? 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex-1 pb-24">{children}</div>

      {/* 中央发布按钮 */}
      <button
        aria-label="种下一颗种子"
        onClick={() => router.push("/seed/new")}
        className="btn-primary fixed bottom-16 left-1/2 z-30 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full shadow-lg"
        style={{ maxWidth: "480px" }}
      >
        <Plus size={28} strokeWidth={2.2} />
      </button>

      {/* 底部导航 */}
      <nav
        className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-[480px] -translate-x-1/2 items-center justify-around border-t bg-card pb-[env(safe-area-inset-bottom)]"
        style={{ borderColor: "var(--color-card-border)" }}
      >
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="relative flex flex-col items-center gap-0.5 px-3 py-2"
              style={{ color: active ? "var(--color-primary)" : "var(--color-ink-3)" }}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[11px]">{t.label}</span>
              {t.href === "/mailbox" && unread > 0 && (
                <span className="absolute -top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-alert px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
