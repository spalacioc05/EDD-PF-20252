import Link from "next/link";
import { Home, Search, Upload, User, BookOpen } from "lucide-react";

export default function Sidebar() {
  const items = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/search", label: "Buscar", icon: Search },
    { href: "/upload", label: "Subir", icon: Upload },
    { href: "/profile", label: "Perfil", icon: User },
  ];
  return (
    <aside className="hidden md:block sticky top-0 h-[calc(100vh-0px)] w-60 p-4 pr-6">
      <div className="card p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[color:var(--color-primary)] flex items-center justify-center"><BookOpen className="h-4 w-4 text-white" /></div>
          <span className="font-semibold">LOOM</span>
        </div>
        <nav className="space-y-1">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5">
              <it.icon className="h-5 w-5 text-gray-300" />
              <span>{it.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
