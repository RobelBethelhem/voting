import { element } from 'prop-types'
import React from 'react'

import PrivateRoute from './privateRoute'
import { roles } from './views/admin/System_User_Management/fetchedRole'

const Dashboard = React.lazy(() => import('./views/admin/dashbord/dashbord'))



// admin
const Candidate = React.lazy(() => import('./views/admin/Candidate/candidate'));
const Vote = React.lazy(()=> import('./views/admin/Vote/vote'));
const VoteStastics = React.lazy(()=> import('./views/admin/Vote_Stastics/vote_stastics'));
const Game = React.lazy(()=> import('./views/admin/Game/game'));
const Dashborad = React.lazy(()=> import('./views/admin/dashbord/dashbord'));
const Chat = React.lazy(()=> import('./views/admin/Chat/chat'));





const System_User_Management = React.lazy(() => import('./views/admin/System_User_Management/systemUserManagement'))

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Chat', element: Chat },



  // admin component
  {
    path: '/admin/employee',
    name: 'Employee',
    element: System_User_Management,
    roles: ['admin']
  },
  {
    path: '/admin/candidate',
    name: 'Candidate',
    element: Candidate,
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
    name: 'Dashborad',
    element: Dashborad,
    roles: ['admin']
  },
  {
    path: '/admin/chat',
    name: 'Chat',
    element: Chat,
    roles: ['admin']
  },
  

  
]

export default routes
