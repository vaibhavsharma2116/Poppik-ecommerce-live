import { useState, useEffect } from "react";
// If you have user context, import it here
// import { useUser } from "@/hooks/useUser";
import { X } from "lucide-react";
import { initializePushNotifications } from "@/lib/pushNotificationService";
import logo from "@/assets/logo.png";
import { Mail } from "lucide-react";

interface NotificationPopupProps {
  onClose: () => void;
}

export function NotificationPopup({ onClose }: NotificationPopupProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [emailInput, setEmailInput] = useState<string>("");

  // Get email from localStorage safely on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Try to get email from localStorage
        const storedEmail = localStorage.getItem('userEmail');
        if (storedEmail) {
          setUserEmail(storedEmail);
          setEmailInput(storedEmail);
        } else {
          // Try to get from sessionStorage or other sources
          const sessionEmail = sessionStorage.getItem('userEmail');
          if (sessionEmail) {
            setUserEmail(sessionEmail);
            setEmailInput(sessionEmail);
          }
        }
      } catch (e) {
        console.warn('Could not access storage:', e);
      }
    }
  }, []);

  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        return;
      }
    }
  }, []);

  const handleAllow = async () => {
    try {
      // Only run on client side
      if (typeof window === 'undefined') {
        onClose();
        return;
      }
      
      setIsClosing(true);
      
      // Determine the final email to use
      let finalEmail = emailInput.trim() || userEmail;
      
      // Try to get from localStorage as fallback
      if (!finalEmail && typeof window !== 'undefined') {
        try {
          finalEmail = localStorage.getItem('userEmail') || undefined;
        } catch (e) {
          console.warn('Could not access localStorage:', e);
        }
      }
      
      // Store email in localStorage for use in notification service
      if (finalEmail && typeof window !== 'undefined') {
        try {
          localStorage.setItem('notificationEmail', finalEmail);
        } catch (e) {
          console.warn('Could not set localStorage:', e);
        }
      }
      
      const success = await initializePushNotifications(finalEmail);
      if (success) {
        console.log("✅ Push notifications enabled successfully!");
        
        // Send offer notification to the user
        try {
          const offerResponse = await fetch("/api/notifications/send-offer", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: finalEmail,
              timestamp: new Date().toISOString(),
            }),
          });
          
          if (offerResponse.ok) {
            const offerData = await offerResponse.json();
            console.log("✅ Offer notification sent:", offerData);
          } else {
            console.warn("⚠️ Failed to send offer notification:", offerResponse.statusText);
          }
        } catch (offerError) {
          console.warn("⚠️ Error sending offer notification:", offerError);
          // Don't block the notification popup close on error
        }
      } else {
        console.error("❌ Failed to enable push notifications");
      }
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("Error enabling notifications:", error);
      onClose();
    }
  };

  const handleDontAllow = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!("Notification" in window) || Notification.permission === "granted") {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-start justify-start z-[999] transition-opacity duration-300 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      onClick={handleDontAllow}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 mt-0 ml-4 overflow-hidden transition-all duration-300 transform ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="relative bg-white p-4 sm:p-6 pb-2 sm:pb-4">
          {/* Close Button */}
          <button
            onClick={handleDontAllow}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-600 hover:text-gray-800 p-1 transition-all flex-shrink-0"
            aria-label="Close"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>

          {/* Logo and Text Container */}
          <div className="flex items-start gap-2 sm:gap-4">
            {/* Logo */}
            <div className="flex-shrink-0 mt-1">
              <img 
                src={logo} 
                alt="Poppik" 
                className="h-12 sm:h-16 w-auto object-contain"
              />
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0 pr-10">
                <h4 className="font-bold text-sm sm:text-base md:text-lg leading-snug mb-2 break-words">
                  THE WEBSITE WANTS TO SEND YOU AWESOME OFFERS!
                </h4>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-700 text-xs sm:text-sm mt-3 sm:mt-4 leading-relaxed">
            Notifications can be turned off anytime from browser settings.
          </p>

          {/* Email Input Section */}
          <div className="mt-3 sm:mt-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Email Address (Optional)
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Help us send you personalized offers
            </p>
          </div>
        </div>

        {/* Button Section */}
        <div className="px-2 sm:px-4 py-2 flex gap-2 sm:gap-3 bg-white border-t border-gray-200">
            <button
              className="flex-1 px-3 sm:px-6 py-2 text-xs sm:text-sm text-gray-700 font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-150"
              style={{minHeight: '40px'}}
              onClick={handleDontAllow}
            >
              Don't Allow
            </button>
            <button
              className="flex-1 px-3 sm:px-6 py-2 text-xs sm:text-sm text-white font-medium bg-pink-500 hover:bg-pink-600 rounded-lg transition-all duration-150"
              style={{minHeight: '40px'}}
              onClick={handleAllow}
            >
              Allow
            </button>
        </div>
      </div>
    </div>
  );
}
