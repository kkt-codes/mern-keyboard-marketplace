const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm">
          &copy; {currentYear} MERN Keyboard Marketplace. All rights reserved.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Built with ❤️ for learning the MERN stack.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
