
import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilCalculator,
  cilChartPie,
  cilCursor,
  cilDescription,
  cilDrop,
  cilNotes,
  cilPencil,
  cilPuzzle,
  cilSpeedometer,
  cilStar,
  cilUserFemale 
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'


const _nav = (userRole) => [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },

  ...(userRole === 'user' ? [
    {
      component: CNavTitle,
      name: 'User',
    },

    {
      component: CNavGroup,
      name: 'User',
      to: '/user',
      icon: <CIcon icon={cilUserFemale} customClassName="nav-icon" />,
      items: [ 
        {
          component: CNavItem,
          name: 'Vote',
          to: '/admin/vote'
        },
        {
          component: CNavItem,
          name: 'Game',
          to: '/admin/Game'
        },
      ],
    },


  ] : []),





  ...(userRole === 'admin' ? [
  {
    component: CNavTitle,
    name: 'Admin',
  },

  {
    component: CNavGroup,
    name: 'Admin',
    to: '/admin',
    icon: <CIcon icon={cilUserFemale} customClassName="nav-icon" />,
    items: [
      
        {
          component: CNavItem,
          name: 'Employee',
          to: '/admin/employee'
        },
        {
          component: CNavItem,
          name: 'Candidate',
          to: '/admin/candidate'
        },

        {
          component: CNavItem,
          name: 'Vote',
          to: '/admin/vote'
        },
        {
          component: CNavItem,
          name: 'VoteStastics',
          to: '/admin/vote_stastics'
        },
        {
          component: CNavItem,
          name: 'Game',
          to: '/admin/Game'
        },

        {
          component: CNavItem,
          name: 'Dashborad',
          to: '/admin/dashboard'
        },

        {
          component: CNavItem,
          name: 'Chat',
          to: '/admin/chat'
        },

  
       

        
        // {
        //   component: CNavItem,
        //   name: 'KPI_For_Site_Manger',
        //   to: '/admin/kpiForSitemanager'
        // },
       
        // { 
        //   component: CNavItem,
        //   name: 'Customer',
        //   to: '/admin/customer',
        // },

        // { 
        //   component: CNavItem,
        //   name: 'Place',
        //   to: '/admin/place',
        // },
        // { 
        //   component: CNavItem,
        //   name: 'Site',
        //   to: '/admin/site',
        // },

        // { 
        //   component: CNavItem,
        //   name: 'Building',
        //   to: '/admin/building',
        // },
        // { 
        //   component: CNavItem,
        //   name: 'Floor',
        //   to: '/admin/floor',
        // },
        // { 
        //   component: CNavItem,
        //   name: 'Room',
        //   to: '/admin/room',
        // },

        // { 
        //   component: CNavItem,
        //   name: 'Aggrement',
        //   to: '/admin/aggrement',
        // },

        // { 
        //   component: CNavGroup,
        //   name: 'Set Price ',
        //   to: '/admin/price',
        //   icon: <CIcon icon={cilUserFemale} customClassName="nav-icon" />,
        //   items: [
        //     { 
        //       component: CNavItem,
        //       name: 'Price_Per_Place',
        //       to: '/admin/price/price_per_place',
        //     },
        //     { 
        //       component: CNavItem,
        //       name: 'Price_Per_Site',
        //       to: '/admin/price/price_per_site',
        //     },
        //     { 
        //       component: CNavItem,
        //       name: 'Price_Per_Building',
        //       to: '/admin/price/price_per_building',
        //     },
        //     { 
        //       component: CNavItem,
        //       name: 'Price_Per_Floor',
        //       to: '/admin/price/price_per_floor',
        //     },
        //     { 
        //       component: CNavItem,
        //       name: 'Price_Per_Room',
        //       to: '/admin/price/price_per_room',
        //     },
          // ]
        // },
       

     
      
    ],
  },

] : []),









  // {
  //   component: CNavTitle,
  //   name: 'Theme',
  // },
  // {
  //   component: CNavItem,
  //   name: 'Colors',
  //   to: '/theme/colors',
  //   icon: <CIcon icon={cilDrop} customClassName="nav-icon" />,
  // },
  // {
  //   component: CNavItem,
  //   name: 'Typography',
  //   to: '/theme/typography',
  //   icon: <CIcon icon={cilPencil} customClassName="nav-icon" />,
  // },
  // {
  //   component: CNavTitle,
  //   name: 'Components',
  // },
  // {
  //   component: CNavGroup,
  //   name: 'Base',
  //   to: '/base',
  //   icon: <CIcon icon={cilPuzzle} customClassName="nav-icon" />,
  //   items: [
  //     ...(userRole === 'admin' ? [
  //       { 
  //         component: CNavItem,
  //         name: 'AdminPage',
  //         to: '/base/adminPage',
  //       },
  //     ] : []),

  //     ...(userRole === 'branch' ? [
  //       { 
  //         component: CNavItem,
  //         name: 'AdvancedTables',
  //         to: '/base/advanceTable',
  //       },
  //     ] : []),



  //     { 
  //       component: CNavItem,
  //       name: 'UserManagement',
  //       to: '/base/userManagements',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Accordion',
  //       to: '/base/accordion',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Breadcrumb',
  //       to: '/base/breadcrumbs',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Cards',
  //       to: '/base/cards',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Carousel',
  //       to: '/base/carousels',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Collapse',
  //       to: '/base/collapses',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'List group',
  //       to: '/base/list-groups',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Navs & Tabs',
  //       to: '/base/navs',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Pagination',
  //       to: '/base/paginations',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Placeholders',
  //       to: '/base/placeholders',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Popovers',
  //       to: '/base/popovers',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Progress',
  //       to: '/base/progress',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Spinners',
  //       to: '/base/spinners',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Tables',
  //       to: '/base/tables',
  //     },
     
  //     // {
  //     //   component: CNavItem,
  //     //   name: 'AdvancedTables',
  //     //   to: '/base/advanceTable',
  //     // },
  //     {
  //       component: CNavItem,
  //       name: 'Tabs',
  //       to: '/base/tabs',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Tooltips',
  //       to: '/base/tooltips',
  //     },
  //   ],
  // },
  // {
  //   component: CNavGroup,
  //   name: 'Buttons',
  //   to: '/buttons',
  //   icon: <CIcon icon={cilCursor} customClassName="nav-icon" />,
  //   items: [
  //     {
  //       component: CNavItem,
  //       name: 'Buttons',
  //       to: '/buttons/buttons',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Buttons groups',
  //       to: '/buttons/button-groups',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Dropdowns',
  //       to: '/buttons/dropdowns',
  //     },
  //   ],
  // },
  // {
  //   component: CNavGroup,
  //   name: 'Forms',
  //   icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
  //   items: [
  //     {
  //       component: CNavItem,
  //       name: 'Form Control',
  //       to: '/forms/form-control',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Select',
  //       to: '/forms/select',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Checks & Radios',
  //       to: '/forms/checks-radios',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Range',
  //       to: '/forms/range',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Input Group',
  //       to: '/forms/input-group',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Floating Labels',
  //       to: '/forms/floating-labels',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Layout',
  //       to: '/forms/layout',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Validation',
  //       to: '/forms/validation',
  //     },
  //   ],
  // },
  // {
  //   component: CNavItem,
  //   name: 'Charts',
  //   to: '/charts',
  //   icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
  // },
  // {
  //   component: CNavGroup,
  //   name: 'Icons',
  //   icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
  //   items: [
  //     {
  //       component: CNavItem,
  //       name: 'CoreUI Free',
  //       to: '/icons/coreui-icons',
  //       badge: {
  //         color: 'success',
  //         text: 'NEW',
  //       },
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'CoreUI Flags',
  //       to: '/icons/flags',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'CoreUI Brands',
  //       to: '/icons/brands',
  //     },
  //   ],
  // },
  // {
  //   component: CNavGroup,
  //   name: 'Notifications',
  //   icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
  //   items: [
  //     {
  //       component: CNavItem,
  //       name: 'Alerts',
  //       to: '/notifications/alerts',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Badges',
  //       to: '/notifications/badges',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Modal',
  //       to: '/notifications/modals',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Toasts',
  //       to: '/notifications/toasts',
  //     },
  //   ],
  // },
  // {
  //   component: CNavItem,
  //   name: 'Widgets',
  //   to: '/widgets',
  //   icon: <CIcon icon={cilCalculator} customClassName="nav-icon" />,
  //   badge: {
  //     color: 'info',
  //     text: 'NEW',
  //   },
  // },
  // {
  //   component: CNavTitle,
  //   name: 'Extras',
  // },
  // {
  //   component: CNavGroup,
  //   name: 'Pages',
  //   icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
  //   items: [
  //     {
  //       component: CNavItem,
  //       name: 'Login',
  //       to: '/login',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Register',
  //       to: '/register',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Error 404',
  //       to: '/404',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Error 500',
  //       to: '/500',
  //     },
  //   ],
  // },
  // {
  //   component: CNavItem,
  //   name: 'Docs',
  //   href: 'https://coreui.io/react/docs/templates/installation/',
  //   icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
  // },
]

export default _nav
