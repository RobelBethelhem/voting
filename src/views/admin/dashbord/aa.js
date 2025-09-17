import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useSelector } from 'react-redux';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const VoterStatisticsDashboard = () => {
  const [votesOverTime, setVotesOverTime] = useState([]);
  const [votesByDepartment, setVotesByDepartment] = useState([]);
  const [overallVoteDistribution, setOverallVoteDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const accessToken = useSelector((state) => state.user.accessToken);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/rms/admin/landing/get_vote_stasticss", {
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const rawData = await response.json();
      setDebugInfo(JSON.stringify(rawData, null, 2));
      
      if (!Array.isArray(rawData)) {
        throw new Error('Received data is not an array');
      }

      processData(rawData);
      setLoading(false);
    } catch (error) {
      setError('Error fetching data: ' + error.message);
      setLoading(false);
    }
  };

  const processData = (rawData) => {
    // Process votes over time
    const timeVotes = rawData.reduce((acc, vote) => {
      const time = new Date(vote.TimeStamp).toLocaleTimeString();
      acc[time] = (acc[time] || 0) + 1;
      return acc;
    }, {});
    setVotesOverTime(Object.entries(timeVotes).map(([time, count]) => ({ time, count })));

    // Process votes by department
    const deptVotes = rawData.reduce((acc, vote) => {
      acc[vote.candidate_department] = (acc[vote.candidate_department] || 0) + 1;
      return acc;
    }, {});
    setVotesByDepartment(Object.entries(deptVotes).map(([department, count]) => ({ department, count })));

    // Process overall vote distribution
    const candidateVotes = rawData.reduce((acc, vote) => {
      const candidate = `${vote.candidate_first_name} ${vote.candidate_last_name}`;
      acc[candidate] = (acc[candidate] || 0) + 1;
      return acc;
    }, {});
    setOverallVoteDistribution(Object.entries(candidateVotes).map(([name, value]) => ({ name, value })));


    const deptVotesForPie = rawData.reduce((acc, vote) => {
        acc[vote.candidate_department] = (acc[vote.candidate_department] || 0) + 1;
        return acc;
      }, {});
      setVotesByDepartment(Object.entries(deptVotesForPie).map(([name, value]) => ({ name, value })));
    };
  
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
      const RADIAN = Math.PI / 180;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
      return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
          {`${name} ${(percent * 100).toFixed(0)}%`}
        </text>
      );
    

    
  };

  

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div>
        <p>{error}</p>
        <h3>Debug Information:</h3>
        <pre>{debugInfo}</pre>
      </div>
    );
  }
  return (
    <div className="p-4 bg-gray-100">
    <h1 className="text-2xl font-bold mb-4">Voter Statistics Dashboard</h1>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ... (previous chart components remain the same) ... */}

      <div className="bg-white p-4 rounded shadow col-span-1 md:col-span-2">
        <h2 className="text-xl font-semibold mb-2">Overall Vote Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={overallVoteDistribution}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={renderCustomizedLabel}
            >
              {overallVoteDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-4 rounded shadow col-span-1 md:col-span-2">
        <h2 className="text-xl font-semibold mb-2">Overall Vote Distribution By Department</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={votesByDepartment}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={renderCustomizedLabel}
            >
              {votesByDepartment.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);
};

export default VoterStatisticsDashboard;