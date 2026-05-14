import React, { useState } from 'react';

const DeleteAccount = () => {
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  const handleInputChange = (e) => {
    setEnrollmentNumber(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTimeout(() => {
      setShowMessage(true);
    }, 3000); // Simulate delay
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Delete Account</h2>
        <div className="mb-4">
          <label htmlFor="enrollmentNumber" className="block text-gray-700 text-sm font-bold mb-2">
            Enrollment Number
          </label>
          <input
            type="text"
            id="enrollmentNumber"
            value={enrollmentNumber}
            onChange={handleInputChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter your enrollment number"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
        >
          Submit
        </button>
      </form>
      {showMessage && (
        <div className="mt-4 text-center text-red-600">
          Your account will be deleted within 30 days.
        </div>
      )}
    </div>
  );
};

export default DeleteAccount;