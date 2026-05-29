'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Zap,
  Shield,
  Cpu,
  Layers,
  Sparkles,
  Monitor,
  Globe,
} from 'lucide-react';

const features = [
  {
    icon: Layers,
    title: '10GB+ Video Support',
    desc: 'Chunk-based streaming compression — never loads full files into RAM.',
  },
  {
    icon: Sparkles,
    title: 'AI Smart Presets',
    desc: 'Best quality under size limit, bitrate analysis, scene-aware recommendations.',
  },
  {
    icon: Cpu,
    title: 'GPU Acceleration',
    desc: 'NVENC, QSV, AMF, and VideoToolbox auto-detection for premium users.',
  },
  {
    icon: Shield,
    title: '100% Local Processing',
    desc: 'Your files never leave your machine. Secure temp cleanup included.',
  },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      <section className="max-w-7xl mx-auto px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-indigo-300 mb-6">
            <Zap className="w-4 h-4" /> Professional-grade compression
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Compress anything.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Keep full control.
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            UltraCompress AI handles massive videos, images, and archives with
            real-time progress, AI presets, and a beautiful creator-focused UI.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/dashboard" className="btn-primary text-lg px-8 py-4">
              Open Compressor
            </Link>
            <Link href="/pricing" className="btn-ghost text-lg px-8 py-4 border border-white/10 rounded-xl">
              View Pricing
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="mt-20 glass p-8 max-w-4xl mx-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="aspect-video rounded-xl bg-gradient-to-br from-indigo-900/40 to-violet-900/40 flex items-center justify-center border border-white/10">
            <p className="text-gray-400">Drag-drop • Progress rings • Before/after cards</p>
          </div>
        </motion.div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Built for creators & power users</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="glass-hover p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <f.icon className="w-10 h-10 text-indigo-400 mb-4" />
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-8">Cross-platform</h2>
        <div className="flex justify-center gap-12 text-gray-400">
          <div className="flex flex-col items-center gap-2">
            <Monitor className="w-8 h-8" />
            <span>Windows</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Monitor className="w-8 h-8" />
            <span>macOS</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Monitor className="w-8 h-8" />
            <span>Linux</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Globe className="w-8 h-8" />
            <span>Web</span>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} UltraCompress AI — Local processing by default
      </footer>
    </div>
  );
}
