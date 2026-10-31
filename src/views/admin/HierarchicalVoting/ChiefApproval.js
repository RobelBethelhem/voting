import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { motion } from 'framer-motion';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE } from 'src/api/base';

const ChiefApproval = () => {
  const accessToken = useSelector((state) => state.user.accessToken);
  const userInfo = useSelector((state) => state.user.userInfo);

  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // New state for Selected Staff and Review tabs
  const [quotaInfo, setQuotaInfo] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [departmentReviews, setDepartmentReviews] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [selectedForQuota, setSelectedForQuota] = useState([]);

  // New state for 3-phase calculation results
  const [threePhaseResults, setThreePhaseResults] = useState(null);
  const [detailedCalculations, setDetailedCalculations] = useState(null);
  const [calculationLoading, setCalculationLoading] = useState(false);

  // State for rejection reason dialog
  const [rejectionDialog, setRejectionDialog] = useState({
    open: false,
    employeeId: null,
    employeeName: '',
    reason: '',
    comments: ''
  });

  // Latest re-rating request to the Deputy Chief Human Capital, and the pop-up that offers one
  const [reRating, setReRating] = useState(null);
  // Approvals go to the current fiscal year
  const [fiscalYear, setFiscalYear] = useState(null);
  const [reRatingDialog, setReRatingDialog] = useState({
    open: false,
    employeeId: null,
    employeeName: ''
  });
  const reRatingOpen = ['pending', 're_rating'].includes(reRating?.status);

  useEffect(() => {
    console.log('ChiefApproval useEffect - userInfo:', userInfo);
    console.log('ChiefApproval useEffect - userInfo roles:', userInfo?.roles);
    console.log('ChiefApproval useEffect - is chief?', userInfo?.roles?.includes('chief'));

    if (userInfo?.roles?.includes('chief')) {
      fetchQuotaInfo();
      fetchAvailableStaff();
      fetchDepartmentReviews();
      fetchReRatingStatus();
      fetchCurrentFiscalYear();
    }
  }, [userInfo]);

  // Generate performance-based selection when both quotaInfo and availableStaff are loaded
  useEffect(() => {
    if (quotaInfo && availableStaff.length > 0) {
      generatePerformanceBasedSelection(availableStaff);
    }
  }, [quotaInfo, availableStaff]);

  // Fetch current approval status for staff after performance selection is generated
  useEffect(() => {
    if (selectedForQuota.length > 0) {
      fetchCurrentApprovalStatus();
    }
  }, [selectedForQuota.length]);


  // New fetch functions for Selected Staff and Review tabs
  const fetchQuotaInfo = async () => {
    try {
      console.log('Fetching quota info for authenticated chief');
      console.log('Available userInfo:', userInfo);
      console.log('Available accessToken:', accessToken ? 'Present' : 'Missing');

      const response = await fetch(`${API_BASE}/admin/quota/my-quota`, {
        headers: {
          'x-access-token': accessToken
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Quota data received:', data);
        setQuotaInfo(data.data);
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Error fetching quota info:', error);
    }
  };

  // Function to fetch departments and their manager relationships
  const fetchDepartmentManagerRelationships = async () => {
    try {
      // Try multiple possible endpoints for departments
      const endpoints = [
        `${API_BASE}/admin/departments`,
        `${API_BASE}/departments`,
        `${API_BASE}/admin/department`,
        `${API_BASE}/managerial-rating/departments`
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying department endpoint: ${endpoint}`);
          const response = await fetch(endpoint, {
            headers: {
              'x-access-token': accessToken
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`📊 Department API response from ${endpoint}:`, data);

            // Handle different response formats
            let departments = [];
            if (data.success && data.data) {
              departments = data.data;
            } else if (data.data) {
              departments = data.data;
            } else if (Array.isArray(data)) {
              departments = data;
            }

            if (departments.length > 0) {
              // Create mapping of manager_id -> department_name
              const managerToDepartmentMap = {};
              departments.forEach(dept => {
                // Try different possible field names for manager_id
                const managerId = dept.manager_id || dept.managerId || dept.manager || dept.department_manager_id;
                const deptName = dept.name || dept.department_name || dept.departmentName || dept.dept_name;

                if (managerId && deptName) {
                  managerToDepartmentMap[managerId] = deptName;
                  console.log(`✅ Found manager-department mapping: ${managerId} -> ${deptName}`);
                }
              });

              if (Object.keys(managerToDepartmentMap).length > 0) {
                console.log('🎯 Final manager-to-department mapping:', managerToDepartmentMap);
                return managerToDepartmentMap;
              }
            }
          }
        } catch (endpointError) {
          console.log(`⚠️ Endpoint ${endpoint} failed:`, endpointError.message);
          continue;
        }
      }

      console.warn('❌ Could not fetch department-manager relationships from any endpoint');
    } catch (error) {
      console.error('Error fetching department-manager relationships:', error);
    }
    return {};
  };

  const fetchAvailableStaff = async () => {
    try {
      // First, get the department-manager relationships
      const managerToDepartmentMap = await fetchDepartmentManagerRelationships();
      console.log('🏢 Manager to Department mapping:', managerToDepartmentMap);

      const response = await fetch(`${API_BASE}/managerial-rating/staff-under-chief`, {
        headers: {
          'x-access-token': accessToken
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.error === false && data.data) {
          // Process staff and assign correct departments, especially for managers
          const processedStaff = data.data.map(person => {
            let assignedDepartment = person.department;

            // If this person is a manager, find which department they manage
            if (isEmployeeManager(person)) {
              const managedDepartment = managerToDepartmentMap[person.employee_id];
              if (managedDepartment) {
                assignedDepartment = managedDepartment;
                console.log(`👨‍💼 Manager ${person.employee_id} (${person.first_name} ${person.last_name}) assigned to managed department: ${managedDepartment}`);
              } else {
                console.warn(`⚠️ Manager ${person.employee_id} not found in department-manager mapping, using current department: ${assignedDepartment || 'Unassigned'}`);
              }
            }

            // Ensure no "Management" department
            if (assignedDepartment === 'Management' || assignedDepartment === 'management') {
              assignedDepartment = person.original_department || person.function || person.dept || 'Unassigned';
            }

            // Default to 'Unassigned' if still no department
            if (!assignedDepartment) {
              assignedDepartment = 'Unassigned';
            }

            return {
              ...person,
              department: assignedDepartment
            };
          });

          // If we couldn't get manager-department mapping, try to infer from staff distribution
          if (Object.keys(managerToDepartmentMap).length === 0) {
            console.log('🔄 No manager-department mapping found, trying to infer from staff data...');

            // Group non-managerial staff by department
            const departmentStaffCount = {};
            processedStaff.forEach(person => {
              if (!isEmployeeManager(person) && person.department !== 'Unassigned') {
                departmentStaffCount[person.department] = (departmentStaffCount[person.department] || 0) + 1;
              }
            });

            console.log('📊 Department staff distribution:', departmentStaffCount);

            // For managers in "Unassigned", try to assign them to departments that have staff
            const departmentsWithStaff = Object.keys(departmentStaffCount);
            let managerIndex = 0;

            processedStaff.forEach((person, index) => {
              if (isEmployeeManager(person) && person.department === 'Unassigned' && departmentsWithStaff.length > 0) {
                const targetDepartment = departmentsWithStaff[managerIndex % departmentsWithStaff.length];
                processedStaff[index].department = targetDepartment;
                console.log(`🎯 Inferred: Manager ${person.employee_id} assigned to department ${targetDepartment}`);
                managerIndex++;
              }
            });
          }

          console.log('📊 Final staff department assignments:', processedStaff.map(p => ({
            id: p.employee_id,
            name: `${p.first_name} ${p.last_name}`,
            dept: p.department,
            isManager: isEmployeeManager(p)
          })));

          // Filter staff based on Performance (50%) >= 45.25
          // Performance (50%) = performance_appraisal_score / 2
          // So we need performance_appraisal_score >= 90.5
          const filteredStaff = processedStaff.filter(person => {
            const performance50 = (person.performance_appraisal_score || 0) / 2;
            return performance50 >= 45.25;
          });

          console.log('🎯 Filtered staff (Performance 50% >= 45.25):', filteredStaff.length, 'out of', processedStaff.length);

          setAvailableStaff(filteredStaff);
        }
      }
    } catch (error) {
      console.error('Error fetching available staff:', error);
    }
  };

  const fetchDepartmentReviews = async () => {
    try {
      const response = await fetch(`${API_BASE}/managerial-rating/department-ratings-under-chief`, {
        headers: {
          'x-access-token': accessToken
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.error === false && data.data) {
          setDepartmentReviews(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching department reviews:', error);
    }
  };

  const fetchCurrentFiscalYear = async () => {
    try {
      const response = await fetch(`${API_BASE}/fiscal-years/current`, {
        headers: {
          'x-access-token': accessToken
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFiscalYear(data.data);
      }
    } catch (error) {
      console.error('Error fetching current fiscal year:', error);
    }
  };

  const fetchReRatingStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/re-rating/my-status`, {
        headers: {
          'x-access-token': accessToken
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReRating(data.data);
      }
    } catch (error) {
      console.error('Error fetching re-rating status:', error);
    }
  };

  // Function to fetch current approval status for selected staff
  const fetchCurrentApprovalStatus = async () => {
    if (selectedForQuota.length === 0) return;

    try {
      console.log('Fetching current approval status for staff...');

      // Use the existing endpoint to get all staff approvals for this chief
      const response = await fetch(`${API_BASE}/staff-approval/my-staff-approvals`, {
        method: 'GET',
        headers: {
          'x-access-token': accessToken
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Current staff approvals:', data);

        if (data.success && data.data && data.data.staff_approvals) {
          // Update selectedForQuota with current approval status
          setSelectedForQuota(prev =>
            prev.map(staff => {
              const approvalRecord = data.data.staff_approvals.find(item => item.employee_id === staff.employee_id);
              if (approvalRecord) {
                return {
                  ...staff,
                  approval_status: approvalRecord.approval_status,
                  submitted_for_approval: true, // If found in system, it's been submitted
                  rejection_reason: approvalRecord.rejection_reason || null,
                  approved_at: approvalRecord.reviewed_at || null,
                  rejected_at: approvalRecord.reviewed_at || null,
                  comments: approvalRecord.comments || null
                };
              }
              return staff;
            })
          );

          toast.success('Approval status refreshed successfully!');
        }
      } else if (response.status === 404) {
        // If no approval records found, that's okay
        console.log('No approval records found');
        toast.info('No approval records found for current staff');
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch approval status:', errorData);
        toast.error('Failed to refresh approval status');
      }
    } catch (error) {
      console.error('Error fetching current approval status:', error);
      toast.error('Error refreshing approval status');
    }
  };

  // Function to perform 3-phase calculations using available staff data
  const performThreePhaseCalculations = async () => {
    if (!availableStaff || availableStaff.length === 0) {
      toast.error('No staff data available for calculations');
      return;
    }

    setCalculationLoading(true);
    console.log('🔄 Starting 3-phase calculations with available staff data...');

    try {
      // Use the existing 3-phase calculation logic but with local data
      const calculationResults = await generateCompleteThreePhaseCalculations(availableStaff);

      console.log('✅ 3-Phase calculations completed:', calculationResults);
      setThreePhaseResults(calculationResults);
      setDetailedCalculations(calculationResults.calculation_review);

      // Update selectedForQuota with the final results
      if (calculationResults.phase3_final_selection.selected_performers.length > 0) {
        const finalSelected = calculationResults.phase3_final_selection.selected_performers.map((performer, index) => ({
          employee_id: performer.employee_id,
          first_name: performer.first_name,
          last_name: performer.last_name,
          department: performer.department,
          performance_appraisal_score: performer.performance_appraisal_score,
          final_ranking_score: performer.final_comparison_score,
          global_rank: index + 1,
          department_rank: performer.department_rank,
          cross_department_rank: performer.cross_department_rank,
          selection_reason: performer.selection_reason,
          calculated_scores: performer.calculated_scores
        }));
        setSelectedForQuota(finalSelected);
      }
    } catch (error) {
      console.error('❌ Error in 3-phase calculations:', error);
      toast.error('Error performing 3-phase calculations');
    } finally {
      setCalculationLoading(false);
    }
  };

  // Complete 3-phase calculation function using local staff data
  const generateCompleteThreePhaseCalculations = async (staffList) => {
    console.log('🔄 Starting complete 3-phase calculations...');

    // Phase 1: Department Level Ranking
    const phase1Results = await calculatePhase1DepartmentRanking(staffList);
    console.log('📊 Phase 1 completed:', Object.keys(phase1Results).length, 'departments');

    // Phase 2: Cross-Department Ranking
    const phase2Results = calculatePhase2CrossDepartmentRanking(phase1Results);
    console.log('🏆 Phase 2 completed:', phase2Results.length, 'top performers');

    // Phase 3: Final Quota-Based Selection
    const quotaConfig = {
      quota_limit: quotaInfo?.quota_limit || 2,
      current_allocation: quotaInfo?.current_allocation || 0
    };
    const phase3Results = calculatePhase3QuotaSelection(phase2Results, quotaConfig);
    console.log('🎯 Phase 3 completed:', phase3Results.selected_performers.length, 'selected');

    // Generate calculation review
    const calculationReview = {
      title: "3-Phase Top Performer Selection - Calculation Review",
      phases: {
        phase1: {
          title: "Phase 1: Department Level Ranking",
          description: "Individual candidate scoring within departments",
          departments: phase1Results
        },
        phase2: {
          title: "Phase 2: Cross-Department Ranking",
          description: "Top performers from each department ranked against each other",
          results: phase2Results
        },
        phase3: {
          title: "Phase 3: Final Quota-Based Selection",
          description: "Final selection based on available quota slots",
          results: phase3Results.selected_performers,
          statistics: phase3Results.statistics
        }
      }
    };

    return {
      phase1_department_rankings: phase1Results,
      phase2_cross_department_rankings: phase2Results,
      phase3_final_selection: phase3Results,
      calculation_review: calculationReview,
      process_summary: {
        total_candidates_evaluated: staffList.length,
        departments_involved: Object.keys(phase1Results).length,
        cross_department_top_performers: phase2Results.length,
        final_selected_count: phase3Results.selected_performers.length
      }
    };
  };

  // Function to get Director Rating from ManagerialRating model
  const getDirectorRatingFromModel = async (employeeId) => {
    try {
      console.log(`🔍 Fetching director rating for manager: ${employeeId}`);

      const response = await fetch(`${API_BASE}/managerial-rating/director-rating/${employeeId}`, {
        headers: {
          'x-access-token': accessToken
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success && responseData.data) {
          console.log(`✅ Director rating found for ${employeeId}:`, responseData.data.percentage_score);
          return responseData.data.percentage_score || 0; // Return percentage score out of 50
        } else {
          console.log(`❌ Director rating not found for ${employeeId} (no data in response), using fallback`);
        }
      } else {
        const errorData = await response.json();
        console.log(`❌ Director rating not found for ${employeeId}:`, errorData.message || 'Unknown error');
      }
    } catch (error) {
      console.log(`⚠️ Error fetching director rating for ${employeeId}:`, error.message);
    }

    // Fallback: No director rating found, return 0
    console.log(`❌ No director rating found for ${employeeId}, using 0.00`);
    return 0;
  };

  // Function to get eligible voters by department from User model
  const getEligibleVotersByDepartment = async (department) => {
    try {
      console.log(`🔍 Fetching eligible voters for department: ${department}`);

      const response = await fetch(`${API_BASE}/zemen_vote_candidate/eligible-voters/${department}`, {
        headers: {
          'x-access-token': accessToken
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success && responseData.data) {
          console.log(`✅ Eligible voters found for ${department}:`, responseData.data.total_eligible_voters);
          return responseData.data;
        }
      }
    } catch (error) {
      console.log(`⚠️ Error fetching eligible voters for ${department}:`, error.message);
    }

    // Fallback
    return { department, total_eligible_voters: 0, eligible_voters: [] };
  };

  // Function to get voting statistics by department from Vote model
  const getVotingStatsByDepartment = async (department) => {
    try {
      console.log(`🔍 Fetching voting statistics for department: ${department}`);

      const response = await fetch(`${API_BASE}/zemen_vote_candidate/voting-stats/${department}`, {
        headers: {
          'x-access-token': accessToken
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success && responseData.data) {
          console.log(`✅ Voting statistics found for ${department}:`, responseData.data.total_actual_voters);
          return responseData.data;
        }
      }
    } catch (error) {
      console.log(`⚠️ Error fetching voting statistics for ${department}:`, error.message);
    }

    // Fallback
    return { department, total_actual_voters: 0, candidate_voting_data: {} };
  };

  // Function to get peer rating for a specific candidate
  const getPeerRatingForCandidate = async (candidateId, department) => {
    try {
      console.log(`🔍 Fetching peer rating for candidate: ${candidateId} in ${department}`);

      const response = await fetch(`${API_BASE}/zemen_vote_candidate/peer-rating/${candidateId}/${department}`, {
        headers: {
          'x-access-token': accessToken
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success && responseData.data) {
          console.log(`✅ Peer rating found for ${candidateId}:`, responseData.data);
          return responseData.data;
        }
      }
    } catch (error) {
      console.log(`⚠️ Error fetching peer rating for ${candidateId}:`, error.message);
    }

    // Fallback
    return {
      candidate_id: candidateId,
      department,
      votes_received: 0,
      average_peer_rating: 0,
      peer_rating_out_of_20: 0
    };
  };

  // Function to get Manager Rating from ManagerialRating model (for non-managerial staff)
  const getManagerRatingFromModel = async (employeeId) => {
    try {
      console.log(`🔍 Fetching manager rating for non-managerial staff: ${employeeId}`);

      const response = await fetch(`${API_BASE}/managerial-rating/manager-rating/${employeeId}`, {
        headers: {
          'x-access-token': accessToken
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success && responseData.data) {
          console.log(`✅ Manager rating found for ${employeeId}:`, responseData.data.manager_rating_out_of_30);
          return responseData.data.manager_rating_out_of_30 || 0; // Return manager rating out of 30
        } else {
          console.log(`❌ Manager rating not found for ${employeeId} (no data in response), using fallback`);
        }
      } else {
        const errorData = await response.json();
        console.log(`❌ Manager rating not found for ${employeeId}:`, errorData.message || 'Unknown error');
      }
    } catch (error) {
      console.log(`⚠️ Error fetching manager rating for ${employeeId}:`, error.message);
    }

    // No manager rating found - return 0
    console.log(`❌ No manager rating found for ${employeeId}, using 0`);
    return 0;
  };

  // Function to check if employee is a manager
  const isEmployeeManager = (person) => {
    // Check multiple ways to determine if someone is a manager:
    // 1. Explicit is_managerial_position flag
    // 2. Position title contains "manager" (case insensitive)
    // 3. Employee ID starts with "MGR"
    // 4. Role includes "manager"

    if (person.is_managerial_position === true) return true;

    if (person.position && person.position.toLowerCase().includes('manager')) return true;

    if (person.employee_id && person.employee_id.toUpperCase().startsWith('MGR')) return true;

    if (person.roles && Array.isArray(person.roles) && person.roles.includes('manager')) return true;

    // Additional check for level field
    if (person.level && person.level.toLowerCase() === 'manager') return true;

    return false;
  };

  // Function to calculate realistic eligible voters per department
  const calculateEligibleVoters = (departmentStaff) => {
    // ONLY count non-managerial staff (they can vote for peers)
    // Managers are NOT eligible to vote or be voted for in peer voting
    const nonManagerialStaff = departmentStaff.filter(person => !isEmployeeManager(person));

    if (nonManagerialStaff.length <= 1) {
      return 0; // No peer voting if 0 or 1 non-managerial staff
    }

    // Each non-managerial staff can vote for their peers (exclude themselves)
    return nonManagerialStaff.length - 1; // Exclude self from voting
  };

  // Phase 1: Calculate department level rankings
  const calculatePhase1DepartmentRanking = async (staffList) => {
    const departmentResults = {};

    // First pass: Group by department and calculate department stats
    staffList.forEach(person => {
      // Use the department already assigned by fetchAvailableStaff (which handles manager-department relationships)
      const department = person.department || 'Unassigned';

      // Debug: Log department assignments
      console.log(`👤 ${isEmployeeManager(person) ? 'Manager' : 'Staff'} ${person.employee_id} (${person.first_name} ${person.last_name}) in department: ${department}`);

      if (!departmentResults[department]) {
        departmentResults[department] = {
          department: department,
          candidates: [],
          all_dept_staff: [],
          total_candidates: 0,
          eligible_voters: 0,
          actual_voters: 0
        };
      }

      departmentResults[department].all_dept_staff.push(person);
    });

    // Get real voting data for each department
    const departmentVotingData = {};
    for (const department of Object.keys(departmentResults)) {
      const deptStaff = departmentResults[department].all_dept_staff;
      const nonManagerialStaff = deptStaff.filter(person => !isEmployeeManager(person));

      // Get real eligible voters and voting statistics from database
      const eligibleVotersData = await getEligibleVotersByDepartment(department);
      const votingStatsData = await getVotingStatsByDepartment(department);

      departmentResults[department].eligible_voters = eligibleVotersData.total_eligible_voters;
      departmentResults[department].actual_voters = votingStatsData.total_actual_voters;
      departmentResults[department].non_managerial_count = nonManagerialStaff.length;
      departmentResults[department].managerial_count = deptStaff.filter(person => isEmployeeManager(person)).length;

      // Store voting data for later use
      departmentVotingData[department] = {
        eligible_voters_data: eligibleVotersData,
        voting_stats_data: votingStatsData
      };

      console.log(`📊 Department ${department} voting data:`, {
        eligible_voters: departmentResults[department].eligible_voters,
        actual_voters: departmentResults[department].actual_voters,
        candidates_with_votes: Object.keys(votingStatsData.candidate_voting_data).length
      });
    }

    // Second pass: Calculate individual scores
    for (const person of staffList) {
      // Use the department already assigned by fetchAvailableStaff
      const department = person.department || 'Unassigned';

      // Calculate individual scores using Excel formulas
      const performanceOutOf50 = (person.performance_appraisal_score || 0) / 2;

      let finalScore;
      let scoreType;
      let scoreBreakdown;

      if (isEmployeeManager(person)) {
        // For MANAGERS: Performance 50% + Director Rating 50%
        // NO PEER VOTING FOR MANAGERS
        let directorRating = 0;

        // Try to get director rating from ManagerialRating model
        try {
          // Simulate API call to get director rating
          directorRating = await getDirectorRatingFromModel(person.employee_id);
        } catch (error) {
          // Fallback: no director rating found
          directorRating = 0; // Return 0 if no director rating available
        }

        // Simple: Performance 50% + Director Rating 50%
        finalScore = performanceOutOf50 + directorRating;
        scoreType = 'managerial';

        scoreBreakdown = {
          performance_out_of_50: parseFloat(performanceOutOf50.toFixed(2)),
          director_rating_out_of_50: parseFloat(directorRating.toFixed(2)),
          final_score: parseFloat(finalScore.toFixed(2)),
          score_type: scoreType,
          formula_used: 'Performance 50% + Director Rating 50%'
        };

        console.log(`👨‍💼 Manager Scoring for ${person.employee_id}:`, {
          performance: performanceOutOf50,
          director_rating: directorRating,
          final_score: finalScore,
          formula: 'Performance 50% + Director Rating 50%'
        });
      } else {
        // For NON-MANAGERIAL: Performance 50% + Manager 30% + Peer 20%
        let managerOutOf30 = 0;

        // Try to get manager rating from ManagerialRating model
        try {
          managerOutOf30 = await getManagerRatingFromModel(person.employee_id);
        } catch (error) {
          // No manager rating available
          console.log(`⚠️ Error getting manager rating for ${person.employee_id}:`, error.message);
          managerOutOf30 = 0; // No rating = 0 points
        }

        // Get real peer rating data for this candidate
        const peerRatingData = await getPeerRatingForCandidate(person.employee_id, department);

        const eligibleVoters = departmentResults[department].eligible_voters; // K4
        const votesForCandidate = peerRatingData.votes_received; // M4

        // Vote percentage = (votes for candidate / total eligible) * 100 (N4)
        const peerVotingPercentage = eligibleVoters > 0 ? (votesForCandidate / eligibleVoters) * 100 : 0;

        // Average peer rating out of 50 (O4)
        const averagePeerRating = peerRatingData.average_peer_rating;

        // Peer rating converted to 20% = (O4 * 20) / 50 (P4)
        const peerOutOf20 = (averagePeerRating * 20) / 50;

        // Weighted Rating = (P4 * N4) / 100
        const weightedRating = (peerOutOf20 * peerVotingPercentage) / 100;

        // Total Weighted Result = Performance 50% + Manager 30% + Weighted Rating
        const totalWeightedResult = performanceOutOf50 + managerOutOf30 + weightedRating;

        const hasManager = managerOutOf30 > 0;

        if (hasManager) {
          // WITH manager: Use Total Weighted Result
          finalScore = totalWeightedResult;
          scoreType = 'total_weighted_result';
        } else {
          // WITHOUT manager: Use Total Rating Result (traditional peer rating)
          finalScore = performanceOutOf50 + managerOutOf30 + peerOutOf20;
          scoreType = 'total_rating_result';
        }

        scoreBreakdown = {
          performance_out_of_50: parseFloat(performanceOutOf50.toFixed(2)),
          managerial_rating_out_of_30: parseFloat(managerOutOf30.toFixed(2)),
          peer_voting_percentage: parseFloat(peerVotingPercentage.toFixed(2)),
          average_peer_rating: parseFloat(averagePeerRating.toFixed(2)),
          peer_rating_out_of_20: parseFloat(peerOutOf20.toFixed(2)),
          weighted_rating: parseFloat(weightedRating.toFixed(2)),
          total_weighted_result: parseFloat(totalWeightedResult.toFixed(2)),
          total_eligible_voters: eligibleVoters,
          votes_received: votesForCandidate,
          director_rating_out_of_50: 0, // Not applicable for non-managers
          final_score: parseFloat(finalScore.toFixed(2)),
          score_type: scoreType,
          formula_used: hasManager ? 'Performance 50% + Manager 30% + Weighted Rating (Total Weighted Result)' : 'Performance 50% + Manager 30% + Peer Rating 20% (Total Rating Result)'
        };

        console.log(`👤 Non-Managerial Scoring for ${person.employee_id}:`, {
          performance: performanceOutOf50,
          manager_rating: managerOutOf30,
          peer_data: {
            votes_received: votesForCandidate,
            eligible_voters: eligibleVoters,
            vote_percentage: peerVotingPercentage.toFixed(1) + '%',
            average_peer_rating: averagePeerRating.toFixed(2),
            peer_rating_20_percent: peerOutOf20.toFixed(2)
          },
          weighted_rating: weightedRating.toFixed(2),
          total_weighted_result: totalWeightedResult.toFixed(2),
          final_score: finalScore,
          has_manager: hasManager,
          formula: scoreBreakdown.formula_used
        });
      }

      departmentResults[department].candidates.push({
        rank: 0, // Will be set after sorting
        name: `${person.first_name} ${person.last_name}`,
        employee_id: person.employee_id,
        score_breakdown: scoreBreakdown,
        final_score: parseFloat(finalScore.toFixed(2)),
        ...person
      });
    }

    // Sort and rank within each department - compare managers and non-managerial together
    Object.values(departmentResults).forEach(deptData => {
      // Check if department has managers
      const departmentHasManager = deptData.managerial_count > 0;

      console.log(`🏢 Department ${deptData.department} ranking strategy:`, {
        has_manager: departmentHasManager,
        managerial_count: deptData.managerial_count,
        non_managerial_count: deptData.non_managerial_count,
        comparison_method: 'Final Score Comparison (Managers vs Non-Managerial with Total Weighted Result)'
      });

      // Set comparison scores and ranking methods for all candidates
      deptData.candidates.forEach(candidate => {
        if (isEmployeeManager(candidate)) {
          // Managers use their final score (Performance 50% + Director Rating 50%)
          candidate.comparison_score = candidate.final_score;
          candidate.ranking_method = 'Managerial (Performance + Director Rating)';
        } else {
          // Non-managerial staff use Total Weighted Result when they have manager rating
          if (candidate.score_breakdown?.score_type === 'total_weighted_result') {
            candidate.comparison_score = candidate.score_breakdown.total_weighted_result;
            candidate.ranking_method = 'Total Weighted Result';
          } else {
            // Use Total Rating Result if no manager rating
            candidate.comparison_score = candidate.final_score;
            candidate.ranking_method = 'Total Rating Result';
          }
        }
      });

      // Sort all candidates together by their comparison scores
      deptData.candidates.sort((a, b) => b.comparison_score - a.comparison_score);

      // Assign ranks to all candidates in the department
      deptData.candidates = deptData.candidates.map((candidate, index) => ({
        ...candidate,
        rank: index + 1
      }));

      deptData.total_candidates = deptData.candidates.length;
      deptData.top_performer = deptData.candidates[0] || null;

      console.log(`📊 Department ${deptData.department} ranking completed:`, {
        total_candidates: deptData.total_candidates,
        top_performer: deptData.top_performer?.name,
        top_performer_score: deptData.top_performer?.final_score,
        top_performer_method: deptData.top_performer?.ranking_method
      });

      // Clean up temporary data
      delete deptData.all_dept_staff;
    });

    return departmentResults;
  };

  // Phase 2: Cross-department ranking of top performers
  const calculatePhase2CrossDepartmentRanking = (phase1Results) => {
    const topPerformers = [];

    Object.values(phase1Results).forEach(deptData => {
      if (deptData.top_performer) {
        topPerformers.push({
          ...deptData.top_performer,
          department: deptData.department,
          dept_rank: 1 // Top performer from department
        });
      }
    });

    // Sort by final score
    topPerformers.sort((a, b) => b.final_score - a.final_score);

    return topPerformers.map((performer, index) => ({
      cross_dept_rank: index + 1,
      name: performer.name,
      department: performer.department,
      dept_rank: performer.dept_rank,
      final_score: performer.final_score,
      score_type: performer.score_breakdown?.score_type,
      ...performer
    }));
  };

  // Phase 3: Final quota-based selection
  const calculatePhase3QuotaSelection = (phase2Results, quotaConfig) => {
    const availableSlots = Math.max(0, quotaConfig.quota_limit - quotaConfig.current_allocation);
    const selectedCount = Math.min(availableSlots, phase2Results.length);
    const selectedPerformers = phase2Results.slice(0, selectedCount);

    const finalSelection = selectedPerformers.map((performer, index) => ({
      final_rank: index + 1,
      name: performer.name,
      department: performer.department,
      cross_dept_rank: performer.cross_dept_rank,
      final_score: performer.final_score,
      selection_reason: 'quota_based_top_performer',
      final_comparison_score: performer.final_score,
      ...performer
    }));

    const statistics = {
      available_slots: availableSlots,
      slots_filled: selectedCount,
      quota_limit: quotaConfig.quota_limit,
      current_allocation: quotaConfig.current_allocation,
      quota_utilization_percentage: ((quotaConfig.current_allocation + selectedCount) / quotaConfig.quota_limit) * 100
    };

    return {
      selected_performers: finalSelection,
      quota_status: selectedCount < availableSlots ? 'partial_filled' : 'fully_utilized',
      statistics: statistics
    };
  };

  const generatePerformanceBasedSelection = async (staffList) => {
    const limit = quotaInfo?.quota_limit || 2;
    const currentAllocation = quotaInfo?.current_allocation || 0;

    console.log('🚀 Starting 3-Phase Top Performer Selection Process');
    console.log('📊 Initial Parameters:', {
      totalStaff: staffList.length,
      quotaLimit: limit,
      currentAllocation: currentAllocation,
      availableSlots: limit - currentAllocation
    });

    try {
      // Prepare candidates data for backend calculation
      // Note: Frontend data structure might differ from backend HierarchicalVote structure
      // This is a simplified approach for demonstration
      const preparedCandidates = staffList.map(person => ({
        candidate_employee_id: person.employee_id,
        candidate_name: `${person.first_name} ${person.last_name}`,
        candidate_department: person.department,
        candidate_function: person.function || person.department,
        is_managerial_position: person.is_managerial_position || false,
        performance_appraisal_score: person.performance_appraisal_score || 0,
        ...person // Include all other properties
      }));

      console.log('📝 Prepared candidates for 3-phase analysis:', preparedCandidates.length);

      // Use the real calculation with proper manager scoring
      const phase1Results = await calculatePhase1DepartmentRanking(preparedCandidates);
      const phase2Results = calculatePhase2CrossDepartmentRanking(phase1Results);
      const phase3Results = calculatePhase3QuotaSelection(phase2Results, { quota_limit: limit, current_allocation: currentAllocation });

      console.log('✅ 3-Phase Selection Complete:');
      console.log('📍 Phase 1 - Department Rankings:', Object.keys(phase1Results).length, 'departments');
      console.log('🏆 Phase 2 - Cross-department Top Performers:', phase2Results.length);
      console.log('🎯 Phase 3 - Final Selected:', phase3Results.selected_performers.length);

      // Convert results to format expected by the UI with proper calculated scores
      const selectedForQuota = phase3Results.selected_performers.map((performer, index) => {
        // Find the performer's calculated scores from phase1 results
        let calculatedScores = {};

        // Look for this performer in the phase1 department results
        Object.values(phase1Results).forEach(deptData => {
          const candidate = deptData.candidates.find(c =>
            c.employee_id === performer.employee_id ||
            c.candidate_employee_id === performer.employee_id
          );
          if (candidate && candidate.score_breakdown) {
            calculatedScores = candidate.score_breakdown;
          }
        });

        console.log(`Setting calculated scores for ${performer.employee_id}:`, calculatedScores);

        return {
          employee_id: performer.employee_id || performer.candidate_employee_id,
          first_name: performer.first_name || performer.candidate_name?.split(' ')[0] || '',
          last_name: performer.last_name || performer.candidate_name?.split(' ').slice(1).join(' ') || '',
          department: performer.department || performer.candidate_department,
          function: performer.function || performer.candidate_function,
          calculated_scores: calculatedScores, // Use the actual calculated scores from phase1
          final_ranking_score: performer.final_score || performer.final_comparison_score || 0,
          global_rank: index + 1,
          department_rank: performer.rank || 0,
          cross_department_rank: performer.cross_dept_rank || 0,
          selection_reason: performer.selection_reason || 'quota_based',
          // Store the original performance score for reference
          performance_appraisal_score: performer.performance_appraisal_score || 0,
          // Add isManagerial flag for easier identification
          is_managerial_position: performer.is_managerial_position || false
        };
      });

      console.log('📋 Final Selection for UI:', selectedForQuota.map(person => ({
        name: person.first_name + ' ' + person.last_name,
        department: person.department,
        finalScore: person.final_ranking_score,
        phase1Rank: person.department_rank,
        phase2Rank: person.cross_department_rank,
        finalRank: person.final_selection_rank
      })));

      setSelectedForQuota(selectedForQuota);

    } catch (error) {
      console.error('❌ Error in 3-phase selection process:', error);
      toast.error('Error calculating top performers using 3-phase process');
    }
  };

  // Simulate Phase 1: Department Level Ranking (Frontend Implementation)
  const simulatePhase1DepartmentRanking = async (candidates) => {
    const departmentResults = {};

    candidates.forEach(candidate => {
      const department = candidate.candidate_department || 'Unassigned';

      if (!departmentResults[department]) {
        departmentResults[department] = {
          department: department,
          candidates: [],
          eligible_voters_count: 50, // Simulated for demo
          total_department_voters_count: 35 // Simulated for demo
        };
      }

      // Simulate individual score calculation
      const performanceOutOf50 = (candidate.performance_appraisal_score || 0) / 2;
      const managerialOutOf30 = ((candidate.manager_rating_score || 0) / 50) * 30;
      const peerRatingOutOf20 = ((candidate.peer_rating_score || 0) / 50) * 20;

      let finalScore;
      let scoreType;

      if (candidate.is_managerial_position) {
        const managerialOutOf50 = candidate.manager_rating_score || 0;
        finalScore = performanceOutOf50 + managerialOutOf50;
        scoreType = 'managerial';
      } else {
        // Simulate department manager check
        const hasManager = Math.random() > 0.5; // Random for demo
        if (hasManager) {
          const votePercentage = Math.random() * 100; // Random for demo
          const weightedRating = (peerRatingOutOf20 * votePercentage) / 100;
          finalScore = performanceOutOf50 + managerialOutOf30 + weightedRating;
          scoreType = 'total_weighted_result';
        } else {
          finalScore = performanceOutOf50 + managerialOutOf30 + peerRatingOutOf20;
          scoreType = 'total_rating_result';
        }
      }

      departmentResults[department].candidates.push({
        ...candidate,
        calculated_scores: {
          performance_out_of_50: parseFloat(performanceOutOf50.toFixed(2)),
          managerial_rating_out_of_30: parseFloat(managerialOutOf30.toFixed(2)),
          peer_rating_out_of_20: parseFloat(peerRatingOutOf20.toFixed(2)),
          final_score: parseFloat(finalScore.toFixed(2)),
          score_type: scoreType
        },
        phase1_details: { scoreType: scoreType }
      });
    });

    // Rank candidates within each department
    Object.values(departmentResults).forEach(deptData => {
      deptData.candidates.sort((a, b) => b.calculated_scores.final_score - a.calculated_scores.final_score);

      deptData.candidates = deptData.candidates.map((candidate, index) => ({
        ...candidate,
        department_rank: index + 1,
        department_rank_label: `${index + 1} of ${deptData.candidates.length}`
      }));

      deptData.top_performer = deptData.candidates[0] || null;
    });

    return departmentResults;
  };

  // Simulate Phase 2: Cross-Department Ranking
  const simulatePhase2CrossDepartmentRanking = (phase1Results) => {
    const topPerformersFromDepartments = [];

    Object.values(phase1Results).forEach(deptData => {
      if (deptData.top_performer) {
        topPerformersFromDepartments.push({
          ...deptData.top_performer,
          department_info: {
            department: deptData.department,
            total_candidates_in_dept: deptData.candidates.length,
            eligible_voters: deptData.eligible_voters_count
          }
        });
      }
    });

    // Sort across departments
    topPerformersFromDepartments.sort((a, b) =>
      b.calculated_scores.final_score - a.calculated_scores.final_score
    );

    // Add cross-department rankings
    return topPerformersFromDepartments.map((performer, index) => ({
      ...performer,
      cross_department_rank: index + 1,
      cross_department_rank_label: `${index + 1} of ${topPerformersFromDepartments.length}`,
      final_comparison_score: performer.calculated_scores.final_score,
      phase2_details: { crossDeptRank: index + 1 }
    }));
  };

  // Simulate Phase 3: Quota-Based Selection
  const simulatePhase3QuotaSelection = (phase2Results, quotaInfo) => {
    const availableSlots = Math.max(0, quotaInfo.quota_limit - quotaInfo.current_allocation);
    const slotsToFill = Math.min(availableSlots, phase2Results.length);
    const selectedPerformers = phase2Results.slice(0, slotsToFill);

    const finalSelection = selectedPerformers.map((performer, index) => ({
      ...performer,
      final_selection_rank: index + 1,
      selection_reason: 'quota_based_top_performer',
      phase3_details: { finalRank: index + 1, quotaSlot: index + 1 }
    }));

    return {
      selected_performers: finalSelection,
      quota_status: finalSelection.length < availableSlots ? 'partial_filled' : 'fully_utilized',
      statistics: {
        available_slots: availableSlots,
        slots_filled: finalSelection.length,
        quota_limit: quotaInfo.quota_limit
      }
    };
  };

  // Submit selected staff for approval first
  const submitStaffForApproval = async () => {
    if (selectedForQuota.length === 0) {
      toast.warning('No staff selected for approval');
      return;
    }

    try {
      setLoading(true);

      // Prepare staff data with the already calculated scores from frontend
      const staffToSubmit = selectedForQuota.map(staff => {
        // Use the already calculated scores from the phase calculations
        const calculatedScores = staff.calculated_scores || {};

        console.log(`Using calculated scores for ${staff.employee_id}:`, calculatedScores);

        // Ensure all required fields are present with the calculated values
        const scoreBreakdown = {
          performance_out_of_50: calculatedScores.performance_out_of_50 || 0,
          managerial_rating_out_of_30: calculatedScores.managerial_rating_out_of_30 || 0,
          director_rating_out_of_50: calculatedScores.director_rating_out_of_50 || 0,
          peer_rating_out_of_20: calculatedScores.peer_rating_out_of_20 || 0,
          weighted_rating: calculatedScores.weighted_rating || 0,
          total_weighted_result: calculatedScores.total_weighted_result || 0,
          score_type: calculatedScores.score_type || 'total_rating_result'
        };

        return {
          ...staff,
          score_breakdown: scoreBreakdown,
          final_score: staff.final_ranking_score || calculatedScores.final_score || 0,
          performance_appraisal_score: staff.performance_appraisal_score || 0
        };
      });

      console.log('Submitting staff with calculated score breakdowns:', staffToSubmit.map(s => ({
        employee_id: s.employee_id,
        score_breakdown: s.score_breakdown,
        final_score: s.final_score
      })));

      const response = await fetch(`${API_BASE}/staff-approval/submit-for-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken
        },
        body: JSON.stringify({
          selectedStaff: staffToSubmit
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.data.submitted_count} staff submitted for approval successfully!`);

        // Update local state to reflect that staff have been submitted
        setSelectedForQuota(prev =>
          prev.map(staff => ({
            ...staff,
            approval_status: 'pending',
            submitted_for_approval: true
          }))
        );
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to submit staff for approval');
      }
    } catch (error) {
      console.error('Error submitting staff for approval:', error);
      toast.error('Error submitting staff for approval');
    } finally {
      setLoading(false);
    }
  };

  // Handle approve action
  const handleApprove = async (employeeId, employeeName) => {
    try {
      setLoading(true);

      // Find the staff member in selectedForQuota
      const staffMember = selectedForQuota.find(staff => staff.employee_id === employeeId);
      const staffWithCalculations = availableStaff.find(s => s.employee_id === employeeId);

      // If staff hasn't been submitted for approval yet, submit them first
      if (!staffMember?.submitted_for_approval) {
        console.log('Staff not yet submitted, submitting for approval first...');

        // Use the already calculated scores from the frontend Phase 1 calculations
        const calculatedScores = staffMember?.calculated_scores || {};

        console.log(`Using calculated scores for individual approval ${employeeId}:`, calculatedScores);

        // Use the calculated scores directly - no recalculation needed
        const scoreBreakdown = {
          performance_out_of_50: calculatedScores.performance_out_of_50 || 0,
          managerial_rating_out_of_30: calculatedScores.managerial_rating_out_of_30 || 0,
          director_rating_out_of_50: calculatedScores.director_rating_out_of_50 || 0,
          peer_rating_out_of_20: calculatedScores.peer_rating_out_of_20 || 0,
          weighted_rating: calculatedScores.weighted_rating || 0,
          total_weighted_result: calculatedScores.total_weighted_result || 0,
          score_type: calculatedScores.score_type || 'total_rating_result'
        };

        // Prepare staff data for submission
        const staffToSubmit = [{
          ...staffMember,
          score_breakdown: scoreBreakdown,
          final_score: staffMember.final_ranking_score || staffMember.calculated_scores?.final_score || 0,
          performance_appraisal_score: staffWithCalculations?.performance_appraisal_score || 0
        }];

        console.log('Submitting individual staff for approval:', {
          employee_id: employeeId,
          score_breakdown: scoreBreakdown,
          final_score: staffToSubmit[0].final_score
        });

        // Submit for approval first
        const submitResponse = await fetch(`${API_BASE}/staff-approval/submit-for-approval`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-access-token': accessToken
          },
          body: JSON.stringify({
            selectedStaff: staffToSubmit
          })
        });

        if (!submitResponse.ok) {
          const submitErrorData = await submitResponse.json();
          toast.error(`Failed to submit ${employeeName} for approval: ${submitErrorData.message || 'Unknown error'}`);
          return;
        }

        console.log('Staff submitted successfully, now approving...');

        // Update local state to reflect submission
        setSelectedForQuota(prev =>
          prev.map(staff =>
            staff.employee_id === employeeId
              ? { ...staff, approval_status: 'pending', submitted_for_approval: true }
              : staff
          )
        );
      }

      // Now approve the staff
      const response = await fetch(`${API_BASE}/staff-approval/approve-reject-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken
        },
        body: JSON.stringify({
          employee_id: employeeId,
          approval_status: 'approved',
          comments: `Approved based on 3-phase selection ranking`
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${employeeName} approved successfully!`);
        // Update the selected staff list to mark as approved
        setSelectedForQuota(prev =>
          prev.map(staff =>
            staff.employee_id === employeeId
              ? { ...staff, approval_status: 'approved' }
              : staff
          )
        );
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to approve staff');
      }
    } catch (error) {
      console.error('Error approving staff:', error);
      toast.error('Error processing staff approval');
    } finally {
      setLoading(false);
    }
  };

  // Handle reject action - opens dialog
  const handleReject = (employeeId, employeeName) => {
    setRejectionDialog({
      open: true,
      employeeId: employeeId,
      employeeName: employeeName,
      reason: '',
      comments: ''
    });
  };

  // Submit rejection with reason
  const submitRejection = async () => {
    if (!rejectionDialog.reason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      setLoading(true);

      // Find the staff member in selectedForQuota
      const staffMember = selectedForQuota.find(staff => staff.employee_id === rejectionDialog.employeeId);
      const staffWithCalculations = availableStaff.find(s => s.employee_id === rejectionDialog.employeeId);

      // If staff hasn't been submitted for approval yet, submit them first
      if (!staffMember?.submitted_for_approval) {
        console.log('Staff not yet submitted, submitting for approval first before rejection...');

        // Use the already calculated scores from the frontend Phase 1 calculations
        const calculatedScores = staffMember?.calculated_scores || {};

        console.log(`Using calculated scores for individual rejection ${rejectionDialog.employeeId}:`, calculatedScores);

        // Use the calculated scores directly - no recalculation needed
        const scoreBreakdown = {
          performance_out_of_50: calculatedScores.performance_out_of_50 || 0,
          managerial_rating_out_of_30: calculatedScores.managerial_rating_out_of_30 || 0,
          director_rating_out_of_50: calculatedScores.director_rating_out_of_50 || 0,
          peer_rating_out_of_20: calculatedScores.peer_rating_out_of_20 || 0,
          weighted_rating: calculatedScores.weighted_rating || 0,
          total_weighted_result: calculatedScores.total_weighted_result || 0,
          score_type: calculatedScores.score_type || 'total_rating_result'
        };

        // Prepare staff data for submission
        const staffToSubmit = [{
          ...staffMember,
          score_breakdown: scoreBreakdown,
          final_score: staffMember.final_ranking_score || staffMember.calculated_scores?.final_score || 0,
          performance_appraisal_score: staffWithCalculations?.performance_appraisal_score || 0
        }];

        console.log('Submitting individual staff for approval before rejection:', {
          employee_id: rejectionDialog.employeeId,
          score_breakdown: scoreBreakdown,
          final_score: staffToSubmit[0].final_score
        });

        // Submit for approval first
        const submitResponse = await fetch(`${API_BASE}/staff-approval/submit-for-approval`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-access-token': accessToken
          },
          body: JSON.stringify({
            selectedStaff: staffToSubmit
          })
        });

        if (!submitResponse.ok) {
          const submitErrorData = await submitResponse.json();
          toast.error(`Failed to submit ${rejectionDialog.employeeName} for approval: ${submitErrorData.message || 'Unknown error'}`);
          return;
        }

        console.log('Staff submitted successfully, now rejecting...');

        // Update local state to reflect submission
        setSelectedForQuota(prev =>
          prev.map(staff =>
            staff.employee_id === rejectionDialog.employeeId
              ? { ...staff, approval_status: 'pending', submitted_for_approval: true }
              : staff
          )
        );
      }

      // Now reject the staff
      const response = await fetch(`${API_BASE}/staff-approval/approve-reject-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken
        },
        body: JSON.stringify({
          employee_id: rejectionDialog.employeeId,
          approval_status: 'rejected',
          rejection_reason: rejectionDialog.reason,
          comments: rejectionDialog.comments
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${rejectionDialog.employeeName} rejected successfully`);
        // Update the staff list to mark as rejected
        setSelectedForQuota(prev =>
          prev.map(staff =>
            staff.employee_id === rejectionDialog.employeeId
              ? { ...staff, approval_status: 'rejected', rejection_reason: rejectionDialog.reason }
              : staff
          )
        );
        // Offer to send the rejection to the Deputy Chief Human Capital for re-rating
        setReRatingDialog({
          open: true,
          employeeId: rejectionDialog.employeeId,
          employeeName: rejectionDialog.employeeName
        });
        // Close dialog
        setRejectionDialog({
          open: false,
          employeeId: null,
          employeeName: '',
          reason: '',
          comments: ''
        });
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to reject staff');
      }
    } catch (error) {
      console.error('Error rejecting staff:', error);
      toast.error('Error processing staff rejection');
    } finally {
      setLoading(false);
    }
  };

  // Close rejection dialog
  const closeRejectionDialog = () => {
    setRejectionDialog({
      open: false,
      employeeId: null,
      employeeName: '',
      reason: '',
      comments: ''
    });
  };

  const closeReRatingDialog = () => {
    setReRatingDialog({
      open: false,
      employeeId: null,
      employeeName: ''
    });
  };

  // Send a rejection to the Deputy Chief Human Capital. If approved, every director
  // rating under this chief is removed and directors rate again; peer votes stay.
  const sendForReRating = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/re-rating/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken
        },
        body: JSON.stringify({
          employee_id: reRatingDialog.employeeId
        })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Sent to the Deputy Chief Human Capital for approval');
        setReRating(data.data);
      } else {
        toast.error(data.message || 'Failed to send re-rating request');
      }
    } catch (error) {
      console.error('Error sending re-rating request:', error);
      toast.error('Error sending re-rating request');
    } finally {
      setLoading(false);
      closeReRatingDialog();
    }
  };

  const rejectedStaff = selectedForQuota.find(staff => staff.approval_status === 'rejected');

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '');

  const renderReRatingStatus = () => {
    if (!reRating) return null;

    if (reRating.status === 'pending') {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          Your rejection of <strong>{reRating.rejected_employee_name}</strong> was sent to the Deputy Chief Human Capital on {formatDate(reRating.created_at)}.
          Approvals are on hold until it is reviewed.
        </Alert>
      );
    }

    if (reRating.status === 're_rating') {
      const { done = 0, total = 0 } = reRating.progress || {};
      return (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Re-rating approved by {reRating.reviewed_by_name} on {formatDate(reRating.reviewed_at)}.
          All director ratings under you were removed and directors are rating again: <strong>{done} of {total}</strong> ratings given.
          Approvals are on hold until re-rating is complete. Peer votes are not changed.
        </Alert>
      );
    }

    if (reRating.status === 'completed') {
      return (
        <Alert severity="success" sx={{ mb: 2 }}>
          Re-rating completed on {formatDate(reRating.completed_at)}. The selection below is calculated with the new director ratings
          (peer votes unchanged). Please review and approve.
        </Alert>
      );
    }

    if (reRating.status === 'declined') {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          The Deputy Chief Human Capital declined re-rating on {formatDate(reRating.reviewed_at)}
          {reRating.review_comments ? `: "${reRating.review_comments}"` : ''}. The existing ratings remain.
        </Alert>
      );
    }

    return null;
  };

  if (!userInfo?.roles?.includes('chief')) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <Alert severity="warning">
          You do not have Chief-level access privileges. Please contact your administrator.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Chief Level Approvals
        {fiscalYear && (
          <Chip label={`Fiscal year ${fiscalYear.name}`} color="primary" variant="outlined" sx={{ ml: 2, verticalAlign: 'middle' }} />
        )}
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        As a Chief, you have the final authority to approve or reject candidates based on their overall voting scores and performance.
      </Alert>

      <Card>
        <CardContent>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Selected Staff" />
            <Tab label="Review" />
          </Tabs>

          {/* Selected Staff Tab */}
          {tabValue === 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Staff Selection for Quota ({quotaInfo?.quota_limit || 0} positions)
              </Typography>

              {quotaInfo && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Quota Information: {quotaInfo.current_allocation} / {quotaInfo.quota_limit} positions filled
                  ({quotaInfo.available_slots} remaining)
                </Alert>
              )}

              {renderReRatingStatus()}

              {!reRatingOpen && rejectedStaff && (
                <Alert
                  severity="warning"
                  sx={{ mb: 2 }}
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      disabled={loading}
                      onClick={() => setReRatingDialog({
                        open: true,
                        employeeId: rejectedStaff.employee_id,
                        employeeName: `${rejectedStaff.first_name} ${rejectedStaff.last_name}`
                      })}
                    >
                      Send to Deputy Chief HC
                    </Button>
                  }
                >
                  You rejected <strong>{rejectedStaff.first_name} {rejectedStaff.last_name}</strong>. You can ask the Deputy Chief Human Capital to have your directors rate again.
                </Alert>
              )}

              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ ml: 2, alignSelf: 'center' }}>
                    Calculating top performers...
                  </Typography>
                </Box>
              )}

              {!loading && selectedForQuota.length === 0 && availableStaff.length > 0 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  No top performers calculated yet. The system is processing staff data...
                </Alert>
              )}

              {selectedForQuota.length > 0 && (
                <>
                  <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f8f9fa' }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      📊 Selection Summary
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Total Staff Evaluated:</strong> {availableStaff.length}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Selected for Quota:</strong> {selectedForQuota.length}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Selection Rate:</strong> {((selectedForQuota.length / availableStaff.length) * 100).toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Quota Utilization:</strong> {quotaInfo ? ((selectedForQuota.length / quotaInfo.quota_limit) * 100).toFixed(1) : 0}%
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" gutterBottom>
                          <strong>3-Phase Process:</strong> Department → Cross-Dept → Quota Selection
                        </Typography>
                        <Typography variant="body2" gutterBottom color="primary">
                          <strong>View detailed calculations in "Review" tab</strong>
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      🏆 Selected Top Performers ({selectedForQuota.length} of {quotaInfo?.quota_limit}):
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={fetchCurrentApprovalStatus}
                        disabled={loading || selectedForQuota.length === 0}
                        size="small"
                        title="Refresh approval status from database"
                      >
                        🔄 Refresh Status
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={submitStaffForApproval}
                        disabled={loading || reRatingOpen || selectedForQuota.length === 0}
                      >
                        Submit for Approval
                      </Button>
                    </Box>
                  </Box>
                </>
              )}

              <MaterialReactTable
                columns={[
                  {
                    accessorKey: 'global_rank',
                    header: 'Rank',
                    size: 80,
                    Cell: ({ cell, row }) => (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={`#${cell.getValue()}`}
                          color={cell.getValue() <= 3 ? 'success' : cell.getValue() <= 10 ? 'primary' : 'default'}
                          size="small"
                          variant={cell.getValue() <= 3 ? 'filled' : 'outlined'}
                        />
                      </Box>
                    )
                  },
                  {
                    accessorKey: 'name',
                    header: 'Name',
                    size: 200,
                    Cell: ({ row }) => (
                      <Typography variant="body2" fontWeight="bold">
                        {`${row.original.first_name} ${row.original.last_name}`}
                      </Typography>
                    )
                  },
                  {
                    accessorKey: 'department',
                    header: 'Department',
                    size: 180,
                    Cell: ({ cell }) => (
                      <Typography variant="body2">
                        {cell.getValue()}
                      </Typography>
                    )
                  },
                  {
                    accessorKey: 'final_ranking_score',
                    header: 'Final Score',
                    size: 120,
                    Cell: ({ cell, row }) => (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight="bold" color="primary">
                          {cell.getValue()?.toFixed(2) || row.original.calculated_scores?.final_score?.toFixed(2) || '0.00'}
                        </Typography>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor:
                              (cell.getValue() || 0) >= 90 ? '#4caf50' :
                              (cell.getValue() || 0) >= 80 ? '#2196f3' :
                              (cell.getValue() || 0) >= 70 ? '#ff9800' :
                              (cell.getValue() || 0) >= 60 ? '#f44336' : '#9e9e9e'
                          }}
                        />
                      </Box>
                    )
                  }
                ]}
                data={selectedForQuota}
                enableRowActions
                renderRowActions={({ row }) => {
                  const staff = row.original;
                  const isApproved = staff.approval_status === 'approved';
                  const isRejected = staff.approval_status === 'rejected';
                  const isPending = staff.approval_status === 'pending';
                  const isNotProcessed = !staff.approval_status || staff.approval_status === 'pending';

                  return (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      {staff.global_rank <= 3 && (
                        <Chip
                          label="Top Performer"
                          color="success"
                          size="small"
                          sx={{ mr: 1 }}
                        />
                      )}

                      {/* Show approval status chips */}
                      {isApproved && (
                        <Chip
                          label="✓ Approved"
                          color="success"
                          size="small"
                          variant="filled"
                          sx={{ mr: 1, fontWeight: 'bold' }}
                        />
                      )}
                      {isRejected && (
                        <Chip
                          label="✗ Rejected"
                          color="error"
                          size="small"
                          variant="filled"
                          sx={{ mr: 1, fontWeight: 'bold' }}
                        />
                      )}
                      {isPending && staff.submitted_for_approval && (
                        <Chip
                          label="⏳ Pending"
                          color="warning"
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                      )}

                      {/* Action buttons - only show if not yet processed */}
                      {isNotProcessed && !isApproved && !isRejected && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckIcon />}
                            onClick={() => handleApprove(staff.employee_id, `${staff.first_name} ${staff.last_name}`)}
                            title={`Approve Rank #${staff.global_rank} performer`}
                            disabled={loading || reRatingOpen}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<CloseIcon />}
                            onClick={() => handleReject(staff.employee_id, `${staff.first_name} ${staff.last_name}`)}
                            title={`Reject Rank #${staff.global_rank} performer`}
                            disabled={loading || reRatingOpen}
                          >
                            Reject
                          </Button>
                        </>
                      )}

                      {/* Show additional info for processed staff */}
                      {isApproved && staff.approved_at && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          Approved: {new Date(staff.approved_at).toLocaleDateString()}
                        </Typography>
                      )}
                      {isRejected && staff.rejected_at && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          Rejected: {new Date(staff.rejected_at).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  );
                }}
                state={{ isLoading: loading }}
                muiTablePaginationProps={{
                  rowsPerPageOptions: [5, 10, 20],
                  showFirstButton: false,
                  showLastButton: false,
                }}
              />
            </Box>
          )}

          {/* Review Tab - 3-Phase Detailed Calculations */}
          {tabValue === 1 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h5" gutterBottom>
                🔍 3-Phase Top Performer Selection Review
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Detailed breakdown of the department calculations, cross-department ranking, and quota-based selection
              </Typography>

              {calculationLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              )}

              {!calculationLoading && !detailedCalculations && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Button
                    variant="contained"
                    onClick={performThreePhaseCalculations}
                    sx={{ ml: 2 }}
                    disabled={!availableStaff || availableStaff.length === 0}
                  >
                    Calculate 3-Phase Selection
                  </Button>
                  {(!availableStaff || availableStaff.length === 0) && (
                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                      No staff data available for calculations
                    </Typography>
                  )}
                </Alert>
              )}

              {detailedCalculations && (
                <>
                  {/* Phase 1: Department Level Calculations */}
                  <Card sx={{ mb: 4 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        📊 Phase 1: Department Level Rankings
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Individual candidate scoring within departments using Excel formulas
                      </Typography>

                      {detailedCalculations.phases.phase1.departments &&
                        Object.entries(detailedCalculations.phases.phase1.departments).map(([deptName, deptData]) => (
                          <Paper key={deptName} sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
                            <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                              <Grid item>
                                <Typography variant="h6" color="primary">
                                  🏢 {deptName}
                                </Typography>
                              </Grid>
                              <Grid item>
                                <Chip
                                  label={`${deptData.total_candidates} candidates`}
                                  color="info"
                                  size="small"
                                />
                              </Grid>
                              <Grid item>
                                <Chip
                                  label={`${deptData.non_managerial_count || 0} non-managerial staff`}
                                  color="info"
                                  size="small"
                                />
                              </Grid>
                              <Grid item>
                                <Chip
                                  label={`${deptData.managerial_count || 0} managers`}
                                  color="warning"
                                  size="small"
                                />
                              </Grid>
                              {deptData.eligible_voters > 0 && (
                                <Grid item>
                                  <Chip
                                    label={`${deptData.eligible_voters} peer voters`}
                                    color="secondary"
                                    size="small"
                                  />
                                </Grid>
                              )}
                            </Grid>

                            {/* Department Candidates Table */}
                            <MaterialReactTable
                              columns={[
                                {
                                  accessorKey: 'rank',
                                  header: 'Dept Rank',
                                  size: 80,
                                  Cell: ({ cell }) => (
                                    <Chip
                                      label={`#${cell.getValue()}`}
                                      color={cell.getValue() === 1 ? 'success' : 'default'}
                                      size="small"
                                      variant={cell.getValue() === 1 ? 'filled' : 'outlined'}
                                    />
                                  )
                                },
                                { accessorKey: 'name', header: 'Name', size: 150 },
                                { accessorKey: 'employee_id', header: 'Employee ID', size: 120 },
                                {
                                  accessorKey: 'score_breakdown.performance_out_of_50',
                                  header: 'Performance (50%)',
                                  size: 120,
                                  Cell: ({ cell }) => (
                                    <Typography variant="body2" fontWeight="bold" color="primary">
                                      {cell.getValue()?.toFixed(2) || '0.00'}
                                    </Typography>
                                  )
                                },
                                {
                                  accessorKey: 'score_breakdown',
                                  header: 'Manager/Director Rating',
                                  size: 140,
                                  Cell: ({ cell, row }) => {
                                    const scoreData = cell.getValue();
                                    const isManagerial = isEmployeeManager(row.original);

                                    if (isManagerial) {
                                      return (
                                        <Box>
                                          <Typography variant="body2" color="warning.main" fontWeight="bold">
                                            {scoreData?.director_rating_out_of_50?.toFixed(2) || '0.00'}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" display="block">
                                            Director (50%)
                                          </Typography>
                                        </Box>
                                      );
                                    } else {
                                      const managerRating = scoreData?.managerial_rating_out_of_30 || 0;
                                      const hasManagerRating = managerRating > 0;

                                      return (
                                        <Box>
                                          <Typography
                                            variant="body2"
                                            color={hasManagerRating ? "secondary.main" : "text.disabled"}
                                            fontWeight="bold"
                                          >
                                            {managerRating.toFixed(2)}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" display="block">
                                            {hasManagerRating ? "Manager (30%)" : "No Manager Rating"}
                                          </Typography>
                                        </Box>
                                      );
                                    }
                                  }
                                },
                                {
                                  accessorKey: 'score_breakdown',
                                  header: 'Peer Rating (20%)',
                                  size: 130,
                                  Cell: ({ cell, row }) => {
                                    const scoreData = cell.getValue();
                                    const isManagerial = isEmployeeManager(row.original);

                                    if (isManagerial) {
                                      return (
                                        <Typography variant="body2" color="text.disabled" fontStyle="italic">
                                          N/A (Manager)
                                        </Typography>
                                      );
                                    } else {
                                      return (
                                        <Box>
                                          <Typography variant="body2" color="info.main" fontWeight="bold">
                                            {scoreData?.peer_rating_out_of_20?.toFixed(2) || '0.00'}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" display="block">
                                            {scoreData?.votes_received || 0}/{scoreData?.total_eligible_voters || 0} votes
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" display="block">
                                            {scoreData?.peer_voting_percentage?.toFixed(1) || 0}%
                                          </Typography>
                                        </Box>
                                      );
                                    }
                                  }
                                },
                                {
                                  accessorKey: 'score_breakdown',
                                  header: 'Weighted Rating',
                                  size: 120,
                                  Cell: ({ cell, row }) => {
                                    const scoreData = cell.getValue();
                                    const isManagerial = isEmployeeManager(row.original);

                                    if (isManagerial) {
                                      return (
                                        <Typography variant="body2" color="text.disabled" fontStyle="italic">
                                          N/A (Manager)
                                        </Typography>
                                      );
                                    } else {
                                      return (
                                        <Box>
                                          <Typography variant="body2" color="success.main" fontWeight="bold">
                                            {scoreData?.weighted_rating?.toFixed(2) || '0.00'}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" display="block">
                                            (P4×N4)÷100
                                          </Typography>
                                        </Box>
                                      );
                                    }
                                  }
                                },
                                {
                                  accessorKey: 'score_breakdown',
                                  header: 'Total Weighted Result',
                                  size: 140,
                                  Cell: ({ cell, row }) => {
                                    const scoreData = cell.getValue();
                                    const isManagerial = isEmployeeManager(row.original);

                                    if (isManagerial) {
                                      return (
                                        <Typography variant="body2" color="text.disabled" fontStyle="italic">
                                          N/A (Manager)
                                        </Typography>
                                      );
                                    } else {
                                      return (
                                        <Box>
                                          <Typography variant="body2" color="secondary.main" fontWeight="bold">
                                            {scoreData?.total_weighted_result?.toFixed(2) || '0.00'}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" display="block">
                                            50%+30%+Weighted
                                          </Typography>
                                        </Box>
                                      );
                                    }
                                  }
                                },
                                {
                                  accessorKey: 'final_score',
                                  header: 'Final Score',
                                  size: 120,
                                  Cell: ({ cell }) => (
                                    <Typography variant="body1" fontWeight="bold">
                                      {cell.getValue()?.toFixed(2) || '0.00'}
                                    </Typography>
                                  )
                                },
                                {
                                  accessorKey: 'score_breakdown.score_type',
                                  header: 'Formula Used',
                                  size: 150,
                                  Cell: ({ cell }) => (
                                    <Chip
                                      label={cell.getValue()}
                                      color={cell.getValue() === 'managerial' ? 'warning' :
                                             cell.getValue() === 'total_weighted_result' ? 'success' : 'info'}
                                      size="small"
                                      variant="outlined"
                                    />
                                  )
                                }
                              ]}
                              data={deptData.candidates}
                              enableSorting={false}
                              enableColumnActions={false}
                              enableGlobalFilter={false}
                              enablePagination={false}
                              enableBottomToolbar={false}
                              muiTableProps={{
                                sx: {
                                  '& .MuiTableRow-root:nth-of-type(1)': {
                                    backgroundColor: '#e8f5e8',
                                    fontWeight: 'bold'
                                  }
                                }
                              }}
                            />

                            {/* Excel Formulas Used */}
                            <Box sx={{ mt: 2, p: 2, backgroundColor: '#fff3cd', borderRadius: 1 }}>
                              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                📝 Excel Formulas Used:
                              </Typography>
                              <Typography variant="caption" display="block" fontWeight="bold" color="primary">
                                For Managers:
                              </Typography>
                              <Typography variant="caption" display="block">
                                • Performance 50%: Performance Score ÷ 2
                              </Typography>
                              <Typography variant="caption" display="block">
                                • Director Rating 50%: (total_weighted_score ÷ max_possible_score) × 50
                              </Typography>
                              <Typography variant="caption" display="block" fontWeight="bold">
                                • Final Score = Performance 50% + Director Rating 50%
                              </Typography>

                              <Typography variant="caption" display="block" fontWeight="bold" color="secondary" sx={{ mt: 1 }}>
                                For Non-Managerial Staff:
                              </Typography>
                              <Typography variant="caption" display="block">
                                • Performance 50%: Performance Score ÷ 2
                              </Typography>
                              <Typography variant="caption" display="block">
                                • Manager Rating 30%: (total_weighted_score ÷ max_possible_score) × 30
                              </Typography>
                              <Typography variant="caption" display="block">
                                • P4 (Peer Rating 20%): (O4 × 20) ÷ 50
                              </Typography>
                              <Typography variant="caption" display="block">
                                • N4 (Vote Percentage): (M4 ÷ K4) × 100
                              </Typography>
                              <Typography variant="caption" display="block">
                                • Weighted Rating: (P4 × N4) ÷ 100
                              </Typography>
                              <Typography variant="caption" display="block" fontWeight="bold">
                                • Total Weighted Result = Performance + Manager + Weighted Rating
                              </Typography>
                              <Typography variant="caption" display="block" fontWeight="bold">
                                • Final Score = Total Weighted Result (if has manager) OR Performance + Manager + Peer Rating (if no manager)
                              </Typography>

                              <Typography variant="caption" display="block" color="info.main" sx={{ mt: 1 }}>
                                ℹ️ K4=Total Eligible Voters, M4=Votes Received, O4=Average Peer Rating, P4=Peer Rating 20%, N4=Vote Percentage
                              </Typography>
                              <Typography variant="caption" display="block" color="warning.main">
                                ⚡ Managers and Non-Managerial staff are compared within departments using their respective scoring systems
                              </Typography>
                            </Box>
                          </Paper>
                        ))
                      }
                    </CardContent>
                  </Card>

                  {/* Phase 2: Cross-Department Rankings */}
                  <Card sx={{ mb: 4 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        🏆 Phase 2: Cross-Department Ranking
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Top performer from each department ranked against each other
                      </Typography>

                      <MaterialReactTable
                        columns={[
                          {
                            accessorKey: 'cross_dept_rank',
                            header: 'Cross-Dept Rank',
                            size: 120,
                            Cell: ({ cell }) => (
                              <Chip
                                label={`#${cell.getValue()}`}
                                color={cell.getValue() <= 3 ? 'success' : 'primary'}
                                size="small"
                                variant={cell.getValue() <= 3 ? 'filled' : 'outlined'}
                              />
                            )
                          },
                          { accessorKey: 'name', header: 'Name', size: 150 },
                          { accessorKey: 'department', header: 'Department', size: 120 },
                          {
                            accessorKey: 'dept_rank',
                            header: 'Dept Rank',
                            size: 100,
                            Cell: ({ cell }) => (
                              <Typography variant="body2" color="text.secondary">
                                #{cell.getValue()}
                              </Typography>
                            )
                          },
                          {
                            accessorKey: 'final_score',
                            header: 'Score',
                            size: 100,
                            Cell: ({ cell }) => (
                              <Typography variant="body1" fontWeight="bold">
                                {cell.getValue()?.toFixed(2)}
                              </Typography>
                            )
                          },
                          {
                            accessorKey: 'score_type',
                            header: 'Score Type',
                            size: 130,
                            Cell: ({ cell }) => (
                              <Chip
                                label={cell.getValue()}
                                color={cell.getValue() === 'managerial' ? 'warning' : 'info'}
                                size="small"
                                variant="outlined"
                              />
                            )
                          }
                        ]}
                        data={detailedCalculations.phases.phase2.results}
                        enableSorting={false}
                        enableColumnActions={false}
                        enableGlobalFilter={false}
                        enablePagination={false}
                        enableBottomToolbar={false}
                        muiTableProps={{
                          sx: {
                            '& .MuiTableRow-root:nth-of-type(-n+3)': {
                              backgroundColor: '#e8f5e8'
                            }
                          }
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Phase 3: Final Quota-Based Selection */}
                  <Card sx={{ mb: 4 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        🎯 Phase 3: Final Quota-Based Selection
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Top N performers selected based on available quota slots
                      </Typography>

                      {/* Quota Statistics */}
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={3}>
                          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e3f2fd' }}>
                            <Typography variant="h4" color="primary" fontWeight="bold">
                              {detailedCalculations.phases.phase3.statistics?.available_slots || 0}
                            </Typography>
                            <Typography variant="body2">Available Slots</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e8f5e8' }}>
                            <Typography variant="h4" color="success.main" fontWeight="bold">
                              {detailedCalculations.phases.phase3.statistics?.slots_filled || 0}
                            </Typography>
                            <Typography variant="body2">Selected</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#fff3e0' }}>
                            <Typography variant="h4" color="warning.main" fontWeight="bold">
                              {detailedCalculations.phases.phase3.statistics?.quota_utilization_percentage?.toFixed(1) || 0}%
                            </Typography>
                            <Typography variant="body2">Quota Utilization</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#fce4ec' }}>
                            <Typography variant="h4" color="secondary.main" fontWeight="bold">
                              {Object.keys(detailedCalculations.phases.phase1.departments || {}).length}
                            </Typography>
                            <Typography variant="body2">Departments</Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* Final Selected Staff */}
                      <MaterialReactTable
                        columns={[
                          {
                            accessorKey: 'final_rank',
                            header: 'Final Rank',
                            size: 100,
                            Cell: ({ cell }) => (
                              <Chip
                                label={`#${cell.getValue()}`}
                                color="success"
                                size="small"
                                variant="filled"
                              />
                            )
                          },
                          { accessorKey: 'name', header: 'Name', size: 150 },
                          { accessorKey: 'department', header: 'Department', size: 120 },
                          {
                            accessorKey: 'cross_dept_rank',
                            header: 'Cross-Dept Rank',
                            size: 120,
                            Cell: ({ cell }) => (
                              <Typography variant="body2">
                                #{cell.getValue()}
                              </Typography>
                            )
                          },
                          {
                            accessorKey: 'final_score',
                            header: 'Final Score',
                            size: 120,
                            Cell: ({ cell }) => (
                              <Typography variant="body1" fontWeight="bold" color="success.main">
                                {cell.getValue()?.toFixed(2)}
                              </Typography>
                            )
                          },
                          {
                            accessorKey: 'selection_reason',
                            header: 'Selection Reason',
                            size: 150,
                            Cell: ({ cell }) => (
                              <Chip
                                label={cell.getValue() === 'quota_based_top_performer' ? 'Quota Selection' : cell.getValue()}
                                color="success"
                                size="small"
                                variant="outlined"
                              />
                            )
                          }
                        ]}
                        data={detailedCalculations.phases.phase3.results}
                        enableSorting={false}
                        enableColumnActions={false}
                        enableGlobalFilter={false}
                        enablePagination={false}
                        enableBottomToolbar={false}
                        muiTableProps={{
                          sx: {
                            '& .MuiTableRow-root': {
                              backgroundColor: '#f1f8e9'
                            }
                          }
                        }}
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </Box>
          )}

        </CardContent>
      </Card>

      {/* Rejection Reason Dialog */}
      <Dialog
        open={rejectionDialog.open}
        onClose={closeRejectionDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Reject Staff Member
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
            You are about to reject <strong>{rejectionDialog.employeeName}</strong>.
            Please provide a reason for this decision.
          </Typography>

          <TextField
            label="Rejection Reason *"
            value={rejectionDialog.reason}
            onChange={(e) => setRejectionDialog(prev => ({ ...prev, reason: e.target.value }))}
            fullWidth
            multiline
            rows={3}
            margin="normal"
            placeholder="e.g., Performance below threshold, Missing required skills, etc."
            helperText="This reason will be recorded and may be shared with relevant stakeholders"
          />

          <TextField
            label="Additional Comments (Optional)"
            value={rejectionDialog.comments}
            onChange={(e) => setRejectionDialog(prev => ({ ...prev, comments: e.target.value }))}
            fullWidth
            multiline
            rows={2}
            margin="normal"
            placeholder="Any additional comments or feedback..."
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeRejectionDialog}
            color="inherit"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={submitRejection}
            color="error"
            variant="contained"
            disabled={loading || !rejectionDialog.reason.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : <CloseIcon />}
          >
            {loading ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send to Deputy Chief Human Capital Dialog */}
      <Dialog
        open={reRatingDialog.open}
        onClose={closeReRatingDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Send to Deputy Chief Human Capital?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            You rejected <strong>{reRatingDialog.employeeName}</strong>. Do you want to send this to the
            Deputy Chief Human Capital for approval so your directors can rate again?
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            If approved:
            <ul>
              <li>All director ratings given under you, for managers and non-managerial staff, are deleted.</li>
              <li>Directors rate again, and the selection is recalculated with the new ratings.</li>
              <li>Peer votes are not changed.</li>
              <li>The new ranking comes back to you for approval.</li>
            </ul>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeReRatingDialog}
            color="inherit"
            disabled={loading}
          >
            No
          </Button>
          <Button
            onClick={sendForReRating}
            color="primary"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            Yes, Send
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer position="top-right" autoClose={3000} />
    </Box>
  );
};

export default ChiefApproval;