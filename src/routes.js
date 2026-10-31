import { element } from 'prop-types'
import React from 'react'

import PrivateRoute from './privateRoute'
import { roles } from './views/admin/System_User_Management/fetchedRole'

// admin
const Candidate = React.lazy(() => import('./views/admin/Candidate/candidate'));
const SimplifiedCandidate = React.lazy(() => import('./views/admin/SimplifiedCandidate'));
const Template = React.lazy(() => import('./views/admin/Template'));
const QuotaSelection = React.lazy(() => import('./views/admin/QuotaSelection'));
const Vote = React.lazy(()=> import('./views/admin/Vote/vote'));
const VoteStastics = React.lazy(()=> import('./views/admin/Vote_Stastics/vote_stastics'));
const Game = React.lazy(()=> import('./views/admin/Game/game'));
const Dashboard = React.lazy(()=> import('./views/admin/dashbord/dashbord'));
const Chat = React.lazy(()=> import('./views/admin/Chat/chat'));

// Hierarchical Voting Components
const HierarchicalVotingManagement = React.lazy(() => import('./views/admin/HierarchicalVoting/HierarchicalVotingManagement'));
const PeerVoting = React.lazy(() => import('./views/admin/HierarchicalVoting/PeerVoting'));
const ManagerialRating = React.lazy(() => import('./views/admin/HierarchicalVoting/ManagerialRating'));
const ChiefApproval = React.lazy(() => import('./views/admin/HierarchicalVoting/ChiefApproval'));
const SelectedBestStaff = React.lazy(() => import('./views/admin/HierarchicalVoting/SelectedBestStaff'));
const ReRatingApproval = React.lazy(() => import('./views/admin/HierarchicalVoting/ReRatingApproval'));
const ParticipationDashboard = React.lazy(() => import('./views/admin/ParticipationDashboard/ParticipationDashboard'));
const FiscalYears = React.lazy(() => import('./views/admin/FiscalYear/FiscalYears'));

// Hierarchical Registration Components
const ChiefRegistration = React.lazy(() => import('./views/admin/Hierarchy/ChiefRegistration'));
const DirectorRegistration = React.lazy(() => import('./views/admin/Hierarchy/DirectorRegistration'));
const ManagerRegistration = React.lazy(() => import('./views/admin/Hierarchy/ManagerRegistration'));
const HierarchyManagement = React.lazy(() => import('./views/admin/HierarchyManagement'));
const HierarchyMapping = React.lazy(() => import('./views/admin/HierarchyMapping'));
const DepartmentRegistration = React.lazy(() => import('./views/admin/DepartmentRegistration'));





const System_User_Management = React.lazy(() => import('./views/admin/System_User_Management/systemUserManagement'))
const ProfessionalRegistration = React.lazy(() => import('./views/admin/ProfessionalRegistration'))

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Chat', element: Chat },



  // admin component
  {
    path: '/admin/employee',
    name: 'Employee',
    element: ProfessionalRegistration,
    roles: ['admin']
  },
  {
    path: '/admin/candidate',
    name: 'Candidate',
    element: SimplifiedCandidate,
    roles: ['admin']
  },
  {
    path: '/admin/template',
    name: 'Template',
    element: Template,
    roles: ['admin']
  },
  {
    path: '/admin/quota-selection',
    name: 'Quota Selection',
    element: QuotaSelection,
    roles: ['admin']
  },
  {
    path: '/admin/vote',
    name: 'Vote',
    element: Vote,
    roles: ['admin','user']
  },
  {
    path: '/admin/vote_stastics',
    name: 'VoteStastics',
    element: VoteStastics,
    roles: ['admin']
  },
  {
    path: '/admin/Game',
    name: 'Game',
    element: Game,
    roles: ['admin','user']
  },
  {
    path: '/admin/dashboard',
    name: 'Dashboard',
    element: Dashboard,
    roles: ['admin']
  },
  {
    path: '/admin/chat',
    name: 'Chat',
    element: Chat,
    roles: ['admin']
  },

  // Hierarchical Voting Routes
  {
    path: '/admin/hierarchical-voting',
    name: 'Hierarchical Voting Management',
    element: HierarchicalVotingManagement,
    roles: ['admin']
  },
  {
    path: '/admin/peer-voting',
    name: 'Peer Voting',
    element: PeerVoting,
    roles: ['admin', 'user']
  },
  {
    path: '/admin/managerial-rating',
    name: 'Managerial Rating',
    element: ManagerialRating,
    roles: ['admin', 'director']
  },
  {
    path: '/admin/chief-approval',
    name: 'Chief Approval',
    element: ChiefApproval,
    roles: ['admin', 'chief']
  },
  {
    path: '/admin/selected-best-staff',
    name: 'Selected Best Staff',
    element: SelectedBestStaff,
    roles: ['admin']
  },
  {
    path: '/admin/re-rating-approval',
    name: 'Re-rating Approvals',
    element: ReRatingApproval,
    roles: ['admin', 'chief']
  },
  {
    path: '/admin/participation-dashboard',
    name: 'Participation Dashboard',
    element: ParticipationDashboard,
    roles: ['admin']
  },
  {
    path: '/admin/fiscal-years',
    name: 'Fiscal Years',
    element: FiscalYears,
    roles: ['admin']
  },

  // Hierarchical Registration Routes
  {
    path: '/admin/hierarchy/chief',
    name: 'Chief Registration',
    element: ChiefRegistration,
    roles: ['admin']
  },
  {
    path: '/admin/hierarchy/director',
    name: 'Director Registration',
    element: DirectorRegistration,
    roles: ['admin']
  },
  {
    path: '/admin/hierarchy/manager',
    name: 'Manager Registration',
    element: ManagerRegistration,
    roles: ['admin']
  },
  {
    path: '/admin/manage-hierarchy',
    name: 'View Hierarchy',
    element: HierarchyManagement,
    roles: ['admin']
  },
  {
    path: '/admin/hierarchy-mapping',
    name: 'Hierarchy Mapping',
    element: HierarchyMapping,
    roles: ['admin']
  },
  {
    path: '/admin/department',
    name: 'Department Registration',
    element: DepartmentRegistration,
    roles: ['admin']
  },


]

export default routes
