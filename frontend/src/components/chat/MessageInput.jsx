import {
  Smile,
  Paperclip,
  Send,
  Mic,
  X,
  FileText,
  Image as ImageIcon,
  Camera,
  MapPin,
  Music,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import {
  sendMessage,
  sendGroupMessage,
  sendImage,
  sendFile,
  sendVoice,
} from "../../services/messageService";
import { useSocket } from "../../context/SocketContext";
import { useMessageMenu } from "../../context/MessageMenuContext";

const MessageInput = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { selectedUser, setMessages, selectedChat } = useChat();
  const { replyingTo, cancelReply } = useMessageMenu();

  const photosInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const emojiRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [sendingVoice, setSendingVoice] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const emojis = [
    "😀",
    "😂",
    "🤣",
    "😊",
    "😍",
    "🥰",
    "😘",
    "😎",
    "🤔",
    "😢",
    "😭",
    "😡",
    "🥳",
    "😴",
    "🤯",
    "👍",
    "👎",
    "👏",
    "🙏",
    "💪",
    "🔥",
    "❤️",
    "💯",
    "🎉",
    "✨",
    "👌",
    "🤝",
    "👀",
    "💀",
    "🙌",
  ];

  const handleEmojiSelect = (emoji) => {
    const input = inputRef.current;

    if (!input) {
      setText((prev) => prev + emoji);
      return;
    }

    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;

    const newText = text.slice(0, start) + emoji + text.slice(end);

    setText(newText);

    requestAnimationFrame(() => {
      input.focus();

      const newPosition = start + emoji.length;

      input.setSelectionRange(newPosition, newPosition);
    });
  };

  const handleTyping = (value) => {
    setText(value);

    if (!socket || !selectedUser?._id || selectedChat?.isGroup) {
      return;
    }

    if (!socket.connected) {
      return;
    }

    if (value.trim().length > 0) {
      socket.emit("typing", {
        receiverId: selectedUser._id,
        senderName: user?.username || user?.name || "Someone",
      });

      clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", selectedUser._id);
      }, 1500);
    } else {
      clearTimeout(typingTimeoutRef.current);

      socket.emit("stopTyping", selectedUser._id);
    }
  };

  const handleSend = async () => {
    if (!user?._id || !text.trim() || !selectedChat) {
      return;
    }

    try {
      let newMessage;

      if (selectedChat.isGroup) {
        newMessage = await sendGroupMessage({
          chatId: selectedChat._id,
          text: text.trim(),
          replyTo: replyingTo?._id || null,
        });
      } else {
        if (!selectedUser?._id) return;

        newMessage = await sendMessage({
          receiverId: selectedUser._id,
          text: text.trim(),
          replyTo: replyingTo?._id || null,
        });
      }

      setMessages((prev) => {
        const exists = prev.some((message) => message._id === newMessage._id);

        if (exists) return prev;

        return [...prev, newMessage];
      });

      setText("");
      setEmojiOpen(false);
      cancelReply();
    } catch (error) {
      console.error("Send message failed:", error.response?.data || error);
    }
  };

  const handleSendImage = async () => {
    if (!selectedImage || !selectedChat || uploadingImage) {
      return;
    }

    try {
      setUploadingImage(true);

      let newMessage;

      if (selectedChat.isGroup) {
        newMessage = await sendImage({
          file: selectedImage,
          chatId: selectedChat._id,
          caption: text.trim(),
          replyTo: replyingTo?._id || null,
        });
      } else {
        if (!selectedUser?._id) return;

        newMessage = await sendImage({
          file: selectedImage,
          receiverId: selectedUser._id,
          caption: text.trim(),
          replyTo: replyingTo?._id || null,
        });
      }

      setMessages((prev) => {
        const exists = prev.some((message) => message._id === newMessage._id);

        if (exists) return prev;

        return [...prev, newMessage];
      });

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setSelectedImage(null);
      setImagePreview(null);
      setText("");

      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }

      cancelReply();
    } catch (error) {
      console.error("Image send failed:", error.response?.data || error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSendFile = async () => {
    if (!selectedFile || !selectedChat) {
      return;
    }

    try {
      let newMessage;

      if (selectedChat.isGroup) {
        newMessage = await sendFile({
          file: selectedFile,
          chatId: selectedChat._id,
          replyTo: replyingTo?._id || null,
        });
      } else {
        if (!selectedUser?._id) return;

        newMessage = await sendFile({
          file: selectedFile,
          receiverId: selectedUser._id,
          replyTo: replyingTo?._id || null,
        });
      }

      setMessages((prev) => {
        const exists = prev.some((message) => message._id === newMessage._id);

        if (exists) return prev;

        return [...prev, newMessage];
      });

      setSelectedFile(null);

      if (documentInputRef.current) {
        documentInputRef.current.value = "";
      }

      if (photosInputRef.current) {
        photosInputRef.current.value = "";
      }

      if (audioInputRef.current) {
        audioInputRef.current.value = "";
      }

      cancelReply();
    } catch (error) {
      console.error("File send failed:", error.response?.data || error);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    setAttachmentOpen(false);

    if (file.type.startsWith("image/")) {
      setSelectedImage(file);
      setSelectedFile(null);

      const previewUrl = URL.createObjectURL(file);

      setImagePreview(previewUrl);

      return;
    }

    setSelectedFile(file);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handlePhotosSelect = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    handleFileSelect(file);
  };

  const handleDocumentSelect = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    handleFileSelect(file);
  };

  const handleAudioSelect = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    handleFileSelect(file);
  };

  const openCamera = async () => {
    setAttachmentOpen(false);
    setCameraError("");
    setCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
        },
        audio: false,
      });

      cameraStreamRef.current = stream;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;

        await cameraVideoRef.current.play();
      }
    } catch (error) {
      console.error("Camera access failed:", error);

      setCameraError(
        "Camera permission was denied or camera is not available.",
      );
    }
  };

  const closeCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());

      cameraStreamRef.current = null;
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setCameraError("");
  };

  const capturePhoto = () => {
    const video = cameraVideoRef.current;

    if (!video || video.readyState < 2) {
      return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const context = canvas.getContext("2d");

    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        const previewUrl = URL.createObjectURL(file);

        setSelectedImage(file);
        setSelectedFile(null);
        setImagePreview(previewUrl);

        closeCamera();
      },
      "image/jpeg",
      0.92,
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start();

      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Microphone access failed:", error);
    }
  };

  const stopRecording = (sendAfterStop = false) => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      return;
    }

    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });

      const extension = recorder.mimeType?.includes("mp4") ? "m4a" : "webm";

      const file = new File([blob], `voice-${Date.now()}.${extension}`, {
        type: recorder.mimeType || "audio/webm",
      });

      setRecordedAudio(file);

      const url = URL.createObjectURL(blob);

      setAudioPreview(url);

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

      mediaStreamRef.current = null;

      if (sendAfterStop) {
        await handleSendVoiceFile(file);
      }
    };

    recorder.stop();

    setIsRecording(false);

    clearInterval(recordingTimerRef.current);

    recordingTimerRef.current = null;
  };

  const handleSendVoiceFile = async (audioFile) => {
    if (!audioFile || !selectedChat || sendingVoice) {
      return;
    }

    try {
      setSendingVoice(true);

      let newMessage;

      if (selectedChat.isGroup) {
        newMessage = await sendVoice({
          file: audioFile,
          chatId: selectedChat._id,
          replyTo: replyingTo?._id || null,
        });
      } else {
        if (!selectedUser?._id) return;

        newMessage = await sendVoice({
          file: audioFile,
          receiverId: selectedUser._id,
          replyTo: replyingTo?._id || null,
        });
      }

      setMessages((prev) => {
        const exists = prev.some((message) => message._id === newMessage._id);

        if (exists) return prev;

        return [...prev, newMessage];
      });

      if (audioPreview) {
        URL.revokeObjectURL(audioPreview);
      }

      setRecordedAudio(null);
      setAudioPreview(null);
      setRecordingTime(0);

      cancelReply();
    } catch (error) {
      console.error("Voice send failed:", error.response?.data || error);
    } finally {
      setSendingVoice(false);
    }
  };

  const cancelRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

    mediaStreamRef.current = null;

    clearInterval(recordingTimerRef.current);

    recordingTimerRef.current = null;

    if (audioPreview) {
      URL.revokeObjectURL(audioPreview);
    }

    setIsRecording(false);
    setRecordingTime(0);
    setRecordedAudio(null);
    setAudioPreview(null);
  };

  const handleMainSend = async () => {
    if (isRecording) {
      stopRecording(true);
      return;
    }

    if (recordedAudio) {
      await handleSendVoiceFile(recordedAudio);
      return;
    }

    if (selectedImage) {
      await handleSendImage();
      return;
    }

    if (selectedFile) {
      await handleSendFile();
      return;
    }

    if (text.trim()) {
      await handleSend();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setEmojiOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      clearInterval(recordingTimerRef.current);
    };
  }, []);

  const canSend =
    text.trim().length > 0 ||
    selectedImage !== null ||
    selectedFile !== null ||
    recordedAudio !== null ||
    isRecording;

  return (
    <>
      {cameraOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-700 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
              <h2 className="text-white font-semibold">Camera</h2>

              <button
                type="button"
                onClick={closeCamera}
                className="h-9 w-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative bg-black aspect-video flex items-center justify-center">
              {cameraError ? (
                <div className="px-6 text-center">
                  <Camera size={48} className="mx-auto mb-4 text-zinc-500" />

                  <p className="text-red-400 text-sm">{cameraError}</p>

                  <p className="text-zinc-500 text-xs mt-2">
                    Please allow camera access in Chrome.
                  </p>
                </div>
              ) : (
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="flex items-center justify-center gap-4 px-5 py-5">
              <button
                type="button"
                onClick={closeCamera}
                className="px-5 py-3 rounded-full bg-zinc-800 text-white hover:bg-zinc-700"
              >
                Cancel
              </button>

              {!cameraError && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="h-14 w-14 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition"
                  title="Take photo"
                >
                  <Camera size={24} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-[var(--header-bg)] border-t border-[var(--border-color)] transition-colors duration-200">
        {replyingTo && (
          <div className="px-4 pt-3">
            <div className="flex rounded-xl overflow-hidden bg-[var(--surface-bg)]">
              <div className="w-1 bg-indigo-500 shrink-0" />

              <div className="flex-1 min-w-0 px-3 py-2.5">
                <p className="text-xs font-semibold text-indigo-400">
                  Replying to message
                </p>

                <p className="mt-0.5 text-sm text-[var(--text-secondary)] truncate">
                  {replyingTo.isDeleted
                    ? "This message was deleted"
                    : replyingTo.text ||
                      (replyingTo.image
                        ? "📷 Photo"
                        : replyingTo.audio
                          ? "🎤 Voice message"
                          : "Message")}
                </p>
              </div>

              <button
                type="button"
                onClick={cancelReply}
                className="flex items-center justify-center px-4 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {imagePreview && (
          <div className="px-4 pt-3">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-52 max-w-64 rounded-xl object-cover border border-zinc-700"
              />

              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(imagePreview);

                  setSelectedImage(null);
                  setImagePreview(null);

                  if (imageInputRef.current) {
                    imageInputRef.current.value = "";
                  }
                }}
                className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-zinc-950 text-white flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {selectedFile && (
          <div className="px-4 pt-3">
            <div className="inline-flex items-center gap-3 rounded-xl bg-zinc-800 px-4 py-3">
              <FileText size={22} className="text-indigo-400" />

              <div className="max-w-64">
                <p className="text-sm text-white truncate">
                  {selectedFile.name}
                </p>

                <p className="text-xs text-zinc-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-zinc-400 hover:text-red-400"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        <div className="h-20 px-5 flex items-center gap-4">
          <div ref={emojiRef} className="relative">
            <button
              type="button"
              onClick={() => setEmojiOpen((prev) => !prev)}
              className="h-10 w-10 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              <Smile size={22} />
            </button>

            {emojiOpen && (
              <div className="absolute bottom-12 left-0 z-[100] w-72 rounded-2xl border border-zinc-700 bg-zinc-900 p-3 shadow-2xl">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-white">Emojis</p>

                  <p className="text-xs text-zinc-500">Pick an emoji</p>
                </div>

                <div className="grid grid-cols-6 gap-1">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-zinc-800 active:scale-90"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <input
            ref={photosInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handlePhotosSelect}
            className="hidden"
          />

          <input
            ref={documentInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.zip"
            onChange={handleDocumentSelect}
            className="hidden"
          />

          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioSelect}
            className="hidden"
          />

          <div className="relative">
            <button
              type="button"
              onClick={() => setAttachmentOpen((prev) => !prev)}
              className={`h-10 w-10 rounded-full flex items-center justify-center transition ${
                attachmentOpen
                  ? "bg-[var(--surface-hover)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              }`}
              title="Attachments"
            >
              <Paperclip size={22} />
            </button>

            {attachmentOpen && (
              <div className="absolute bottom-14 left-0 z-[200] w-72 rounded-2xl border border-zinc-700 bg-zinc-900 p-2 shadow-2xl">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-white">Attach</p>

                  <p className="text-xs text-zinc-500">
                    Choose what you want to send
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAttachmentOpen(false);

                    documentInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-800 text-left"
                >
                  <span className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <FileText size={21} />
                  </span>

                  <span>
                    <span className="block text-sm text-white">Document</span>

                    <span className="block text-xs text-zinc-500">
                      PDF, DOC, ZIP and more
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachmentOpen(false);

                    photosInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-800 text-left"
                >
                  <span className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <ImageIcon size={21} />
                  </span>

                  <span>
                    <span className="block text-sm text-white">
                      Photos & Videos
                    </span>

                    <span className="block text-xs text-zinc-500">
                      Choose from your computer
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openCamera}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-800 text-left"
                >
                  <span className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
                    <Camera size={21} />
                  </span>

                  <span>
                    <span className="block text-sm text-white">Camera</span>

                    <span className="block text-xs text-zinc-500">
                      Take a photo now
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachmentOpen(false);

                    if (!navigator.geolocation) {
                      alert("Location is not supported by this browser.");
                      return;
                    }

                    navigator.geolocation.getCurrentPosition(
                      async (position) => {
                        const { latitude, longitude } = position.coords;

                        const locationMessage = `📍 My Location\nhttps://www.google.com/maps?q=${latitude},${longitude}`;

                        try {
                          let newMessage;

                          if (selectedChat?.isGroup) {
                            newMessage = await sendGroupMessage({
                              chatId: selectedChat._id,
                              text: locationMessage,
                              replyTo: replyingTo?._id || null,
                            });
                          } else {
                            if (!selectedUser?._id) return;

                            newMessage = await sendMessage({
                              receiverId: selectedUser._id,
                              text: locationMessage,
                              replyTo: replyingTo?._id || null,
                            });
                          }

                          setMessages((prev) => {
                            const exists = prev.some(
                              (message) => message._id === newMessage._id,
                            );

                            if (exists) return prev;

                            return [...prev, newMessage];
                          });

                          cancelReply();
                        } catch (error) {
                          console.error(
                            "Location send failed:",
                            error.response?.data || error,
                          );

                          alert("Failed to send location.");
                        }
                      },
                      (error) => {
                        console.error("Location access failed:", error);

                        alert(
                          "Location permission was denied. Please allow location access in Chrome.",
                        );
                      },
                      {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0,
                      },
                    );
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-800 text-left"
                >
                  <span className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                    <MapPin size={21} />
                  </span>

                  <span>
                    <span className="block text-sm text-white">Location</span>

                    <span className="block text-xs text-zinc-500">
                      Share your location
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachmentOpen(false);

                    audioInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-800 text-left"
                >
                  <span className="h-10 w-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400">
                    <Music size={21} />
                  </span>

                  <span>
                    <span className="block text-sm text-white">Audio</span>

                    <span className="block text-xs text-zinc-500">
                      Send an audio file
                    </span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {isRecording ? (
            <div className="flex-1 min-w-0 bg-zinc-800 rounded-full px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />

                <span className="text-red-400 text-sm font-medium">
                  Recording
                </span>

                <span className="text-zinc-300 text-sm font-mono">
                  {Math.floor(recordingTime / 60)}:
                  {String(recordingTime % 60).padStart(2, "0")}
                </span>
              </div>

              <button
                type="button"
                onClick={cancelRecording}
                className="text-zinc-400 hover:text-red-400"
              >
                Cancel
              </button>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              placeholder={
                selectedImage
                  ? "Add a caption..."
                  : replyingTo
                    ? "Type your reply..."
                    : "Type your message..."
              }
              className="flex-1 min-w-0 bg-[var(--input-bg)] border border-transparent rounded-full px-5 py-3 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-20"
              value={text}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();

                  if (!canSend || uploadingImage) {
                    return;
                  }

                  handleMainSend();
                }
              }}
            />
          )}

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`h-10 w-10 rounded-full flex items-center justify-center ${
              isRecording
                ? "bg-red-500/10 text-red-500 animate-pulse"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Mic size={22} />
          </button>

          <button
            type="button"
            onClick={handleMainSend}
            disabled={!canSend || uploadingImage}
            className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition ${
              canSend && !uploadingImage
                ? "bg-[var(--accent)] text-white hover:scale-105 active:scale-95"
                : "bg-[var(--surface-bg)] text-[var(--text-secondary)] cursor-default"
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </>
  );
};

export default MessageInput;
