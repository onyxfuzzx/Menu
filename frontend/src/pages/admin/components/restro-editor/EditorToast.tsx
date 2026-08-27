import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  message: string | null;
  type: 'success' | 'error';
}

export default function EditorToast({ message, type }: Props) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-bold shadow-xl"
          style={{
            background: type === 'success' ? '#16a34a' : '#dc2626',
            color: '#fff',
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
