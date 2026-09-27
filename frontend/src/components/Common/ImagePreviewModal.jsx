import { useEffect } from "react";
import { X, ZoomIn } from "lucide-react";

const ImagePreviewModal = ({
  isOpen,
  onClose,
  src,
  alt = "Profile picture",
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !src) return null;
  return (
    <div
      onClick={onClose}
      className=" fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-5"
    >
      <button
        type="button"
        onClick={onClose}
        className=" absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 cursor-pointer"
      >
        <X size={24} />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] max-w-[90vw] items-center justify-center"
      >
        <img
          src={src}
          alt={alt}
          className="max-h-[80vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl select-none"
          draggable="false"
        />

        <div className=" absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
          <ZoomIn size={14} />
          Profile picture
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
