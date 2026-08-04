import { useState } from 'react';
import toast from 'react-hot-toast';

/**
 * Contact form. There's no backend endpoint for this yet — submitting just
 * shows a confirmation toast, the same mock pattern PaymentScreen uses for
 * "Pay with PayPal (Mock)". Wire this up to a real endpoint (e.g. an email
 * service) when one exists.
 */
const ContactScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const submitHandler = (e) => {
    e.preventDefault();
    toast.success("Message sent! We'll get back to you soon.");
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <div className="flex justify-center mt-10">
      <div className="w-full max-w-lg bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-2">Contact Us</h1>
        <p className="text-gray-600 mb-6">
          Questions about an order, a listing, or anything else? Send us a message.
        </p>

        <form onSubmit={submitHandler}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="message">
              Message
            </label>
            <textarea
              id="message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700 transition duration-300"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactScreen;
