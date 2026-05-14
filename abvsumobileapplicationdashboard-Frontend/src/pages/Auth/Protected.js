import React, { useContext, useEffect, useRef, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import ApiContext from "../../Context/ApiContext";
import LoadingBar from "react-top-loading-bar";

const Protected = () => {
  const { verifyToken, logout } = useContext(ApiContext);
  const token = localStorage.getItem("token");
  const loadingRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const simulateProgress = async () => {
      setProgress(20); // 20%
      await new Promise((res) => setTimeout(res, 200));

      setProgress(80); // 80%
      await new Promise((res) => setTimeout(res, 100));

      if (token !== null) {
        try {
          // const valid = await verifyToken();
          // if (!valid) return logout();
          setAuthorized(true);
        } catch (err) {
          console.error("Token verification failed:", err);
          logout();
        }
      }

      setProgress(100); // 100%
      await new Promise((res) => setTimeout(res, 100));

      setLoading(false);
    };

    simulateProgress();
  }, [token, logout]);

  if (loading) {
    return <LoadingBar color="orange" height={3} progress={progress} onLoaderFinished={() => setProgress(0)} />;
  }

  return (
    <>
      <LoadingBar color="orange" height={3} progress={progress} onLoaderFinished={() => setProgress(0)} />
      {authorized ? <Outlet /> : <Navigate to="/login" />}
    </>
  );
};

export default Protected;