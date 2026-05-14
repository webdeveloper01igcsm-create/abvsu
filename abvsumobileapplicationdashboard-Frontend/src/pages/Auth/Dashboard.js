import React, { useContext } from 'react';
import ApiContext from '../../Context/ApiContext';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const Dashboard = () => {
  const {
    studentCount,
    activeStudentCount,
    videoStudent,
    pendingVideo,
    verificationPending,
    user
  } = useContext(ApiContext);

  const pieData = [
    { name: 'Total Verified Video', value: videoStudent - pendingVideo - verificationPending  || 0 },
    { name: 'Not Uploaded', value: pendingVideo || 0 },
    { name: 'Not Verified', value: verificationPending || 0 },
  ];

  const COLORS = ['green', 'gray', 'red'];

  const barData = [
    {
      name: 'Students',
      Total: studentCount || 0,
      Active: activeStudentCount || 0,
    },
  ];

  return (
    <main className="p-6">
      <div className='flex w-3/4 mb-6'>
        <span className='capitalize text-5xl font-bold my-auto mr-auto'>
          Welcome {user?.name ? user?.name : 'User'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Pie Chart */}
        <div className="bg-white shadow-2xl rounded-lg p-4 flex flex-col items-center">
          <h3 className="text-lg font-bold text-gray-700 text-center font-mono">Video Verification Status ( {videoStudent} )</h3>
          <PieChart width={350} height={350}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>

        {/* Bar Chart */}
        <div className="bg-white shadow-2xl rounded-lg p-4">
          <h3 className="text-lg font-bold text-gray-700 mb-2 font-mono text-center">Mobile Application User</h3>
          <BarChart width={500} height={400} data={barData}>
            <CartesianGrid strokeDasharray="9 9" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Total" fill="#8884d8" barSize={30}/>
            <Bar dataKey="Active" fill="#82ca9d" barSize={40}/>
          </BarChart>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;