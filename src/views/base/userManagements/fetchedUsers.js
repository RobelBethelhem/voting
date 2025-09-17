// import { useEffect, useState } from 'react';
// import axios from 'axios';
// Function to fetch users using axios
// export const fetchUsers = async () => {
//   try {
//     const response = await axios.get('http://localhost:5000/api/getUsers');
//     console.log("fweeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
//     return response.data;
    
//   } catch (error) {
//     console.error('Error fetching users:', error);
//     throw error; // Ensure errors are thrown so React Query can handle them
//   }
// };



export const usStates = [
 'branch','branch_management', 'auditor', 'fund_management', 'card_production', 'admin'
];