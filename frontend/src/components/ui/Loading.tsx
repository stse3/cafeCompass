import { motion } from 'framer-motion';

interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ 
  message = 'Loading...', 
  size = 'md' 
}: LoadingProps) {
  const sizeMap = {
    sm: 8,
    md: 12,
    lg: 16
  };

  const gapMap = {
    sm: 4,
    md: 8,
    lg: 12
  };

  const dotSize = sizeMap[size];
  const gap = gapMap[size];

  const loadingContainer = {
    width: `${dotSize * 3 + gap * 2}px`,
    height: `${dotSize}px`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '0 auto 16px auto'
  };

  const loadingCircle = {
    display: 'block',
    height: `${dotSize}px`,
    width: `${dotSize}px`,
    backgroundColor: '#C87741',
    borderRadius: '50%'
  };

  const loadingContainerVariants = {
    start: {
      transition: {
        staggerChildren: 0.2
      }
    },
    end: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const loadingCircleVariants = {
    start: {
      y: 0
    },
    end: {
      y: -10
    }
  };

  const loadingCircleTransition = {
    duration: 0.5,
    repeat: Infinity,
    repeatType: "reverse" as const,
    ease: "easeInOut"
  };

  return (
    <div className="text-center">
      <motion.div
        style={loadingContainer}
        variants={loadingContainerVariants}
        initial="start"
        animate="end"
      >
        <motion.span
          style={loadingCircle}
          variants={loadingCircleVariants}
          transition={loadingCircleTransition}
        />
        <motion.span
          style={loadingCircle}
          variants={loadingCircleVariants}
          transition={loadingCircleTransition}
        />
        <motion.span
          style={loadingCircle}
          variants={loadingCircleVariants}
          transition={loadingCircleTransition}
        />
      </motion.div>
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  );
}
