import { useState, useEffect } from "react";
// If you have user context, import it here
// import { useUser } from "@/hooks/useUser";
import { X } from "lucide-react";
import { initializePushNotifications } from "@/lib/pushNotificationService";
import poppikLogo from "@/assets/POPPIK LOGO.jpg";

interface NotificationPopupProps {
  onClose: () => void;
}

export function NotificationPopup({ onClose }: NotificationPopupProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  // Get email from localStorage safely on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserEmail('vaibhavsharma2116@gmail.com'); // Replace with actual email if available
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
      
      // Get user email from input if available
      const emailInput = (document.querySelector('[data-email-input]') as HTMLInputElement)?.value;
      let finalEmail = emailInput || userEmail;
      
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
      
      const success = await initializePushNotifications();
      if (success) {
        console.log("✅ Push notifications enabled successfully!");
        
        // Call API to save email to database
        if (finalEmail) {
          try {
            const response = await fetch("/api/notifications/subscribe", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: finalEmail,
                timestamp: new Date().toISOString(),
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log("✅ Email saved to database:", data);
            } else {
              console.error("❌ Failed to save email to database:", response.statusText);
            }
          } catch (apiError) {
            console.error("❌ Error calling subscribe API:", apiError);
          }
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
        <div className="relative bg-white p-6 pb-4">
          {/* Close Button */}
          <button
            onClick={handleDontAllow}
            className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 p-1 transition-all"
            aria-label="Close"
          >
            <X size={24} />
          </button>

          {/* Logo and Text Container */}
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="flex-shrink-0 bg-black rounded p-2">
              <img 
                src={poppikLogo} 
                alt="Poppik" 
                className="h-10 w-10 object-contain"
              />
            </div>

            {/* Text Content */}
            <div className="flex-1">
                <h4 className="font-bold text-lg leading-snug mb-2" style={{maxHeight: '2.5em', overflow: 'hidden'}}>
                  THE WEBSITE WANTS TO SEND YOU AWESOME OFFERS!
                </h4>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-700 text-sm mt-4 leading-relaxed">
            Notifications can be turned off anytime from browser settings.
          </p>
        </div>

        {/* Button Section */}
        <div className="px-2 py-2 flex gap-3 bg-white border-t border-gray-200">
            <button
              className="flex-1 px-6 py-2 text-gray-700 font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-150"
              style={{minWidth: '120px', height: '40px'}}
              onClick={handleDontAllow}
            >
              Don't Allow
            </button>
            <button
              className="flex-1 px-6 py-2 text-white font-medium bg-pink-500 hover:bg-pink-600 rounded-lg transition-all duration-150"
              style={{minWidth: '120px', height: '40px'}}
              onClick={handleAllow}
            >
              Allow
            </button>
        </div>
      </div>
    </div>
  );
}
