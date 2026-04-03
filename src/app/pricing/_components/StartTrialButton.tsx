'use client'

export default function StartTrialButton() {
  async function handleClick() {
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const { url } = await res.json()
    window.location.href = url
  }

  return (
    <button
      onClick={handleClick}
      className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors active:scale-95 duration-75 text-lg cursor-pointer"
    >
      Start Free Trial
    </button>
  )
}
