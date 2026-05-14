import React, { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ApiContext from '../../Context/ApiContext';

const StudentVerify = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const {apiBaseUrl} = useContext(ApiContext)

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const response = await axios.get(`${apiBaseUrl}result/verify/${id}`);
        setData(response.data.data);
      } catch (err) {
        setError('Failed to fetch student data. Please check the ID or try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id]);

  if (loading) return <div className="text-center mt-8">Loading...</div>;
  if (error) return <div className="text-red-600 text-center mt-8">{error}</div>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Student Marksheet Verification</h2>
      <table className="w-full table-auto border border-gray-300">
        <tbody>
          <tr>
            <td className="border px-4 py-2 font-semibold">Student Name</td>
            <td className="border px-4 py-2 capitalize">{data.studentName}</td>
          </tr>
          <tr>
            <td className="border px-4 py-2 font-semibold">Father Name</td>
            <td className="border px-4 py-2">{data.fatherName}</td>
          </tr>
          <tr>
            <td className="border px-4 py-2 font-semibold">Enrollment Number</td>
            <td className="border px-4 py-2">{data.enrollmentNumber}</td>
          </tr>
          <tr>
            <td className="border px-4 py-2 font-semibold">Course</td>
            <td className="border px-4 py-2">{data.course}</td>
          </tr>
          <tr>
            <td className="border px-4 py-2 font-semibold">Stream</td>
            <td className="border px-4 py-2">{data.stream || 'N/A'}</td>
          </tr>
          <tr>
            <td className="border px-4 py-2 font-semibold">Semester</td>
            <td className="border px-4 py-2">{data.semester}</td>
          </tr>
          <tr>
            <td className="border px-4 py-2 font-semibold">Serial Number</td>
            <td className="border px-4 py-2">{data.serialNumber}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default StudentVerify;
