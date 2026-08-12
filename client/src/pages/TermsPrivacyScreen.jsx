const TermsPrivacyScreen = () => {
  return (
    <div className="container mx-auto mt-10 max-w-3xl">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6">Terms & Privacy</h1>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Terms of Service</h2>
          <p className="text-gray-700 mb-3 leading-relaxed">
            By using MERN Keyboards, you agree to provide accurate account information and to use the
            marketplace only for lawful purchases and listings.
          </p>
          <p className="text-gray-700 mb-3 leading-relaxed">
            Sellers are responsible for the accuracy of their own product listings like pricing,
            availability, and description also for fulfilling orders placed against their products.
          </p>
          <p className="text-gray-700 leading-relaxed">
            We reserve the right to remove listings or suspend accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Privacy Policy</h2>
          <p className="text-gray-700 mb-3 leading-relaxed">
            We store the account information you provide (name, email, hashed password) and the order
            history associated with your account. Passwords are hashed and are never stored or
            transmitted in plain text.
          </p>
          <p className="text-gray-700 leading-relaxed">
            We don't sell your personal information to third parties. Data is used only to operate the
            marketplace - processing orders, authenticating your account, and displaying your order
            history back to you.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsPrivacyScreen;
