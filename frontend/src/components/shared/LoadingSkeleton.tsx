import { motion } from "framer-motion";

export default function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="space-y-3"
        >
          <div className="h-5 w-32 bg-stone-200 rounded-md animate-pulse" />
          <div className="rounded-xl border border-stone-200 p-4 space-y-3">
            <div className="flex gap-3">
              <div className="h-4 w-4 bg-stone-200 rounded animate-pulse" />
              <div className="h-4 flex-1 bg-stone-200 rounded animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="h-4 w-4 bg-stone-200 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-stone-200 rounded animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="h-6 w-16 bg-amber-100 rounded-full animate-pulse" />
              <div className="h-6 w-12 bg-stone-200 rounded animate-pulse" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
