const faqs = [
  {
    question: 'How do I become a seller?',
    answer:
      "Pick \"Sell keyboards\" when you register. That gives your account the seller role and unlocks the Seller Dashboard, where you can add, edit, and remove your own product listings.",
  },
  {
    question: 'What payment methods are supported?',
    answer: 'Checkout is processed securely through Stripe.',
  },
  {
    question: 'How do I track my order?',
    answer:
      'Go to your Profile page to see your full order history, including payment and delivery status for each order.',
  },
  {
    question: 'Can I edit a product after listing it?',
    answer:
      'Yes - from the Seller Dashboard, click Edit on any of your products to update its price, stock, description, or image.',
  },
  {
    question: 'Who do I contact if something goes wrong with an order?',
    answer: 'Use the Contact page and describe the issue - include your order ID if you have one.',
  },
];

/**
 * Uses native <details>/<summary> for the accordion behavior — no extra
 * JS state needed, and it's accessible/keyboard-navigable by default.
 */
const FaqScreen = () => {
  return (
    <div className="container mx-auto mt-10 max-w-3xl">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6">Frequently Asked Questions</h1>

        <div className="divide-y divide-gray-200">
          {faqs.map((faq, index) => (
            <details key={index} className="py-4 group">
              <summary className="flex justify-between items-center cursor-pointer font-semibold text-gray-800 list-none">
                {faq.question}
                <span className="text-gray-400 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-gray-600 mt-2 leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FaqScreen;
