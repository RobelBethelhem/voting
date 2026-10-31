// import { useEffect, useState } from 'react';
// import { Navigate } from 'react-router-dom';
// import { toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// const LogOut = () => {
//   const [redirectPath, setRedirectPath] = useState(null);

//   useEffect(() => {
//     const logOut = async () => {
//       const refreshToken = localStorage.getItem('refreshToken');
//       if (refreshToken) {
//         try {
//           const response = await fetch(`${API_BASE}/refreshToken/`, {
//             method: 'DELETE',
//             headers: {
//               'Content-Type': 'application/json',
//               'x-refresh-token': refreshToken,
//             },
//           });

//           if (response.ok) {
//             localStorage.removeItem('refreshToken');
//             localStorage.removeItem('accessToken');
//             setRedirectPath('/');
//           } else {
//             throw new Error('Failed to log out');
//           }
//         } catch (error) {
//           toast.error('Error while logging out.');
//           console.error('Error while logging out:', error);
//         } finally {
//           setRedirectPath('/');
//         }
//       } else {
//         setRedirectPath('/');
//       }
//     };

//     logOut();
//   }, []);

//   if (redirectPath) {
//     return <Navigate to={redirectPath} replace />;
//   }

//   return (
//     <div>
//       <p>Logging out...</p>
//     </div>
//   );
// };

// export default LogOut;











import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE } from 'src/api/base';

const LogOut = () => {
  const [redirectPath, setRedirectPath] = useState(null);
  const dispatch = useDispatch();
  const refreshToken = useSelector(state => state.user.refreshToken);

  useEffect(() => {
    const logOut = async () => {
      try {
        if (refreshToken) {
          const response = await fetch(`${API_BASE}/refreshToken/`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'x-refresh-token': refreshToken,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to log out');
          }
          // else{
          //   throw new Error('Failed to log out');
          //   toast.success('Successfully logged out!');
          // }
        }
      } catch (error) {
       
        console.error('Error while logging out:', error);
      } finally {
        
        // Clear Redux state
        dispatch({ type: 'clearUser' });
        setRedirectPath('/');
      }
    };

    logOut();
  }, [dispatch, refreshToken]);

  useEffect(() => {
    if (redirectPath) {
      toast.success('Logged out successfully');
    }
  }, [redirectPath]);

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div>
      <p>Logging out...</p>
    </div>
  );
};

export default LogOut;

