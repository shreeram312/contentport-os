'use client'
import dynamic from 'next/dynamic'
import React from 'react'

const Testimonials = dynamic(
  () => import('@/app/testimonials').then((mod) => ({ default: mod.Testimonials })),
  { ssr: false },
)
const CustomTestimonials = () => {
  return (
    <div>
      <Testimonials />
    </div>
  )
}

export default CustomTestimonials
