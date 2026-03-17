import { useState, useEffect } from 'react';
import { useTelegramTheme } from '../hooks/useTelegram';
import type { Service } from '../types/booking';
import { ServiceEditModal } from '../components/ServiceEditModal/ServiceEditModal';
import { ConfirmModal } from '../components/ConfirmModal/ConfirmModal';
import { Plus, GripVertical, Eye, EyeOff, Trash2 } from 'lucide-react';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const password = localStorage.getItem('admin_password');
  const headers: HeadersInit = {};
  if (password) {
    headers['x-admin-password'] = password;
  }
  return headers;
}

export default function ServicesPage() {
  const theme = useTelegramTheme();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editService, setEditService] = useState<Service | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Service | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const isDark = (() => {
    const bg = theme.bgColor;
    if (!bg || bg === '#ffffff') return false;
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return false;
    return parseInt(hex, 16) < 128000;
  })();

  // Загрузка услуг
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/services`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setServices(data);
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const newOrder = [...services];
    const draggedIndex = newOrder.findIndex(s => s.id === draggedId);
    const targetIndex = newOrder.findIndex(s => s.id === targetId);

    const [dragged] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, dragged);

    setServices(newOrder);
    setDraggedId(null);

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
      fetchServices(); // revert on error
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
      <div style={{ padding: '24px', textAlign: 'center', color: theme.hintColor }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        padding: '16px',
        backgroundColor: theme.bgColor,
        paddingTop: 'env(safe-area-inset-top, 16px)',
        paddingBottom: 'env(safe-area-inset-bottom, 100px)',
      }}
    >
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        {/* Заголовок */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px' 
      }}>
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: 700, 
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
            padding: '10px 16px',
            borderRadius: '12px',
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

      {/* Список услуг */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {services.map((service) => (
          <div
            key={service.id}
            draggable
            onDragStart={(e) => handleDragStart(e, service.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, service.id)}
            onClick={() => setEditService(service)}
            className="glass-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '18px',
              borderRadius: '20px',
              background: service.isActive 
                ? (isDark 
                    ? 'linear-gradient(135deg, rgba(35,35,35,0.98), rgba(25,25,25,0.95))' 
                    : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(252,252,252,0.95))')
                : (isDark ? 'rgba(35,35,35,0.5)' : 'rgba(255,255,255,0.5)'),
              backdropFilter: 'blur(24px)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)'}`,
              opacity: service.isActive ? 1 : 0.6,
              cursor: 'grab',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isDark ? '0 6px 24px rgba(0,0,0,0.45)' : '0 6px 24px rgba(0,0,0,0.08)',
            }}
          >
            {/* Drag handle */}
            <GripVertical size={20} style={{ color: theme.hintColor, flexShrink: 0 }} />

            {/* Инфо */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: 700, 
                color: theme.textColor,
                fontSize: '16px',
              }}>
                {service.name}
              </div>
              <div style={{ 
                color: theme.hintColor, 
                fontSize: '13px',
                display: 'flex',
                gap: '12px',
                marginTop: '4px',
              }}>
                <span>{service.duration} мин</span>
                <span style={{ fontWeight: 700, color: theme.buttonColor, fontSize: '18px' }}>
                  {service.price} ₽
                </span>
              </div>
            </div>

            {/* Действия */}
            <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => toggleVisibility(service)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                {service.isActive 
                  ? <Eye size={18} style={{ color: theme.buttonColor }} />
                  : <EyeOff size={18} style={{ color: theme.hintColor }} />
                }
              </button>
              <button
                onClick={() => setDeleteConfirm(service)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={18} style={{ color: '#ef4444' }} />
              </button>
            </div>
          </div>
        ))}

        {services.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
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
    </div>
  );
}
