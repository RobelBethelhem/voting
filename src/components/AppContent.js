import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CContainer, CSpinner } from '@coreui/react';
import PrivateRoute from '../privateRoute';
import routes from '../routes';


const AppContent = () => {
  
  return (
    <CContainer className="px-4" lg>
      <Suspense fallback={<CSpinner color="primary" />}>
        <Routes>
          {routes.map((route, idx) => {
            const RouteComponent = route.roles ? (
              <PrivateRoute allowedRoles={route.roles} key={idx}>
                <route.element />
              </PrivateRoute>
            ) : (
              <route.element key={idx} />
            );

            return (
              route.element && (
                <Route
                  key={idx}
                  path={route.path}
                  exact={route.exact}
                  name={route.name}
                  element={RouteComponent}
                />
              )
            );
          })}
          
          {/* Uncomment and update the default route if needed */}
          {/* <Route path="/" element={<Navigate to="dashboard" />} /> */}
        </Routes>
      </Suspense>
    </CContainer>
  );
};

export default React.memo(AppContent);