'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('[ContactForm] Submitted:', form)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-5 text-green-800">
          <p className="font-semibold text-lg">Message received</p>
          <p className="text-sm mt-1">Thank you for reaching out. We'll get back to you shortly.</p>
        </div>
        <Link
          href="/"
          className="inline-block bg-[#0f1e3c] text-white px-6 py-3 rounded-xl font-medium text-base hover:bg-[#1a2f5a] transition-colors active:scale-95 duration-75"
        >
          ← Back to Home
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#0f1e3c]"
          placeholder="Jane Smith"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#0f1e3c]"
          placeholder="jane@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#0f1e3c] resize-none"
          placeholder="Your question or message..."
        />
      </div>
      <button
        type="submit"
        className="bg-[#0f1e3c] text-white px-6 py-3 rounded-xl font-medium text-base hover:bg-[#1a2f5a] transition-colors active:scale-95 duration-75 min-h-[44px]"
      >
        Send Message
      </button>
    </form>
  )
}
