"use client";
import Link from "next/link";
import { BookOpen, User } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { motion } from "framer-motion";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 glass">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[color:var(--color-primary)] flex items-center justify-center shadow-lg">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <Link href="/" className="text-lg font-semibold text-gradient">LOOM</Link>
        </motion.div>

        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
