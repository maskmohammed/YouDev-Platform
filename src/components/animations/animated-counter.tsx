"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView, useMotionValue, useSpring } from "framer-motion"

type AnimatedCounterProps = {
  value: number
  suffix?: string
  prefix?: string
//   duration?: number
  className?: string
}

export default function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
//   duration: _duration = 1.2,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null)

  const isInView = useInView(ref, {
    once: true,
    margin: "-80px",
  })

  const motionValue = useMotionValue(0)

  const springValue = useSpring(motionValue, {
    stiffness: 80,
    damping: 22,
    mass: 0.8,
  })

  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (isInView) {
      motionValue.set(value)
    }
  }, [isInView, motionValue, value])

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayValue(Math.round(latest))
    })

    return () => unsubscribe()
  }, [springValue])

  return (
    <motion.span ref={ref} className={className}>
      {prefix}
      {displayValue.toLocaleString("fr-FR")}
      {suffix}
    </motion.span>
  )
}