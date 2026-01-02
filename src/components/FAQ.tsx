'use client'

import { useState } from 'react'

const faqs = [
  {
    question: 'How does it work?',
    answer:
      'We monitor NYC\'s official alternate side parking calendar. The evening before a suspension day (like holidays), we\'ll text you a reminder so you don\'t have to move your car. That\'s it — simple and reliable.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes! You can cancel your subscription at any time. Just text STOP to unsubscribe from alerts, or manage your billing through the link we\'ll send you.',
  },
  {
    question: 'What about snow days and emergencies?',
    answer:
      'Currently, we cover scheduled suspensions (holidays, etc.). Emergency suspensions like snow days are on our roadmap — we\'ll alert you to those too once we add that feature.',
  },
  {
    question: 'Is my information safe?',
    answer:
      'We only store your phone number and email (for receipts). We never share your data with third parties. Payments are handled securely by Stripe.',
  },
  {
    question: 'What if I don\'t reply YES?',
    answer:
      'After checkout, we\'ll text you asking to confirm. Just reply YES to start receiving alerts. If you don\'t confirm, you won\'t receive any messages (but you can text YES anytime to activate).',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-[var(--navy-800)] mb-6 text-center">
        Frequently Asked Questions
      </h2>
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="border border-[var(--navy-200)] rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-[var(--navy-50)] transition-colors"
            >
              <span className="font-medium text-[var(--navy-800)]">
                {faq.question}
              </span>
              <span className="text-[var(--navy-400)] text-xl">
                {openIndex === index ? '−' : '+'}
              </span>
            </button>
            {openIndex === index && (
              <div className="px-6 pb-4 text-[var(--navy-600)]">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
