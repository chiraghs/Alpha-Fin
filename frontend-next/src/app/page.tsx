import { AppRouter } from "@/components/AppRouter";
import { ToastProvider } from "@/components/Toast";

export default function Home() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
}
