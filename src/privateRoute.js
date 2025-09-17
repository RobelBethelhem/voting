import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import {jwtDecode} from 'jwt-decode';

import { useDispatch, useSelector } from 'react-redux';

const PrivateRoute = ({ allowedRoles, children }) => {
  const accessToken = useSelector(state => state.user.accessToken);
  //const accessToken = localStorage.getItem('accessToken');
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch('/api/api/verify-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-access-token': accessToken
          }
        });

        if (response.ok) {
          const decodedToken = jwtDecode(accessToken);
          const userRole = decodedToken.roles[0];
          setIsTokenValid(allowedRoles.includes(userRole));
        } else {
          setIsTokenValid(false);
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        setIsTokenValid(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      verifyToken();
    } else {
      setIsLoading(false);
    }
  }, [accessToken, allowedRoles]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!accessToken || !isTokenValid) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
};

export default PrivateRoute;