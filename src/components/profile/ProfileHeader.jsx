import { motion } from 'framer-motion';

export default function ProfileHeader({ profileMeta, text }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-2xl font-extrabold">{text('Профіль', 'Profile')}</h1>
      {profileMeta && <p className="mt-1 text-sm text-muted-foreground">{profileMeta}</p>}
    </motion.div>
  );
}
