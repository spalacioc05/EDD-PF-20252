"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Upload, User } from "lucide-react";
import { motion } from "framer-motion";

const NavItem = ({ href, icon: Icon, label }) => {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
  return (
    <Link href={href} className="flex-1">
      <div className="relative flex flex-col items-center justify-center py-3 text-xs">
        <Icon className={`h-5 w-5 ${active ? "text-[color:var(--color-accent)]" : "text-gray-400"}`} />
        <span className={`mt-1 ${active ? "text-white" : "text-gray-400"}`}>{label}</span>
        {active && (
          <motion.span layoutId="nav-active" className="absolute -top-1 h-1 w-8 rounded-full bg-[color:var(--color-primary)]" />
        )}
      </div>
    </Link>
  );
};

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between px-4">
        <NavItem href="/" icon={Home} label="Inicio" />
        <NavItem href="/search" icon={Search} label="Buscar" />
        <NavItem href="/upload" icon={Upload} label="Subir" />
        <NavItem href="/profile" icon={User} label="Perfil" />
      </div>
    </nav>
  );
}
