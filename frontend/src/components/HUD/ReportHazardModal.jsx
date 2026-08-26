import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

// Automatically detects the Codespace backend URL
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
export default function ReportHazardModal({ isOpen, onClose, userLat, userLng, onSuccess }) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) { 
        toast.error('Image must be less than 8MB'); 
        return; 
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return toast.error('Please capture or upload an image.');
    if (!userLat || !userLng) return toast.error('Location access required.');

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('image', image);
    formData.append('lat', userLat);
    formData.append('lng', userLng);
    formData.append('description', description);
    formData.append('reportedBy', 'Field Operator');

    try {
      console.log('Submitting to:', `${API_URL}/api/hazards/report`);
      const response = await axios.post(`${API_URL}/api/hazards/report`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
      toast.success('Hazard reported successfully!');
      onSuccess(response.data.hazard);
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to report hazard. Check console (F12).');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setImage(null); 
    setImagePreview(null); 
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} 
          style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #334155' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <AlertTriangle style={{ width: '20px', height: '20px', color: '#f59e0b' }} /> Report Damage
            </h3>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1' }}>Hazard Photo *</label>
              {imagePreview ? (
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #475569' }}>
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', display: 'block' }} />
                  <button type="button" onClick={() => { setImage(null); setImagePreview(null); }} style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['Camera', 'Gallery'].map((label) => (
                    <button key={label} type="button" onClick={() => fileInputRef.current.click()} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', border: '2px dashed #475569', borderRadius: '8px', background: '#1e293b', cursor: 'pointer', color: '#94a3b8', gap: '0.5rem', transition: 'border-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#f59e0b'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#475569'}
                    >
                      {label === 'Camera' ? <Camera style={{ width: '28px', height: '28px' }} /> : <Upload style={{ width: '28px', height: '28px' }} />}
                      <span style={{ fontSize: '0.875rem' }}>{label}</span>
                    </button>
                  ))}
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display: 'none' }} />
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1' }}>Description (Optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add any specific details..." style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', padding: '0.75rem', color: 'white', fontSize: '0.875rem', resize: 'none', minHeight: '80px', outline: 'none' }} rows={3} maxLength={500} />
            </div>

            <button type="submit" disabled={isSubmitting || !image} style={{ width: '100%', backgroundColor: isSubmitting || !image ? '#334155' : '#d97706', color: 'white', fontWeight: 600, padding: '0.75rem', borderRadius: '8px', border: 'none', cursor: isSubmitting || !image ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'background-color 0.2s' }}>
              {isSubmitting ? <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> : 'Submit Report'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}