import React, { useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useCall } from "../../context/CallContext";

const CallScreen = () => {
  const {
    callStatus,
    callType,
    caller,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  if (callStatus === "idle") {
    return null;
  }

  if (callStatus === "incoming") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="w-[90%] max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-gray-900">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            {caller?.avatar ? (
              <img
                src={caller.avatar}
                alt={caller.name || "Caller"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-gray-500">
                {(caller?.name || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {caller?.name || "Someone"}
          </h2>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Incoming {callType === "video" ? "video" : "voice"} call...
          </p>

          <div className="mt-8 flex justify-center gap-8">
            <button
              onClick={rejectCall}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600"
              title="Reject"
            >
              <PhoneOff size={26} />
            </button>

            <button
              onClick={acceptCall}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:bg-green-600"
              title="Accept"
            >
              <Phone size={26} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (callStatus === "calling") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950">
        <div className="text-center text-white">
          <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gray-800">
            {caller?.avatar ? (
              <img
                src={caller.avatar}
                alt={caller.name || "User"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-gray-400">
                {(caller?.name || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <h2 className="text-2xl font-semibold">Calling...</h2>

          <p className="mt-2 text-gray-400">{caller?.name || "User"}</p>

          <button
            onClick={endCall}
            className="mx-auto mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
            title="End call"
          >
            <PhoneOff size={26} />
          </button>
        </div>
      </div>
    );
  }

  if (callStatus === "connected" && callType === "voice") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950">
        <audio ref={remoteAudioRef} autoPlay playsInline />

        <div className="text-center text-white">
          <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gray-800">
            {caller?.avatar ? (
              <img
                src={caller.avatar}
                alt={caller.name || "User"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-gray-400">
                {(caller?.name || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <h2 className="text-2xl font-semibold">
            {caller?.name || "Voice Call"}
          </h2>

          <p className="mt-2 text-green-400">Connected</p>

          <div className="mt-10 flex justify-center gap-5">
            <button
              onClick={toggleMute}
              className={`flex h-14 w-14 items-center justify-center rounded-full ${
                isMuted ? "bg-white text-black" : "bg-gray-700 text-white"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            <button
              onClick={endCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
              title="End call"
            >
              <PhoneOff size={22} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (callStatus === "connected" && callType === "video") {
    return (
      <div className="fixed inset-0 z-[9999] bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />

        <div className="absolute right-4 top-4 h-36 w-28 overflow-hidden rounded-xl border-2 border-white/50 bg-gray-900 shadow-lg sm:h-44 sm:w-32">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />

          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <VideoOff className="text-white" size={28} />
            </div>
          )}
        </div>

        <div className="absolute left-4 top-4 rounded-lg bg-black/40 px-4 py-2 text-white backdrop-blur-sm">
          <p className="font-semibold">{caller?.name || "Video Call"}</p>
        </div>

        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-4">
          <button
            onClick={toggleMute}
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              isMuted ? "bg-white text-black" : "bg-gray-700 text-white"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <button
            onClick={toggleCamera}
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              isCameraOff ? "bg-white text-black" : "bg-gray-700 text-white"
            }`}
            title={isCameraOff ? "Turn camera on" : "Turn camera off"}
          >
            {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>

          <button
            onClick={endCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
            title="End call"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default CallScreen;
