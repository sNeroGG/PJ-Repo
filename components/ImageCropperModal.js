"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Crop, Check, Image as ImageIcon } from 'lucide-react';

export default function ImageCropperModal({ 
  isOpen, 
  imageSrc, 
  onCrop, 
  onClose, 
  defaultAspectRatio = null,
  fileName = 'image.jpg',
  fileType = 'image/jpeg'
}) {
  const [aspectRatio, setAspectRatio] = useState(defaultAspectRatio);
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [dragType, setDragType] = useState(null);
  
  const imgRef = useRef(null);
  const dragStartRef = useRef(null);

  // Reset crop settings when modal opens or image/aspectRatio changes
  useEffect(() => {
    if (isOpen && imgRef.current) {
      initializeCrop();
    }
  }, [isOpen, imageSrc, aspectRatio]);

  const initializeCrop = () => {
    if (!imgRef.current) return;
    const { width: displayWidth, height: displayHeight } = imgRef.current.getBoundingClientRect();
    
    if (aspectRatio) {
      const displayAspect = displayWidth / displayHeight;
      const targetAspect = aspectRatio; // e.g. 1.777 for 16:9
      
      let w = 80;
      let h = 80;
      
      if (displayAspect > targetAspect) {
        // Image is wider than crop aspect ratio -> crop height is 80%, width is calculated
        h = 80;
        w = 80 * (targetAspect / displayAspect);
      } else {
        // Image is taller than crop aspect ratio -> crop width is 80%, height is calculated
        w = 80;
        h = 80 * (displayAspect / targetAspect);
      }
      
      setCrop({
        x: (100 - w) / 2,
        y: (100 - h) / 2,
        width: w,
        height: h
      });
    } else {
      // Free aspect ratio, default to a nice centered box
      setCrop({ x: 15, y: 15, width: 70, height: 70 });
    }
  };

  const handleImageLoad = () => {
    initializeCrop();
  };

  const handleMouseDown = (e, type) => {
    e.preventDefault();
    e.stopPropagation();

    if (!imgRef.current) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = imgRef.current.getBoundingClientRect();
    const mouseXPercent = ((clientX - rect.left) / rect.width) * 100;
    const mouseYPercent = ((clientY - rect.top) / rect.height) * 100;

    dragStartRef.current = {
      startCrop: { ...crop },
      startMousePercent: { x: mouseXPercent, y: mouseYPercent }
    };
    setDragType(type);
  };

  const handleMouseMove = (e) => {
    if (!dragType || !imgRef.current || !dragStartRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const mouseXPercent = ((clientX - rect.left) / rect.width) * 100;
    const mouseYPercent = ((clientY - rect.top) / rect.height) * 100;

    const { startCrop, startMousePercent } = dragStartRef.current;
    
    // Percentage delta
    const dx = mouseXPercent - startMousePercent.x;
    const dy = mouseYPercent - startMousePercent.y;

    let newCrop = { ...startCrop };

    if (dragType === 'move') {
      newCrop.x = Math.max(0, Math.min(100 - startCrop.width, startCrop.x + dx));
      newCrop.y = Math.max(0, Math.min(100 - startCrop.height, startCrop.y + dy));
    } else {
      let left = startCrop.x;
      let top = startCrop.y;
      let right = startCrop.x + startCrop.width;
      let bottom = startCrop.y + startCrop.height;

      // Update edges based on handle dragged
      if (dragType.includes('r')) right = startCrop.x + startCrop.width + dx;
      if (dragType.includes('l')) left = startCrop.x + dx;
      if (dragType.includes('b')) bottom = startCrop.y + startCrop.height + dy;
      if (dragType.includes('t')) top = startCrop.y + dy;

      // Minimum crop box size in percentages
      const minSize = 10;
      
      if (right - left < minSize) {
        if (dragType.includes('r')) right = left + minSize;
        if (dragType.includes('l')) left = right - minSize;
      }
      if (bottom - top < minSize) {
        if (dragType.includes('b')) bottom = top + minSize;
        if (dragType.includes('t')) top = bottom - minSize;
      }

      // Enforce bounds before applying aspect ratio calculations
      left = Math.max(0, Math.min(100 - minSize, left));
      right = Math.max(left + minSize, Math.min(100, right));
      top = Math.max(0, Math.min(100 - minSize, top));
      bottom = Math.max(top + minSize, Math.min(100, bottom));

      if (aspectRatio) {
        const containerAspect = rect.width / rect.height;
        const targetRatio = aspectRatio / containerAspect;

        if (dragType === 'br') {
          // Adjust bottom based on right width
          const width = right - left;
          const height = width / targetRatio;
          bottom = top + height;
          if (bottom > 100) {
            bottom = 100;
            right = left + (bottom - top) * targetRatio;
          }
        } else if (dragType === 'bl') {
          const width = right - left;
          const height = width / targetRatio;
          bottom = top + height;
          if (bottom > 100) {
            bottom = 100;
            left = right - (bottom - top) * targetRatio;
          }
        } else if (dragType === 'tr') {
          const width = right - left;
          const height = width / targetRatio;
          top = bottom - height;
          if (top < 0) {
            top = 0;
            right = left + (bottom - top) * targetRatio;
          }
        } else if (dragType === 'tl') {
          const width = right - left;
          const height = width / targetRatio;
          top = bottom - height;
          if (top < 0) {
            top = 0;
            left = right - (bottom - top) * targetRatio;
          }
        }
      }

      // Final clamping validation
      left = Math.max(0, Math.min(100, left));
      right = Math.max(0, Math.min(100, right));
      top = Math.max(0, Math.min(100, top));
      bottom = Math.max(0, Math.min(100, bottom));

      newCrop = {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top
      };
    }

    setCrop(newCrop);
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      handleMouseMove({ clientX, clientY });
    };
    
    const onMouseUp = () => {
      setDragType(null);
    };

    if (dragType) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onMouseMove, { passive: false });
      window.addEventListener('touchend', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [dragType]);

  const handleSave = () => {
    if (!imgRef.current) return;
    
    const image = imgRef.current;
    
    // Create an offscreen canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      alert('Tu navegador no soporta operaciones de renderizado canvas.');
      return;
    }
    
    // Calculate pixel coordinates relative to natural image dimensions
    const cropX = (crop.x / 100) * image.naturalWidth;
    const cropY = (crop.y / 100) * image.naturalHeight;
    const cropW = (crop.width / 100) * image.naturalWidth;
    const cropH = (crop.height / 100) * image.naturalHeight;
    
    // Set canvas dimensions to cropped size
    canvas.width = cropW;
    canvas.height = cropH;
    
    // Draw cropped image onto canvas
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    );
    
    // Convert canvas image to Blob
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], fileName, { type: fileType });
        onCrop(croppedFile);
      } else {
        alert('Error al generar el recorte.');
      }
    }, fileType, 0.92);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        maxWidth: '850px',
        width: '100%',
        boxShadow: 'var(--shadow-premium)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--primary)',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Crop size={22} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: 700 }}>
              Recortar Imagen
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Workspace */}
        <div style={{
          flex: 1,
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          overflow: 'hidden',
          minHeight: '350px'
        }}>
          <div style={{
            position: 'relative',
            maxHeight: '55vh',
            maxWidth: '100%',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            borderRadius: '4px'
          }}>
            {/* Target Image */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Recortar"
              onLoad={handleImageLoad}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '55vh',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            />

            {/* Crop Box Overlay Area */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden'
              }}
            >
              {/* Crop box container */}
              <div 
                style={{
                  position: 'absolute',
                  left: `${crop.x}%`,
                  top: `${crop.y}%`,
                  width: `${crop.width}%`,
                  height: `${crop.height}%`,
                  outline: '2px solid var(--accent)',
                  boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.75)',
                  cursor: 'move',
                  zIndex: 10
                }}
                onMouseDown={(e) => handleMouseDown(e, 'move')}
                onTouchStart={(e) => handleMouseDown(e, 'move')}
              >
                {/* Rule of thirds grid lines */}
                <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: '1px', borderLeft: '1px dashed rgba(255,255,255,0.45)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: '1px', borderLeft: '1px dashed rgba(255,255,255,0.45)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: '1px', borderTop: '1px dashed rgba(255,255,255,0.45)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: '1px', borderTop: '1px dashed rgba(255,255,255,0.45)', pointerEvents: 'none' }} />

                {/* Corner Resizing Handles */}
                {/* Top-Left */}
                <div 
                  onMouseDown={(e) => handleMouseDown(e, 'tl')}
                  onTouchStart={(e) => handleMouseDown(e, 'tl')}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '-6px',
                    width: '14px',
                    height: '14px',
                    backgroundColor: '#fff',
                    border: '2px solid var(--accent)',
                    borderRadius: '50%',
                    cursor: 'nwse-resize',
                    zIndex: 20
                  }}
                />
                {/* Top-Right */}
                <div 
                  onMouseDown={(e) => handleMouseDown(e, 'tr')}
                  onTouchStart={(e) => handleMouseDown(e, 'tr')}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '14px',
                    height: '14px',
                    backgroundColor: '#fff',
                    border: '2px solid var(--accent)',
                    borderRadius: '50%',
                    cursor: 'nesw-resize',
                    zIndex: 20
                  }}
                />
                {/* Bottom-Left */}
                <div 
                  onMouseDown={(e) => handleMouseDown(e, 'bl')}
                  onTouchStart={(e) => handleMouseDown(e, 'bl')}
                  style={{
                    position: 'absolute',
                    bottom: '-6px',
                    left: '-6px',
                    width: '14px',
                    height: '14px',
                    backgroundColor: '#fff',
                    border: '2px solid var(--accent)',
                    borderRadius: '50%',
                    cursor: 'nesw-resize',
                    zIndex: 20
                  }}
                />
                {/* Bottom-Right */}
                <div 
                  onMouseDown={(e) => handleMouseDown(e, 'br')}
                  onTouchStart={(e) => handleMouseDown(e, 'br')}
                  style={{
                    position: 'absolute',
                    bottom: '-6px',
                    right: '-6px',
                    width: '14px',
                    height: '14px',
                    backgroundColor: '#fff',
                    border: '2px solid var(--accent)',
                    borderRadius: '50%',
                    cursor: 'nwse-resize',
                    zIndex: 20
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar & Footer */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: 'var(--bg-app)'
        }}>
          {/* Aspect Ratio Presets */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ImageIcon size={16} /> Relación de Aspecto:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'Libre', value: null },
                { label: 'Flyer (16:9)', value: 16/9 },
                { label: 'Estándar (4:3)', value: 4/3 },
                { label: 'Cuadrado (1:1)', value: 1 }
              ].map((preset, idx) => {
                const isActive = aspectRatio === preset.value;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAspectRatio(preset.value)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: isActive ? 'var(--primary)' : 'var(--bg-card)',
                      color: isActive ? '#fff' : 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '16px'
          }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Check size={16} />
              Aplicar Recorte y Subir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
