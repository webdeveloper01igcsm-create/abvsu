import React from 'react';

const Landing = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-orange-500 to-red-500 text-white relative">
      <a
        href="/login"
        className="absolute top-4 right-4 bg-white text-blue-500 hover:bg-blue-500 hover:text-white font-semibold py-2 px-4 rounded shadow-lg transition duration-300"
      >
        Login
      </a>

      <h1 className="text-4xl font-bold mb-4">
        Welcome to Sikkim Global Technical University
      </h1>
      <p className="text-lg mb-8">Your journey to excellence starts here.</p>

      <a
        href="https://play.google.com/store/apps/details?id=com.dev_karan.sikkimglobaltechnicaluniversity" 
        target="_blank"
        rel="noopener noreferrer"
        className="bg-white text-blue-500 hover:bg-blue-500 hover:text-white font-semibold py-2 px-4 rounded shadow-lg transition duration-300"
      >
        Get Started
      </a>
    </div>
  );
};

export default Landing;