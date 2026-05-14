import React, { useContext } from 'react';
import { CircularProgress } from '@mui/material';
import ApiContext from '../../Context/ApiContext';

const GlobalLoader = () => {
  const { isLoading } = useContext(ApiContext)

  if (!isLoading) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <CircularProgress color="primary" />
    </div>
  );
};

export default GlobalLoader;
