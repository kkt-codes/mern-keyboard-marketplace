const AboutScreen = () => {
  return (
    <div className="container mx-auto mt-10 max-w-3xl">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6">About MERN Keyboards</h1>

        <p className="text-gray-700 mb-4 leading-relaxed">
          MERN Keyboards is a marketplace built for mechanical keyboard enthusiasts — a place where
          independent sellers can list their builds and buyers can browse, compare, and order without
          the noise of a general-purpose marketplace.
        </p>
        <p className="text-gray-700 mb-4 leading-relaxed">
          Every listing is posted directly by the seller who owns it, with full control over pricing,
          stock, and product details. Buyers get a straightforward shopping experience: browse, add to
          cart, check out, and track order history from one place.
        </p>
        <p className="text-gray-700 leading-relaxed">
          This project is built on the MERN stack (MongoDB, Express, React, Node.js) as a hands-on
          exploration of full-stack e-commerce architecture — authentication, role-based access,
          checkout flows, and seller tooling, all built from scratch.
        </p>
      </div>
    </div>
  );
};

export default AboutScreen;
