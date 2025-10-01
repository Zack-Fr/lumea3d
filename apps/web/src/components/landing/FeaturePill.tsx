import { memo } from "react";
import { motion } from "framer-motion";

interface FeaturePillProps {
  feature: string;
  index: number;
  className?: string;
}

const FeaturePill = memo(({ feature, index, className = "" }: FeaturePillProps) => {
  return (
    <motion.div 
      className={`glass border-glow px-4 py-2 rounded-full transition-all duration-300 hover:glow-yellow ${className}`}
      whileHover={{ scale: 1.05 }}
      transition={{ delay: index * 0.1 }}
    >
      <span className="text-[var(--glass-gray)] text-sm">{feature}</span>
    </motion.div>
  );
});

FeaturePill.displayName = 'FeaturePill';

export default FeaturePill;