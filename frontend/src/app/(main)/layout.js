import Header from "@/components/Header";
import NavBar from "@/components/NavBar";
import Sidebar from "@/components/Sidebar";
import AuthGate from "@/components/AuthGate";

export default function MainLayout({ children }) {
  return (
    <AuthGate>
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <div className="mx-auto max-w-6xl px-4 py-6 grid md:grid-cols-[15rem_1fr] gap-6">
          <Sidebar />
          <main>{children}</main>
        </div>
        <NavBar />
      </div>
    </AuthGate>
  );
}
