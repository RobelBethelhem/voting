import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useSelector } from 'react-redux';
import { Select, MenuItem, TextField, Checkbox, ListItemText, OutlinedInput } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';



const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#a4de6c'];

const VoterStatisticsDashboard = () => {

  const isVote = useSelector((state) => state.isVote);
  console.log("isVoteisVoteisVoteisVoteisVoteisVoteisVote",isVote)



  const [votesOverTime, setVotesOverTime] = useState([]);
  const [votesByDepartmentBar, setVotesByDepartmentBar] = useState([]);
  const [votesByDepartmentPie, setVotesByDepartmentPie] = useState([]);
  const [overallVoteDistribution, setOverallVoteDistribution] = useState([]);
  const [departmentList, setDepartmentList] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [departmentVotesOverTime, setDepartmentVotesOverTime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [rawData, setRawData] = useState([]);
  const accessToken = useSelector((state) => state.user.accessToken);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDepartments.length > 0 && startDate && endDate) {
      processDepartmentVotesOverTime();
    }
  }, [selectedDepartments, startDate, endDate, rawData]);

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

      const data = await response.json();
      setDebugInfo(JSON.stringify(data, null, 2));
      
      if (!Array.isArray(data)) {
        throw new Error('Received data is not an array');
      }

      setRawData(data);
      processData(data);
      setLoading(false);
    } catch (error) {
      setError('Error fetching data: ' + error.message);
      setLoading(false);
    }
  };

  const processData = (data) => {
    // Process votes over time
    const timeVotes = data.reduce((acc, vote) => {
      const time = new Date(vote.TimeStamp).toLocaleTimeString();
      acc[time] = (acc[time] || 0) + 1;
      return acc;
    }, {});
    setVotesOverTime(Object.entries(timeVotes).map(([time, count]) => ({ time, count })));

    // Process votes by department for bar chart
    const deptVotesBar = data.reduce((acc, vote) => {
      acc[vote.candidate_department] = (acc[vote.candidate_department] || 0) + 1;
      return acc;
    }, {});
    setVotesByDepartmentBar(Object.entries(deptVotesBar).map(([department, count]) => ({ department, count })));

    // Process votes by department for pie chart
    const deptVotesPie = data.reduce((acc, vote) => {
      acc[vote.candidate_department] = (acc[vote.candidate_department] || 0) + 1;
      return acc;
    }, {});
    setVotesByDepartmentPie(Object.entries(deptVotesPie).map(([name, value]) => ({ name, value })));

    // Process overall vote distribution
    const candidateVotes = data.reduce((acc, vote) => {
      const candidate = `${vote.candidate_first_name} ${vote.candidate_last_name}`;
      acc[candidate] = (acc[candidate] || 0) + 1;
      return acc;
    }, {});
    setOverallVoteDistribution(Object.entries(candidateVotes).map(([name, value]) => ({ name, value })));

    // Set department list for dropdown
    const departments = [...new Set(data.map(vote => vote.candidate_department))];
    setDepartmentList(departments);
    setSelectedDepartments([departments[0]]);
  };

  const processDepartmentVotesOverTime = () => {
    const filteredVotes = rawData.filter(vote => 
      selectedDepartments.includes(vote.candidate_department) &&
      new Date(vote.TimeStamp) >= startDate &&
      new Date(vote.TimeStamp) <= endDate
    );

    const votesPerDayDept = filteredVotes.reduce((acc, vote) => {
      const date = new Date(vote.TimeStamp).toLocaleDateString();
      if (!acc[date]) acc[date] = {};
      acc[date][vote.candidate_department] = (acc[date][vote.candidate_department] || 0) + 1;
      return acc;
    }, {});

    const processedData = Object.entries(votesPerDayDept).map(([date, depts]) => ({
      date,
      ...depts
    }));

    setDepartmentVotesOverTime(processedData);
  };

  const handleDepartmentChange = (event) => {
    const {
      target: { value },
    } = event;
    setSelectedDepartments(
      typeof value === 'string' ? value.split(',') : value,
    );
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
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Votes Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={votesOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Votes by Department</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={votesByDepartmentBar}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Votes by Department (Pie Chart)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={votesByDepartmentPie}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {votesByDepartmentPie.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Overall Vote Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={overallVoteDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
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
          <h2 className="text-xl font-semibold mb-2">Department-specific Vote Analytics</h2>
          <div className="flex space-x-4 mb-4">
            <Select
              multiple
              value={selectedDepartments}
              onChange={handleDepartmentChange}
              input={<OutlinedInput />}
              renderValue={(selected) => selected.join(', ')}
              className="w-1/3"
            >
              {departmentList.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  <Checkbox checked={selectedDepartments.indexOf(dept) > -1} />
                  <ListItemText primary={dept} />
                </MenuItem>
              ))}
            </Select>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                renderInput={(params) => <TextField {...params} className="w-1/3" />}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                renderInput={(params) => <TextField {...params} className="w-1/3" />}
                minDate={startDate}
              />
            </LocalizationProvider>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={departmentVotesOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedDepartments.map((dept, index) => (
                <Line key={dept} type="monotone" dataKey={dept} stroke={COLORS[index % COLORS.length]} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default VoterStatisticsDashboard;