import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";

const CallContext = createContext(null);

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [callStatus, setCallStatus] = useState("idle");

  const [callType, setCallType] = useState(null);

  const [caller, setCaller] = useState(null);

  const [remoteUserId, setRemoteUserId] = useState(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const pendingCandidatesRef = useRef([]);

  const currentUserId = user?._id?.toString() || user?.id?.toString() || null;

  const rtcConfig = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: "stun:stun1.l.google.com:19302",
      },
    ],
  };

  const cleanupCall = useCallback(() => {
    console.log("🧹 Cleaning up call");

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;

      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      localStreamRef.current = null;
    }

    remoteStreamRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);

    setCallStatus("idle");
    setCallType(null);
    setCaller(null);
    setRemoteUserId(null);

    setIsMuted(false);
    setIsCameraOff(false);

    pendingCandidatesRef.current = [];
  }, []);

  const createPeerConnection = useCallback(
    (receiverId) => {
      const peerConnection = new RTCPeerConnection(rtcConfig);

      peerConnectionRef.current = peerConnection;

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        socket?.emit("iceCandidate", {
          receiverId,
          candidate: event.candidate,
        });
      };

      peerConnection.ontrack = (event) => {
        console.log("🎥 Remote track received");

        const stream = event.streams?.[0];

        if (stream) {
          remoteStreamRef.current = stream;
          setRemoteStream(stream);
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log("📡 WebRTC state:", peerConnection.connectionState);

        if (peerConnection.connectionState === "connected") {
          setCallStatus("connected");
        }

        if (
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "disconnected" ||
          peerConnection.connectionState === "closed"
        ) {
          cleanupCall();
        }
      };

      return peerConnection;
    },
    [socket, cleanupCall],
  );

  const getLocalMedia = useCallback(async (type) => {
    const constraints =
      type === "video"
        ? {
            audio: true,
            video: true,
          }
        : {
            audio: true,
            video: false,
          };

    console.log("🎤 Requesting media:", constraints);

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    localStreamRef.current = stream;

    setLocalStream(stream);

    return stream;
  }, []);

  const startCall = useCallback(
    async (receiver, type = "voice") => {
      if (!socket || !user || !receiver?._id) {
        console.error("Cannot start call: missing socket/user/receiver");

        return;
      }

      try {
        console.log("📞 Starting", type, "call with", receiver.username);

        setCallType(type);
        setCallStatus("calling");

        setCaller(null);

        setRemoteUserId(receiver._id.toString());

        const stream = await getLocalMedia(type);

        const peerConnection = createPeerConnection(receiver._id.toString());

        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        const offer = await peerConnection.createOffer();

        await peerConnection.setLocalDescription(offer);

        socket.emit("callUser", {
          receiverId: receiver._id.toString(),

          callerId: currentUserId,

          callerName: user.username || user.name || "Unknown user",

          callerAvatar: user.avatar || "",

          callType: type,

          offer,
        });

        console.log("📞 Call request sent");
      } catch (error) {
        console.error("❌ Failed to start call:", error);

        cleanupCall();
      }
    },
    [
      socket,
      user,
      currentUserId,
      getLocalMedia,
      createPeerConnection,
      cleanupCall,
    ],
  );

  const acceptCall = useCallback(async () => {
    if (!socket || !caller || !caller.offer || !currentUserId) {
      return;
    }

    try {
      console.log("✅ Accepting call from:", caller.callerName);

      const type = caller.callType;

      setCallStatus("connected");

      setCallType(type);

      setRemoteUserId(caller.callerId.toString());

      const stream = await getLocalMedia(type);

      const peerConnection = createPeerConnection(caller.callerId.toString());

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(caller.offer),
      );

      for (const candidate of pendingCandidatesRef.current) {
        try {
          await peerConnection.addIceCandidate(candidate);
        } catch (error) {
          console.error("Failed to add ICE candidate:", error);
        }
      }

      pendingCandidatesRef.current = [];

      const answer = await peerConnection.createAnswer();

      await peerConnection.setLocalDescription(answer);

      socket.emit("acceptCall", {
        callerId: caller.callerId.toString(),

        receiverId: currentUserId,

        answer,
      });

      setCaller(null);

      console.log("✅ Call accepted and answer sent");
    } catch (error) {
      console.error("❌ Failed to accept call:", error);

      cleanupCall();
    }
  }, [
    socket,
    caller,
    currentUserId,
    getLocalMedia,
    createPeerConnection,
    cleanupCall,
  ]);

  const rejectCall = useCallback(() => {
    if (!socket || !caller) {
      return;
    }

    console.log("❌ Rejecting call");

    socket.emit("rejectCall", {
      callerId: caller.callerId.toString(),

      receiverId: currentUserId,
    });

    cleanupCall();
  }, [socket, caller, currentUserId, cleanupCall]);

  const endCall = useCallback(() => {
    if (socket && remoteUserId) {
      socket.emit("endCall", {
        receiverId: remoteUserId.toString(),
      });
    }

    cleanupCall();
  }, [socket, remoteUserId, cleanupCall]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    const audioTracks = stream.getAudioTracks();

    audioTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    setIsMuted(!audioTracks.some((track) => track.enabled));
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    const videoTracks = stream.getVideoTracks();

    if (!videoTracks.length) {
      return;
    }

    videoTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    setIsCameraOff(!videoTracks.some((track) => track.enabled));
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleIncomingCall = (data) => {
      console.log("📲 Incoming call:", data);

      setCaller(data);

      setCallType(data.callType);

      setCallStatus("incoming");

      setRemoteUserId(data.callerId?.toString());
    };

    const handleCallAccepted = async ({ receiverId, answer }) => {
      console.log("✅ Call accepted");

      try {
        const peerConnection = peerConnectionRef.current;

        if (!peerConnection) {
          return;
        }

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer),
        );

        setCallStatus("connected");

        setRemoteUserId(receiverId?.toString());
      } catch (error) {
        console.error("Failed to set answer:", error);
      }
    };

    const handleCallRejected = () => {
      console.log("❌ Call rejected");

      alert("Call rejected");

      cleanupCall();
    };

    const handleUserOffline = () => {
      console.log("📴 User is offline");

      alert("This user is offline");

      cleanupCall();
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (!candidate) {
        return;
      }

      const rtcCandidate = new RTCIceCandidate(candidate);

      const peerConnection = peerConnectionRef.current;

      if (peerConnection && peerConnection.remoteDescription) {
        try {
          await peerConnection.addIceCandidate(rtcCandidate);
        } catch (error) {
          console.error("Failed to add ICE candidate:", error);
        }
      } else {
        pendingCandidatesRef.current.push(rtcCandidate);
      }
    };

    const handleCallEnded = () => {
      console.log("🔴 Remote user ended call");

      cleanupCall();
    };

    const handleCallBusy = () => {
      console.log("📵 User is busy");

      alert("User is busy");

      cleanupCall();
    };

    socket.on("incomingCall", handleIncomingCall);

    socket.on("callAccepted", handleCallAccepted);

    socket.on("callRejected", handleCallRejected);

    socket.on("callUserOffline", handleUserOffline);

    socket.on("iceCandidate", handleIceCandidate);

    socket.on("callEnded", handleCallEnded);

    socket.on("callBusy", handleCallBusy);

    return () => {
      socket.off("incomingCall", handleIncomingCall);

      socket.off("callAccepted", handleCallAccepted);

      socket.off("callRejected", handleCallRejected);

      socket.off("callUserOffline", handleUserOffline);

      socket.off("iceCandidate", handleIceCandidate);

      socket.off("callEnded", handleCallEnded);

      socket.off("callBusy", handleCallBusy);
    };
  }, [socket, cleanupCall]);

  return (
    <CallContext.Provider
      value={{
        callStatus,
        callType,
        caller,
        remoteUserId,

        localStream,
        remoteStream,

        isMuted,
        isCameraOff,

        startCall,
        acceptCall,
        rejectCall,
        endCall,

        toggleMute,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);

  if (!context) {
    throw new Error("useCall must be used inside CallProvider");
  }

  return context;
};
