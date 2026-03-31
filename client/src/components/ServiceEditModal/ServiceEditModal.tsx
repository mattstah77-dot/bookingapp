import { useState, useEffect } from 'react';
import { useTelegramTheme } from '../../hooks/useTelegram';
import type { Service } from '../../types/booking';
import { Alert } from '../Alert/Alert';
import { X, Plus, ChevronLeft, ChevronRight, ZoomIn, Upload } from 'lucide-react';

interface ServiceEditModalProps {
  service: Service | null;
  onSave: (service: Partial<Service>) => void;
  onClose: () => void;
}

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 500 * 1024; // 500KB

export function ServiceEditModal({ service, onSave, onClose }: ServiceEditModalProps) {
  const theme = useTelegramTheme();
  const isNew = !service;

  const [name, setName] = useState(service?.name || '');
  const [description, setDescription] = useState(service?.description || '');
  const [duration, setDuration] = useState(service?.duration || 45);
  const [price, setPrice] = useState(service?.price || 1000);
  const [photos, setPhotos] = useState<string[]>(service?.photos || []);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);

  // Alert state
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({ isOpen: false, title: '', type: 'info' });

  const showAlert = (title: string, message?: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertState({ isOpen: true, title, message, type });
  };

  const isDark = theme.bgColor !== '#ffffff';

  // Автопереключение фото
  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPhotoIndex(i => (i + 1) % photos.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [photos.length]);

  // Обработчик загрузки фото
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (photos.length >= MAX_PHOTOS) return;
      if (file.size > MAX_PHOTO_SIZE) {
        showAlert('Файл слишком большой', 'Максимальный размер: 500KB', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setPhotos(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    if (currentPhotoIndex >= photos.length - 1) {
      setCurrentPhotoIndex(Math.max(0, photos.length - 2));
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      showAlert('Ошибка', 'Введите название услуги', 'error');
      return;
    }
    if (duration < 1) {
      showAlert('Ошибка', 'Укажите длительность', 'error');
      return;
    }
    if (price < 1) {
      showAlert('Ошибка', 'Укажите цену', 'error');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      duration,
      price,
      photos,
    });
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: isDark ? '#1a1a1a' : '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Заголовок */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 20px 0',
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: theme.textColor,
              margin: 0,
            }}>
              {isNew ? 'Новая услуга' : 'Редактирование'}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={24} style={{ color: theme.hintColor }} />
            </button>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Фото */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: theme.hintColor,
                marginBottom: '8px',
              }}>
                Фотографии ({photos.length}/{MAX_PHOTOS})
              </label>

              {photos.length > 0 ? (
                <div style={{
                  position: 'relative',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  aspectRatio: '4/3',
                  background: isDark ? '#2a2a2a' : '#f5f5f5',
                }}>
                  <img
                    src={photos[currentPhotoIndex]}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onClick={() => setZoomPhoto(photos[currentPhotoIndex])}
                  />

                  {/* Навигация */}
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                        style={{
                          position: 'absolute',
                          left: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'rgba(0,0,0,0.5)',
                          border: 'none',
                          borderRadius: '50%',
                          padding: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        <ChevronLeft size={20} color="#fff" />
                      </button>
                      <button
                        onClick={() => setCurrentPhotoIndex(i => (i + 1) % photos.length)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'rgba(0,0,0,0.5)',
                          border: 'none',
                          borderRadius: '50%',
                          padding: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        <ChevronRight size={20} color="#fff" />
                      </button>

                      {/* Индикаторы */}
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '4px',
                      }}>
                        {photos.map((_, i) => (
                          <div
                            key={i}
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: i === currentPhotoIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Кнопка удаления */}
                  <button
                    onClick={() => removePhoto(currentPhotoIndex)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(239,68,68,0.9)',
                      border: 'none',
                      borderRadius: '50%',
                      padding: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} color="#fff" />
                  </button>

                  {/* Zoom */}
                  <button
                    onClick={() => setZoomPhoto(photos[currentPhotoIndex])}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(0,0,0,0.5)',
                      border: 'none',
                      borderRadius: '50%',
                      padding: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <ZoomIn size={16} color="#fff" />
                  </button>
                </div>
              ) : (
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '32px',
                  borderRadius: '16px',
                  border: `2px dashed ${theme.hintColor}30`,
                  cursor: 'pointer',
                  color: theme.hintColor,
                  fontSize: '13px',
                }}>
                  <Upload size={24} />
                  Нажмите для загрузки фото
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>
                    или перетащите сюда
                  </span>
                  <span style={{ fontSize: '11px', opacity: 0.5 }}>
                    Макс 500KB, до {MAX_PHOTOS} фото
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}

              {/* Добавить ещё фото */}
              {photos.length > 0 && photos.length < MAX_PHOTOS && (
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  padding: '10px',
                  borderRadius: '12px',
                  border: `1px solid ${theme.hintColor}20`,
                  cursor: 'pointer',
                  color: theme.hintColor,
                  fontSize: '13px',
                }}>
                  <Plus size={16} />
                  Добавить ещё фото
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>

            {/* Название */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: theme.hintColor,
                marginBottom: '8px',
              }}>
                Название *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Например: Стрижка"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                  background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                  color: theme.textColor,
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Описание */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: theme.hintColor,
                marginBottom: '8px',
              }}>
                Описание
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Краткое описание услуги"
                rows={3}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                  background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                  color: theme.textColor,
                  fontSize: '15px',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Длительность и цена - вертикально на мобильных */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: theme.hintColor,
                  marginBottom: '8px',
                }}>
                  Длительность (мин) *
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={e => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                    background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                    color: theme.textColor,
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: theme.hintColor,
                  marginBottom: '8px',
                }}>
                  Цена (₽) *
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                    background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                    color: theme.textColor,
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Кнопки */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '14px',
                  border: `1px solid ${theme.hintColor}30`,
                  background: 'transparent',
                  color: theme.textColor,
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '14px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`,
                  color: theme.buttonTextColor,
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Zoom просмотр */}
      {zoomPhoto && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setZoomPhoto(null)}
        >
          <img
            src={zoomPhoto}
            alt=""
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
            }}
          />
          <button
            onClick={() => setZoomPhoto(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={32} color="#fff" />
          </button>
        </div>
      )}

      {/* Кастомный Alert */}
      <Alert
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
