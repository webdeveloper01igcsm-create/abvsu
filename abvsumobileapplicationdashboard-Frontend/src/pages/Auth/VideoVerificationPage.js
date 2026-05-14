import React, { useRef, useState, useEffect, useContext } from "react";
import * as faceDetection from "@tensorflow-models/face-detection";
import "@tensorflow/tfjs";
import Swal from "sweetalert2";
import axios from "axios";
import startaudio from "../../lib/audio/starting audio for face id.mp3";
import introaudio from "../../lib/audio/introaudio.mp3";
import ApiContext from "../../Context/ApiContext";
import { useNavigate } from "react-router-dom";

const VideoVerificationPage = () => {
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingPromiseRef = useRef(null);
  const { apiBaseUrl } = useContext(ApiContext);
  const navigate = useNavigate();

  // State variables
  const [faceDetected, setFaceDetected] = useState(false);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [ismultiface, setIsmultiface] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enablesubmit, setEnablesubmit] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [loading, setLoading] = useState(false);

  const verifyToken = async () => {
    setIsVerifying(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No verification token found in URL");

      const response = await axios.get(`${apiBaseUrl}verification/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.verified) {
        setIsVerified(true);
      } else {
        setVerificationError("Token verification failed");
      }
    } catch (error) {
      setVerificationError(
        error.response?.data?.message || error.message || "Verification failed"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const LoadingSpinner = () => (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-2xl font-bold text-blue-600 mb-4">Submitting...</div>
      {/* <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-4 border-blue-600 border-solid"></div> */}
    </div>
  );

  const startVideoStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current.play();
      }
      monitorAudioNoise(stream);
    } catch (err) {
      console.error("Error accessing media devices:", err);
    }
  };

  const monitorAudioNoise = (stream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const calculateNoiseLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      setNoiseLevel(dataArray.reduce((a, b) => a + b, 0) / dataArray.length);
      requestAnimationFrame(calculateNoiseLevel);
    };
    calculateNoiseLevel();
  };

  let model = null;
  const detectFacefunc = async () => {
    try {
      if (!model) {
        model = await faceDetection.createDetector(
          faceDetection.SupportedModels.MediaPipeFaceDetector,
          { runtime: "tfjs", maxFaces: 3 }
        );
      }
      const faces = await model.estimateFaces(videoRef.current);
      setFaceDetected(faces.length > 0);
      setIsmultiface(faces.length);
    } catch (err) {
      console.error("Error detecting face:", err);
    } finally {
      setTimeout(detectFacefunc, 1000);
    }
  };

  const startRecording = () => {
    const instructionDiv = document.getElementById("instructions");
    let countdown = 3;

    const countdownInterval = setInterval(() => {
      instructionDiv.textContent = `Recording will start in: ${countdown}`;
      if (countdown === 0) {
        clearInterval(countdownInterval);
        instructionDiv.innerHTML =
          `<div class="bg-gray-100 p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
            <h3 class="text-center text-xl font-bold text-gray-800 mb-4">
              Please say the following script:
            </h3>
            <p class="text-gray-700 leading-relaxed">
              मेरा नाम <span class="font-semibold text-blue-600">[आपका नाम]</span> है, 
              मेरे पिता का नाम <span class="font-semibold text-blue-600">[आपके पिता का नाम]</span> है। 
              मैं <span class="font-semibold text-blue-600">[आपका शहर]</span> में रहता हूँ। 
              मेरी जन्म तिथि <span class="font-semibold text-blue-600">[आपकी जन्म तिथि]</span> है।
            </p>
            <p class="text-gray-700 leading-relaxed mt-4">
              मैंने सिक्किम ग्लोबल टेक्निकल यूनिवर्सिटी में 
              <span class="font-semibold text-blue-600">[आपका कोर्स]</span> में नियमित छात्र के रूप में प्रवेश लिया है। 
              मेरा आधार नंबर <span class="font-semibold text-blue-600">[आपका आधार नंबर]</span> है।
            </p>
            <p class="text-gray-700 leading-relaxed mt-4">
              मेरा पैन कार्ड नंबर <span class="font-semibold text-blue-600">[आपका पैन कार्ड नंबर]</span> है। 
              मेरा मोबाइल नंबर <span class="font-semibold text-blue-600">[आपका मोबाइल नंबर]</span> है। 
              और मेरी ईमेल आईडी <span class="font-semibold text-blue-600">[आपकी ईमेल आईडी]</span> है।
            </p>
            <p class="text-blue-600 leading-relaxed mt-4">
              कृपया अपना आधार कार्ड कैमरे में दिखाएं
            </p>
            <p class="text-center text-sm text-gray-600 mt-2">
              कृपया स्क्रिप्ट पूरा करने के बाद सबमिट बटन दबाएँ।
            </p>
          </div>`;

        const recorder = new MediaRecorder(videoRef.current.srcObject);
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recordingPromiseRef.current = new Promise((resolve) => {
          recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: "video/webm" });
            setVideoBlob(blob);
            resolve(blob);
            chunksRef.current = [];
          };
        });

        recorder.start();
        setMediaRecorder(recorder);
        setRecording(true);
      }
      countdown -= 1;
    }, 1000);
  };

  const playAudio = (mp3) =>
    new Promise((resolve, reject) => {
      const audio = new Audio(mp3);
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play();
    });

  const startVerification = async () => {
    Swal.fire({
      title: 'Loading...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    setEnablesubmit(true);
    detectFacefunc();
    await playAudio(startaudio);
    await playAudio(introaudio);
    startRecording();
    setIsSubmitting(true);
    setTimeout(() => setEnablesubmit(false), 10000);
    Swal.close();

  };

  const submitVerification = async () => {
    try {
      setLoading(true);
      if (!mediaRecorder || mediaRecorder.state !== "recording") {
        alert("No active recording to submit.");
        return;
      }

      mediaRecorder.stop();
      const blob = await recordingPromiseRef.current;

      if (!blob) {
        alert("No recording available to submit.");
        return;
      }
      const token = localStorage.getItem("token");
      const myHeaders = new Headers();
      myHeaders.append("Authorization", `Bearer ${token}`);

      const formData = new FormData();
      formData.append("file", blob, "verification_video.webm");

      const response = await fetch(`${apiBaseUrl}verification/upload`, {
        method: "POST",
        body: formData,
        headers: myHeaders,
      });

      if (!response.ok) throw new Error("Submission failed");
      Swal.fire({
        icon: "success",
        title: "Status",
        text: "Video Submitted Sucessfully",
      });
      localStorage.removeItem("token");
      navigate("/verficationlogin");
      // alert("Video submitted successfully!");
    } catch (err) {
      console.error("Submission error:", err);
      alert(err.message || "An error occurred during submission.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyToken();
    startVideoStream();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto flex flex-col my-auto mt-4">
      {isVerifying ? (
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-blue-600 mb-4">
            Verifying Access Token...
          </div>
          <div className="animate-spin rounded-full h-12 w-12"></div>
        </div>
      ) : verificationError ? (
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-red-600 mb-4">
            Verification Error
          </div>
          <p className="text-gray-700">{verificationError}</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => navigate("/verficationlogin")}
          >
            Try Again
          </button>
        </div>
      ) : isVerified ? (
        <div className="flex flex-col lg:flex-row min-w-full overflow-hidden">
          <div className="flex flex-col items-center space-y-4 w-screen lg:w-3/5">
            <video
              ref={videoRef}
              className="w-full rounded-lg border shadow-lg"
              autoPlay
              muted
            />
            <canvas
              ref={canvasRef}
              width="640"
              height="480"
              className="hidden"
            />
          </div>
          <div className="flex flex-col mx-auto space-y-4 w-screen lg:w-2/5 p-4 border rounded">
            <div className="flex-grow text-left" id="instructions">
              <h2 className="text-3xl font-bold mb-4 text-center my-2">
                Important Instructions !!
              </h2>
              <ul className="list-disc list-inside text-gray-700 ml-4">
                <li>Please avoid any noise in the background</li>
                <li>Ensure no one else is visible in the camera</li>
                <li>Look directly into the camera</li>
                <li>Have all required documents ready</li>
              </ul>
            </div>
            
            <div className="mt-auto space-y-4">
            {faceDetected && isSubmitting ? (
                <p className="text-green-500">✅ Face Detected</p>
              ) : ( isSubmitting &&
                <p className="text-red-500">❌ No Face Detected</p>
              )}
              {ismultiface > 1 && isSubmitting (
                <p className="text-red-500">❌ Multiple persons detected</p>
              )}
              {isSubmitting ? (
                <button
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  onClick={submitVerification}
                  disabled={enablesubmit}
                >
                  Submit
                </button>
              ) : (
                <button
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  onClick={startVerification}
                  disabled={enablesubmit || !isVerified}
                >
                  Start Verification
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-red-600">Access Denied</div>
          <p className="text-gray-700">Invalid or expired verification token</p>
        </div>
      )}
    </div>
  );
};

export default VideoVerificationPage;