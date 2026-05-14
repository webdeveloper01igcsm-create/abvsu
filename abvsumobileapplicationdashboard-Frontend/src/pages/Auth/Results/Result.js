import React from 'react'
import RegisteredStudent from "../../../lib/Tables/RegisteredStudent";


const Student = () => {
  return (
    <>
      <div className="flex flex-row justify-between items-center bg-blue-600 p-2 py-3 text-white">
        <div className="text-xl font-semibold">Result Management</div>
      </div>
      <RegisteredStudent />
    </>
  );
}

export default Student