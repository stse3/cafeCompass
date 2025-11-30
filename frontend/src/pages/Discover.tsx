import Map from '../components/map/Map'
import { motion } from 'framer-motion'

export function Discover() {
  return (
    <motion.div 
      className="relative h-screen w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Full-screen map */}
      <Map />
      
      {/* Note: Cafe details now show on the left when clicking markers */}
    </motion.div>
  )
}