import { useState, useEffect } from 'react';
import { useTelegramTheme } from '../hooks/useTelegram';
import type { Service } from '../types/booking';
import { ServiceEditModal } from '../components/ServiceEditModal/ServiceEditModal';
import { ConfirmModal } from '../components/ConfirmModal/ConfirmModal';
import { Plus, GripVertical, Eye, EyeOff, Trash2 } from 'lucide-react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const password = localStorage.getItem('admin_password');
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const headers: HeadersInit = {};
  if (password) headers['x-admin-password'] = password;
  if (tgId) headers['x-telegram-id'] = String(tgId);
  return headers;
}

// Сортируемый элемент - как у пользователя + админ кнопки
function SortableServiceCard({
  service,
  onToggleVisibility,
  onDelete,
  onEdit,
}: {
  service: Service;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const theme = useTelegramTheme();
  
  const isDark = (() => {
    const bg = theme.bgColor;
    if (!bg || bg === '#ffffff') return false;
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return false;
    return parseInt(hex, 16) < 128000;
  })();

  const photos = service.photos;
  const hasPhotos = Array.isArray(photos) && photos.length > 0 && photos[0];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'transform 0.15s' : transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`glass-card ${isDragging ? 'dragging' : ''}`}
        style={{
          background: service.isActive 
            ? (isDark 
                ? 'linear-gradient(135deg, rgba(35,35,35,0.98), rgba(25,25,25,0.95))' 
                : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(252,252,252,0.95))')
            : (isDark ? 'rgba(35,35,35,0.5)' : 'rgba(255,255,255,0.5)'),
          backdropFilter: 'blur(24px)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)'}`,
          borderRadius: '16px',
          boxShadow: isDragging 
            ? '0 16px 48px rgba(0,0,0,0.4)' 
            : (isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 4px 16px rgba(0,0,0,0.06)'),
          opacity: service.isActive ? 1 : 0.6,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex', 
          alignItems: 'center',
          padding: '12px 14px',
          gap: '12px',
          cursor: isDragging ? 'grabbing' : 'pointer',
          touchAction: 'none',
          minHeight: '60px',
        }}
      >
        {/* Фото */}
        {hasPhotos && photos && (
          <div 
            style={{
              width: '60px',
              height: '60px',
              overflow: 'hidden',
              borderRadius: '12px',
              flexShrink: 0,
            }}
          >
            <img 
              src={photos[0]} 
              alt={service.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        {/* Контент */}
        <div 
          onClick={onEdit} 
          style={{ 
            cursor: 'pointer', 
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <h3 style={{ 
            color: theme.textColor,
            fontSize: '14px',
            fontWeight: 600,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {service.name}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span style={{ 
              color: theme.buttonColor, 
              fontSize: '15px', 
              fontWeight: 700,
            }}>
              {service.price.toLocaleString('ru-RU')} ₽
            </span>
            <span style={{ 
              color: theme.hintColor, 
              fontSize: '12px',
            }}>
              • {service.duration} мин
            </span>
          </div>
        </div>

        {/* Admin actions */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            flexShrink: 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            style={{
              padding: '6px',
              cursor: 'grab',
              borderRadius: '8px',
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            }}
          >
            <GripVertical size={16} style={{ color: theme.hintColor }} />
          </div>
          
          <button
            onClick={onToggleVisibility}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            {service.isActive 
              ? <Eye size={16} style={{ color: theme.buttonColor }} />
              : <EyeOff size={16} style={{ color: theme.hintColor }} />
            }
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={16} style={{ color: '#ef4444' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const theme = useTelegramTheme();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editService, setEditService] = useState<Service | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Service | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 0,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Загрузка услуг
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/services`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 403) {
        console.error('Access denied');
        return;
      }
      const data = await res.json();
      setServices(data);
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  };

  // Drag & Drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = services.findIndex((s) => s.id === active.id);
      const newIndex = services.findIndex((s) => s.id === over.id);

      const newOrder = arrayMove(services, oldIndex, newIndex);
      setServices(newOrder);

      // Сохраняем порядок
      try {
        const orderedIds = newOrder.map(s => s.id);
        await fetch(`${API_BASE}/admin/services/reorder`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ orderedIds }),
        });
      } catch (err) {
        console.error('Failed to save order:', err);
        fetchServices();
      }
    }
  };

  // Переключение видимости
  const toggleVisibility = async (service: Service) => {
    try {
      await fetch(`${API_BASE}/admin/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      fetchServices();
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
  };

  // Удаление
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await fetch(`${API_BASE}/admin/services/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setDeleteConfirm(null);
      fetchServices();
    } catch (err) {
      console.error('Failed to delete service:', err);
    }
  };

  // Сохранение
  const handleSave = async (service: Partial<Service>) => {
    try {
      if (isCreating) {
        await fetch(`${API_BASE}/admin/services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(service),
        });
      } else if (editService) {
        await fetch(`${API_BASE}/admin/services/${editService.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(service),
        });
      }
      setEditService(null);
      setIsCreating(false);
      fetchServices();
    } catch (err) {
      console.error('Failed to save service:', err);
    }
  };

  if (loading) {
    return (
      <div 
        style={{ 
          minHeight: '100vh', 
          padding: '24px',
          backgroundColor: theme.bgColor,
          paddingTop: 'env(safe-area-inset-top, 24px)',
        }}
      >
        <div style={{ maxWidth: '440px', margin: '0 auto', textAlign: 'center', color: theme.hintColor }}>
          Загрузка...
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        padding: '24px',
        backgroundColor: theme.bgColor,
        paddingTop: 'env(safe-area-inset-top, 24px)',
        paddingBottom: 'env(safe-area-inset-bottom, 100px)',
      }}
    >
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        {/* Заголовок */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px' 
        }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 800, 
            color: theme.textColor,
            margin: 0 
          }}>
            Услуги
          </h2>
          <button
            onClick={() => setIsCreating(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 20px',
              borderRadius: '14px',
              border: 'none',
              background: `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`,
              color: theme.buttonTextColor,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            Добавить
          </button>
        </div>

        {/* Список услуг - сетка 2 колонки */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={services.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px' 
            }}>
              {services.map((service) => (
                <SortableServiceCard
                  key={service.id}
                  service={service}
                  onToggleVisibility={() => toggleVisibility(service)}
                  onDelete={() => setDeleteConfirm(service)}
                  onEdit={() => setEditService(service)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {services.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: theme.hintColor 
          }}>
            Нет услуг. Добавьте первую!
          </div>
        )}
      </div>

      {/* Модалка редактирования */}
      {(editService || isCreating) && (
        <ServiceEditModal
          service={editService}
          onSave={handleSave}
          onClose={() => {
            setEditService(null);
            setIsCreating(false);
          }}
        />
      )}

      {/* Подтверждение удаления */}
      {deleteConfirm && (
        <ConfirmModal
          title="Удалить услугу?"
          message={`Вы уверены, что хотите удалить "${deleteConfirm.name}"? Это действие нельзя отменить.`}
          confirmText="Удалить"
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
