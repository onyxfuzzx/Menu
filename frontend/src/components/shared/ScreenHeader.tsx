import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  rightAction?: React.ReactNode;
}

export default function ScreenHeader({ title, subtitle, backTo, rightAction }: ScreenHeaderProps) {
  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-stone-200/60"
    >
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-stone-100 hover:bg-stone-200 transition-colors active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 text-stone-700" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-stone-900 truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-stone-500 truncate">{subtitle}</p>
          )}
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </motion.header>
  );
}
