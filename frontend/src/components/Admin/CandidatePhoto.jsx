import React, { useState } from 'react';
import { User } from 'lucide-react';

const sizeStyles = {
  sm: { width: '40px', height: '40px', fontSize: '14px' },
  md: { width: '56px', height: '56px', fontSize: '18px' },
  lg: { width: '80px', height: '80px', fontSize: '24px' },
};

export function getGoogleDriveImageUrl(url, size = 200) {
  if (!url) return null;
  
  // Check if it's a Google Drive link
  if (url.includes('drive.google.com')) {
    // Extract file ID from various Google Drive URL formats
    let fileId = null;
    
    // Format: /file/d/FILE_ID/view
    const match1 = url.match(/\/file\/d\/([^/]+)/);
    if (match1) fileId = match1[1];
    
    // Format: ?id=FILE_ID
    const match2 = url.match(/[?&]id=([^&]+)/);
    if (match2) fileId = match2[1];
    
    // Format: /open?id=FILE_ID
    const match3 = url.match(/\/open\?id=([^&]+)/);
    if (match3) fileId = match3[1];
    
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
    }
  }
  
  return url;
}

export function CandidatePhoto({ photoUrl, name, size = 'md' }) {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const sizeStyle = sizeStyles[size] || sizeStyles.md;
  const processedUrl = getGoogleDriveImageUrl(photoUrl);
  
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!processedUrl || imageError) {
    return (
      <div
        style={{
          ...sizeStyle,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          border: '3px solid white',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', ...sizeStyle }}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '50%',
              height: '50%',
              border: '2px solid #667eea',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      )}
      <img
        src={processedUrl}
        alt={name}
        style={{
          ...sizeStyle,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '3px solid white',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.2s ease',
        }}
        onLoad={() => setLoading(false)}
        onError={() => {
          setImageError(true);
          setLoading(false);
        }}
      />
    </div>
  );
}
