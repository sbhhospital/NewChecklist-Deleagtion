import React, { useState, useEffect } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { User } from 'lucide-react'

const ProfilePhoto = () => {
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Same image URL processing function
  const getDisplayableImageUrl = (url) => {
    if (!url) return null;

    try {
      const directMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (directMatch && directMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${directMatch[1]}&sz=w400`;
      }
      
      const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (ucMatch && ucMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${ucMatch[1]}&sz=w400`;
      }
      
      const openMatch = url.match(/open\?id=([a-zA-Z0-9_-]+)/);
      if (openMatch && openMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w400`;
      }
      
      if (url.includes("thumbnail?id=")) {
        return url;
      }

      const anyIdMatch = url.match(/([a-zA-Z0-9_-]{25,})/);
      if (anyIdMatch && anyIdMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${anyIdMatch[1]}&sz=w400`;
      }
      
      const cacheBuster = Date.now();
      return url.includes("?") ? `${url}&cb=${cacheBuster}` : `${url}?cb=${cacheBuster}`;
    } catch (e) {
      console.error("Error processing image URL:", url, e);
      return url; // Return original URL as fallback
    }
  };

  // Fetch data from Whatsapp Sheet Column H
  const fetchProfilePhoto = async () => {
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbwfGaiHaPhexcE9i-A7q9m81IX6zWqpr4lZBe4AkhlTjVl4wCl0v_ltvBibfduNArBVoA/exec?sheet=Whatsapp&action=fetch'
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from Whatsapp sheet');
      }
      
      const rawData = result.data || result;
      
      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Get headers and find Column H (index 7)
      const headers = rawData[0];
      const dataRows = rawData.slice(1);
      
      // Column H is index 7 (0-based)
      const photoColumnIndex = 7;
      
      // Get current user from localStorage
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('No user data found in localStorage');
      }

      const currentUser = JSON.parse(userData);
      const userName = currentUser.Name;

      // Find matching row for current user
      const userRow = dataRows.find(row => {
        // Assuming Column A (index 0) contains employee names
        return row[0]?.toString().trim().toLowerCase() === userName.trim().toLowerCase();
      });

      if (userRow && userRow[photoColumnIndex]) {
        setProfileData({
          candidateName: userName,
          candidatePhoto: userRow[photoColumnIndex]
        });
      } else {
        setProfileData({
          candidateName: userName,
          candidatePhoto: null
        });
      }
      
    } catch (error) {
      console.error('Error fetching profile photo:', error);
      setProfileData({
        candidateName: 'User',
        candidatePhoto: null
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfilePhoto();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
          <span className="text-gray-600 text-sm ml-2">Loading profile photo...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="page-content p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Profile Photo</h1>
        
        <div className="bg-white rounded-xl shadow-lg border p-6 max-w-md mx-auto">
          <div className="text-center">
            <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
              {profileData?.candidatePhoto ? (
                <img
                  src={getDisplayableImageUrl(profileData.candidatePhoto)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.log("Image failed to load:", e.target.src);
                    // First try the original URL directly
                    if (e.target.src !== profileData.candidatePhoto) {
                      console.log("Trying original URL:", profileData.candidatePhoto);
                      e.target.src = profileData.candidatePhoto;
                    } else {
                      // If that also fails, show user icon
                      console.log("Both thumbnail and original URL failed");
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }
                  }}
                  onLoad={(e) => {
                    console.log("Image loaded successfully:", e.target.src);
                  }}
                />
              ) : null}
              <div
                className={`w-full h-full flex items-center justify-center ${
                  profileData?.candidatePhoto ? "hidden" : "flex"
                }`}
              >
                <User size={48} className="text-indigo-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {profileData?.candidateName || 'User'}
            </h2>
            <p className="text-sm text-gray-500 mt-2">Photo from Whatsapp Sheet</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default ProfilePhoto