"use client"

import { motion } from "framer-motion"

type FloatingGlowProps = {
  className?: string
  size?: "sm" | "md" | "lg"
  position?: "left" | "right" | "center"
}

export default function FloatingGlow({
  className = "",
  size = "md",
  position = "center",
}: FloatingGlowProps) {
  const sizeClass = {
    sm: "h-40 w-40",
    md: "h-72 w-72",
    lg: "h-96 w-96",
  }[size]

  const positionClass = {
    left: "left-0",
    center: "left-1/2 -translate-x-1/2",
    right: "right-0",
  }[position]

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute ${positionClass} ${sizeClass} rounded-full bg-cyan-400/10 blur-3xl ${className}`}
      animate={{
        y: [0, -18, 0],
        scale: [1, 1.08, 1],
        opacity: [0.45, 0.75, 0.45],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}