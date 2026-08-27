import { motion } from "framer-motion";
import type { PageStatus } from "@/types";

interface StatusDotProps {
  status: PageStatus;
  size?: "sm" | "md";
}

export default function StatusDot({ status, size = "md" }: StatusDotProps) {
  const sizeClasses = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  if (status === "done") {
    return (
      <div className={`${sizeClasses} rounded-full bg-emerald-500 flex items-center justify-center`}>
        <svg className="h-2 w-2 text-white" viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (status === "active") {
    return (
      <div className="relative flex items-center justify-center">
        <motion.div
          className={`${sizeClasses} rounded-full bg-amber-500`}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <div className={`absolute ${sizeClasses} rounded-full bg-amber-500/30`} />
      </div>
    );
  }

  return <div className={`${sizeClasses} rounded-full bg-stone-300`} />;
}
