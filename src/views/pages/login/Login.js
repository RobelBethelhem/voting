import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {jwtDecode} from 'jwt-decode';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CImage,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLockLocked, cilUser } from '@coreui/icons';
import { logo } from '../../../assets/brand/logo';
import { useDispatch, useSelector } from 'react-redux';
import { API_BASE } from 'src/api/base';

const Login = () => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [redirectPath, setRedirectPath] = useState(null); 
  
  useEffect(() => {
    const accessToken = user.accessToken;
    if (accessToken) {
      const verifyToken = async () => {
        try {
          const response = await fetch(`${API_BASE}/verify-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-access-token': accessToken
            }
          });

          if (response.ok) {
            const decodedToken = jwtDecode(accessToken);
           // const userRole = decodedToken.roles[0];
            setRedirectPath('/dashboard');
            // if (userRole === 'admin') {
            //   setRedirectPath('/dashboard');
            // } else {
      
            //   setRedirectPath('/register');
            // }
          } else {
            toast.error('Invalid or Expiry Token');
            dispatch({ type: 'clearUser' });
          }
        } catch (error) {
          toast.error('Unknown Error. Try Again Later');
        }
      };
      verifyToken();
    }
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData, 
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/temp-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok) {
        // localStorage.setItem("refreshToken", data.refreshToken);
        // localStorage.setItem("accessToken", data.accessToken);
        
        const decodedAccessToken = jwtDecode(data.accessToken);
        const userRole = decodedAccessToken.roles[0];
        dispatch({
          type: 'setUser',
          role: userRole,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          userInfo: data.userInfo
        });

       
        dispatch({ type: 'Voted' });

        // dispatch(loginSuccess({ user }));
        
        setRedirectPath('/dashboard');

        // if (userRole === 'admin') {
        //   setRedirectPath('/dashboard');
        // } else {
        //   setRedirectPath('/register');
        // }
      } else {
        toast.error(`Login failed. ${data.message}`);
      }
    } catch (err) {
      console.error("Error: ", err);
      toast.error("Login failed. Please try again.");
    }
  };

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <>
      <CImage
        customClassName="sidebar-brand-full"
        src={logo}
        height={100}
        className='mb-5 mt-2'
      />
      <div className="bg-body-tertiary d-flex flex-row align-items-center">
        <CContainer>
          <CRow className="justify-content-center">
            <CCol md={14}>
              <CCardGroup>
                <CCard className="text-white py-5" style={{ width: '44%', backgroundColor: 'black' }}>
                  <CCardBody className="text-start">
                    <div>
                      <h1 className='text-center'>Vision</h1> 
                      <p>
                      Our Vision is to become the leading effective business solutions provider in Africa.
                      </p>
                    </div>
                  </CCardBody>
                </CCard>
                <CCard className="p-4">
                  <CCardBody>
                    <CForm onSubmit={handleSubmit}>
                      <h1 className='text-center'>Login</h1>
                      <CInputGroup className="mb-3">
                        <CInputGroupText>
                          <CIcon icon={cilUser} />
                        </CInputGroupText>
                        <CFormInput
                          placeholder="Domain username or email"
                          name="email"
                          id="email"
                          type="text"
                          autoComplete="username"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                      </CInputGroup>

                      <CInputGroup className="mb-4">
                        <CInputGroupText>
                          <CIcon icon={cilLockLocked} />
                        </CInputGroupText>
                        <CFormInput
                          type="password"
                          name="password"
                          id="password"
                          placeholder="Password"
                          autoComplete="current-password"
                          required
                          value={formData.password}
                          onChange={handleInputChange}
                        />
                      </CInputGroup>

                      <CRow>
                        <CCol xs={6}>
                          <CButton
                            type='submit'
                            color="primary"
                            className="px-4"
                            style={{
                              backgroundImage: 'linear-gradient(to right, black 50%, red 50%)',
                              width: '218%',
                              border: 'none' 
                            }}
                          >
                            Login
                          </CButton>
                        </CCol>
                      </CRow>
                    </CForm>
                  </CCardBody>
                </CCard>
                <CCard className="text-white py-5" style={{ width: '44%', backgroundColor: 'red' }}>
                  <CCardBody className="text-center">
                    <div>
                      <h1 className='text-center'>Mission</h1> 
                      <p>
                      Our Mission is to revolutionize business operations across Africa’s commercial landscape by utilizing state-of-the-art ICT and software, supported by top-notch local expertise that aligns with international standards.
                      </p>
                    </div>
                  </CCardBody>
                </CCard>
              </CCardGroup>
            </CCol>
          </CRow>
        </CContainer>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
  );
};

export default Login;