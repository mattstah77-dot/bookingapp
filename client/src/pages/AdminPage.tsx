import { useState, useEffect, useMemo } from 'react';
import { useTelegramTheme } from '../hooks/useTelegram';
import { Alert } from '../components/Alert/Alert';
import { 
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, 
  CalendarDays, Users, ClipboardList, Scissors, Bell, Clock,
  Plus, Edit2, Eye, EyeOff, GripVertical
} from 'lucide-react';
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

interface ReminderSettings {
  enabled: boolean;
  defaultMinutesBefore: number;
  customReminders: { serviceId: string; minutesBefore: number }[];
}

interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  status: 'confirmed' | 'cancelled';
  clientName?: string;
  clientPhone?: string;
  createdAt: string;
}

interface Service {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  category?: string;
  photos?: string[];
  sortOrder: number;
  isActive: boolean;
}

const API_BASE = '/api';

function getTelegramId(): number | undefined {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
}

function getStoredPassword(): string | null {
  return localStorage.getItem('admin_password');
}

function setStoredPassword(password: string): void {
  localStorage.setItem('admin_password', password);
}

function getAuthHeaders(): HeadersInit {
  const tgId = getTelegramId();
  const password = getStoredPassword();
  
  const headers: HeadersInit = {};
  if (tgId) {
    headers['x-telegram-id'] = String(tgId);
  }
  if (password) {
    headers['x-admin-password'] = password;
  }
  return headers;
}

export default function AdminPage() {
  const theme = useTelegramTheme();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookedDates, setBookedDates] = useState<Record<string, number>>({});
  const [accessDenied, setAccessDenied] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'bookings' | 'services' | 'settings'>('bookings');
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    enabled: true,
    defaultMinutesBefore: 120,
    customReminders: [],
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Модальное окно редактирования услуги
  const [editModalService, setEditModalService] = useState<Service | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Сенсоры для drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Alert state
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    type: 'success' | 'error' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', type: 'info' });

  const showAlert = (title: string, message?: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertState({ isOpen: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setAlertState({ isOpen: true, title, message, type: 'warning', confirmText: 'Да', cancelText: 'Отмена', onConfirm });
  };

  // Функция возврата на главную
  const goBack = () => {
    window.location.href = '/';
  };

  const isDark = (() => {
    const bg = theme.bgColor;
    if (!bg || bg === '#ffffff') return false;
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return false;
    return parseInt(hex, 16) < 128000;
  })();

  // Проверка аутентификации при загрузке
  useEffect(() => {
    const password = getStoredPassword();
    if (password) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    const fetchBookedDates = async () => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
      
      try {
        const res = await fetch(
          `${API_BASE}/admin/bookings/dates?startDate=${startDate}&endDate=${endDate}`,
          { headers: getAuthHeaders() }
        );
        
        if (res.status === 403) {
          setAccessDenied(true);
          return;
        }
        
        const data = await res.json();
        setBookedDates(data);
      } catch (err) {
        console.error('Failed to fetch dates:', err);
      }
    };
    
    fetchBookedDates();
  }, [currentMonth, isAuthenticated]);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        let url = `${API_BASE}/admin/bookings?`;
        if (selectedDate) {
          const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
          url += `date=${dateStr}`;
        }
        
        const res = await fetch(url, { headers: getAuthHeaders() });
        
        if (res.status === 403) {
          setAccessDenied(true);
          return;
        }
        
        const data = await res.json();
        setBookings(data);
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookings();
  }, [selectedDate]);

  // Загрузка настроек напоминаний
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsRes = await fetch(`${API_BASE}/admin/reminder-settings`, { headers: getAuthHeaders() });
        
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setReminderSettings(settingsData);
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
    };
    
    if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab]);

  // Загрузка услуг
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/services`, { headers: getAuthHeaders() });
        console.log('[FETCH SERVICES] status:', res.status);
        const data = await res.json();
        console.log('[FETCH SERVICES] data:', data);
        setServices(data);
      } catch (err) {
        console.error('Failed to fetch services:', err);
      }
    };
    
    if (activeTab === 'services') {
      fetchServices();
    }
  }, [activeTab]);

  // Переключить видимость услуги
  const handleToggleService = async (id: number, currentActive: boolean) => {
    try {
      const newActive = !currentActive;
      const res = await fetch(`${API_BASE}/admin/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ isActive: newActive }),
      });
      console.log('[TOGGLE] status:', res.status);
      const data = await res.json();
      console.log('[TOGGLE] response:', data);
      
      if (!res.ok) throw new Error(data.error || 'Failed to toggle');
      
      setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: newActive } : s));
      showAlert('Сохранено', newActive ? 'Услуга теперь видна' : 'Услуга скрыта', 'success');
    } catch (err: any) {
      console.error('Failed to toggle service:', err);
      showAlert('Ошибка', err.message || 'Не удалось изменить видимость', 'error');
    }
  };

  // Удалить услугу
  const handleDeleteService = (id: number) => {
    showConfirm(
      'Удалить услугу?',
      'Эта услуга будет удалена безвозвратно.',
      async () => {
        try {
          const res = await fetch(`${API_BASE}/admin/services/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          console.log('[DELETE] status:', res.status);
          const data = await res.json();
          console.log('[DELETE] response:', data);
          
          if (!res.ok) throw new Error(data.error || 'Failed to delete');
          
          setServices(prev => prev.filter(s => s.id !== id));
          showAlert('Удалено', 'Услуга удалена', 'success');
        } catch (err: any) {
          console.error('Failed to delete service:', err);
          showAlert('Ошибка', err.message || 'Не удалось удалить услугу', 'error');
        }
      }
    );
  };

  // Drag-and-drop: завершение перетаскивания
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = services.findIndex(s => s.id === active.id);
      const newIndex = services.findIndex(s => s.id === over.id);
      
      const newServices = arrayMove(services, oldIndex, newIndex);
      setServices(newServices);
      
      // Сохраняем новый порядок на сервере
      try {
        const orderedIds = newServices.map(s => s.id);
        await fetch(`${API_BASE}/admin/services/reorder`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ orderedIds }),
        });
      } catch (err) {
        console.error('Failed to save order:', err);
      }
    }
  };

  // Открыть модальное окно редактирования
  const handleOpenEditModal = (service: Service) => {
    setEditModalService(service);
    setShowEditModal(true);
  };
  
  // Сохранить услугу из модального окна
  const handleSaveFromModal = async (serviceData: Partial<Service>) => {
    if (!editModalService) {
      // Новая услуга
      try {
        const res = await fetch(`${API_BASE}/admin/services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(serviceData),
        });
        console.log('[CREATE] status:', res.status);
        const data = await res.json();
        console.log('[CREATE] response:', data);
        
        if (!res.ok) throw new Error(data.error || 'Failed to create');
        
        const res2 = await fetch(`${API_BASE}/admin/services`, { headers: getAuthHeaders() });
        const data2 = await res2.json();
        setServices(data2);
        showAlert('Сохранено', 'Услуга создана', 'success');
      } catch (err: any) {
        console.error('Failed to create service:', err);
        showAlert('Ошибка', err.message || 'Не удалось создать услугу', 'error');
      }
    } else {
      // Обновить услугу
      try {
        const res = await fetch(`${API_BASE}/admin/services/${editModalService.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(serviceData),
        });
        console.log('[UPDATE] status:', res.status);
        const data = await res.json();
        console.log('[UPDATE] response:', data);
        
        if (!res.ok) throw new Error(data.error || 'Failed to update');
        
        const res2 = await fetch(`${API_BASE}/admin/services`, { headers: getAuthHeaders() });
        const data2 = await res2.json();
        setServices(data2);
        showAlert('Сохранено', 'Услуга обновлена', 'success');
      } catch (err: any) {
        console.error('Failed to update service:', err);
        showAlert('Ошибка', err.message || 'Не удалось обновить услугу', 'error');
      }
    }
    
    setShowEditModal(false);
    setEditModalService(null);
  };

  const filteredBookings = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter(b => b.status === filter);
  }, [bookings, filter]);

  const stats = useMemo(() => {
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    return { confirmed, cancelled, total: bookings.length };
  }, [bookings]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const handleLogin = () => {
    if (passwordInput.trim()) {
      setStoredPassword(passwordInput);
      setIsAuthenticated(true);
      // Перезагрузим данные
      window.location.reload();
    }
  };

  const handleStatusChange = async (id: string, status: 'confirmed' | 'cancelled') => {
    try {
      await fetch(`${API_BASE}/admin/bookings/${id}`, { 
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ status }),
      });
      
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту запись?')) return;
    
    try {
      await fetch(`${API_BASE}/admin/bookings/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleSaveReminderSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch(`${API_BASE}/admin/reminder-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(reminderSettings),
      });
      
      if (res.ok) {
        alert('Настройки сохранены!');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const goToPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  if (accessDenied || (!isAuthenticated && !getTelegramId())) {
    return (
      <div 
        style={{ 
          minHeight: '100vh', 
          padding: '24px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: theme.bgColor,
        }}
      >
        <div style={{ 
          textAlign: 'center',
          background: isDark 
            ? 'linear-gradient(135deg, rgba(35,35,35,0.95), rgba(25,25,25,0.9))' 
            : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(252,252,252,0.9))',
          backdropFilter: 'blur(24px)',
          borderRadius: '28px',
          padding: '48px 32px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
          width: '100%',
          maxWidth: '320px',
        }}>
          <div style={{ fontSize: '56px', marginBottom: '20px' }}>🔐</div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px', color: theme.textColor }}>
            Админ-панель
          </h2>
          <p style={{ color: theme.hintColor, marginBottom: '24px' }}>
            Введите пароль для входа
          </p>
          
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Пароль"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            style={{ 
              width: '100%',
              padding: '16px',
              borderRadius: '14px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
              background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
              color: theme.textColor,
              fontSize: '16px',
              marginBottom: '16px',
              outline: 'none',
            }}
          />
          
          <button
            onClick={handleLogin}
            style={{ 
              width: '100%',
              padding: '16px',
              borderRadius: '14px',
              border: 'none',
              background: `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`,
              color: theme.buttonTextColor,
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Войти
          </button>
          
          {accessDenied && (
            <p style={{ color: '#ef4444', marginTop: '16px', fontSize: '14px' }}>
              Неверный пароль
            </p>
          )}
          
          <p style={{ color: theme.hintColor, marginTop: '24px', fontSize: '12px' }}>
            Или откройте из Telegram бота
          </p>
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
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
      }}
    >
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        {/* Кнопка назад - только иконка */}
        <button
          onClick={goBack}
          title="На главную"
          style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            border: 'none',
            borderRadius: '10px',
            color: theme.buttonColor,
            cursor: 'pointer',
            marginBottom: '16px',
            padding: 0,
          }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Заголовок */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '4px',
            background: `linear-gradient(90deg, ${theme.buttonColor}, ${theme.buttonColor}80)`,
            borderRadius: '2px',
            marginBottom: '16px',
          }} />
          <h1 style={{ color: theme.textColor, fontSize: '28px', fontWeight: 800 }}>
            Админ-панель
          </h1>
        </div>

        {/* Табы */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('bookings')}
            style={{ 
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              background: activeTab === 'bookings' 
                ? `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`
                : 'transparent',
              color: activeTab === 'bookings' 
                ? theme.buttonTextColor 
                : theme.hintColor,
              border: `1px solid ${activeTab === 'bookings' ? 'transparent' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')}`,
              cursor: 'pointer',
            }}
          >
            <ClipboardList size={18} />
            Записи
          </button>
          <button
            onClick={() => setActiveTab('services')}
            style={{ 
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              background: activeTab === 'services' 
                ? `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`
                : 'transparent',
              color: activeTab === 'services' 
                ? theme.buttonTextColor 
                : theme.hintColor,
              border: `1px solid ${activeTab === 'services' ? 'transparent' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')}`,
              cursor: 'pointer',
            }}
          >
            <Scissors size={18} />
            Услуги
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{ 
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              background: activeTab === 'settings' 
                ? `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`
                : 'transparent',
              color: activeTab === 'settings' 
                ? theme.buttonTextColor 
                : theme.hintColor,
              border: `1px solid ${activeTab === 'settings' ? 'transparent' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')}`,
              cursor: 'pointer',
            }}
          >
            <Bell size={18} />
            Настройки
          </button>
        </div>

        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease' }}>
            {/* Включение/выключение напоминаний */}
            <div 
              className="glass-card"
              style={{
                borderRadius: '20px',
                padding: '24px',
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(35,35,35,0.95), rgba(25,25,25,0.9))' 
                  : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(252,252,252,0.9))',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ color: theme.textColor, fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>
                    Напоминания клиентам
                  </h3>
                  <p style={{ color: theme.hintColor, fontSize: '13px', margin: 0 }}>
                    Отправлять напоминания о записи
                  </p>
                </div>
                <button
                  onClick={() => setReminderSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                  style={{
                    width: '52px',
                    height: '30px',
                    borderRadius: '15px',
                    border: 'none',
                    background: reminderSettings.enabled ? theme.buttonColor : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: reminderSettings.enabled ? '23px' : '3px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '12px',
                    background: '#fff',
                    transition: 'all 0.3s ease',
                  }} />
                </button>
              </div>
            </div>

            {/* Время напоминания по умолчанию */}
            <div 
              className="glass-card"
              style={{ 
                borderRadius: '20px',
                padding: '24px',
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(35,35,35,0.95), rgba(25,25,25,0.9))' 
                  : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(252,252,252,0.9))',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
                opacity: reminderSettings.enabled ? 1 : 0.5,
                pointerEvents: reminderSettings.enabled ? 'auto' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Clock size={20} style={{ color: theme.buttonColor }} />
                <h3 style={{ color: theme.textColor, fontSize: '16px', fontWeight: 600, margin: 0 }}>
                  Время напоминания
                </h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { value: 60, label: '1 час' },
                  { value: 120, label: '2 часа' },
                  { value: 180, label: '3 часа' },
                  { value: 1440, label: 'За сутки' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setReminderSettings(prev => ({ ...prev, defaultMinutesBefore: option.value }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: '14px',
                      border: `1px solid ${reminderSettings.defaultMinutesBefore === option.value ? theme.buttonColor : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')}`,
                      background: reminderSettings.defaultMinutesBefore === option.value 
                        ? `${theme.buttonColor}15`
                        : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ color: theme.textColor, fontSize: '14px', fontWeight: 500 }}>
                      {option.label}
                    </span>
                    {reminderSettings.defaultMinutesBefore === option.value && (
                      <CheckCircle size={18} style={{ color: theme.buttonColor }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Кнопка сохранения */}
            <button
              onClick={handleSaveReminderSettings}
              disabled={savingSettings}
              style={{ 
                padding: '18px',
                borderRadius: '16px',
                border: 'none',
                background: `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`,
                color: theme.buttonTextColor,
                fontSize: '16px',
                fontWeight: 600,
                cursor: savingSettings ? 'not-allowed' : 'pointer',
                opacity: savingSettings ? 0.7 : 1,
              }}
            >
              {savingSettings ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>
        )}

        {activeTab === 'services' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* Кнопка добавления - открывает модальное окно */}
            <button
              onClick={() => { setEditModalService(null); setShowEditModal(true); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: `1px dashed ${theme.buttonColor}50`,
                background: 'transparent',
                color: theme.buttonColor,
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '20px',
              }}
            >
              <Plus size={20} />
              Добавить услугу
            </button>

            {/* Список услуг с drag-and-drop */}
            {services.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: theme.hintColor }}>
                Нет услуг
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={services.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {services.map(service => (
                      <SortableServiceCard
                        key={service.id}
                        service={service}
                        onToggle={() => handleToggleService(service.id, service.isActive)}
                        onDelete={() => handleDeleteService(service.id)}
                        onEdit={() => handleOpenEditModal(service)}
                        theme={theme}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}

        {activeTab === 'bookings' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* Статистика */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '28px' }}>
          <div 
            className="glass-card"
            style={{ 
              borderRadius: '22px',
              padding: '22px',
              background: isDark 
                ? 'linear-gradient(135deg, rgba(35,35,35,0.95), rgba(25,25,25,0.9))' 
                : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(252,252,252,0.9))',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'radial-gradient(circle, rgba(34,197,94,0.2) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <CheckCircle size={20} style={{ color: '#22c55e' }} />
                <span style={{ fontSize: '13px', color: theme.hintColor, fontWeight: 500 }}>Подтверждено</span>
              </div>
              <span style={{ fontSize: '32px', fontWeight: 700, color: theme.textColor }}>
                {stats.confirmed}
              </span>
            </div>
          </div>
          
          <div 
            className="glass-card"
            style={{ 
              borderRadius: '22px',
              padding: '22px',
              background: isDark 
                ? 'linear-gradient(135deg, rgba(35,35,35,0.95), rgba(25,25,25,0.9))' 
                : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(252,252,252,0.9))',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <XCircle size={20} style={{ color: '#ef4444' }} />
                <span style={{ fontSize: '13px', color: theme.hintColor, fontWeight: 500 }}>Отменено</span>
              </div>
              <span style={{ fontSize: '32px', fontWeight: 700, color: theme.textColor }}>
                {stats.cancelled}
              </span>
            </div>
          </div>
        </div>

        {/* Календарь */}
        <div 
          className="glass-card"
          style={{ 
            borderRadius: '26px',
            padding: '26px',
            marginBottom: '28px',
            background: isDark 
              ? 'linear-gradient(135deg, rgba(35,35,35,0.95), rgba(25,25,25,0.9))' 
              : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(252,252,252,0.9))',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-40px',
            left: '-40px',
            width: '120px',
            height: '120px',
            background: `radial-gradient(circle, ${theme.buttonColor}15 0%, transparent 70%)`,
            borderRadius: '50%',
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <button 
                onClick={goToPrevMonth} 
                style={{ padding: '12px', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <ChevronLeft size={24} style={{ color: theme.textColor }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CalendarDays size={22} style={{ color: theme.buttonColor }} />
                <span style={{ fontWeight: 700, color: theme.textColor, fontSize: '16px' }}>
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
              </div>
              <button 
                onClick={goToNextMonth} 
                style={{ padding: '12px', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <ChevronRight size={24} style={{ color: theme.textColor }} />
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '10px' }}>
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                <div 
                  key={day} 
                  style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: theme.hintColor, padding: '10px 0' }}
                >
                  {day}
                </div>
              ))}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {(() => {
                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth();
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
                
                const days = [];
                for (let i = 0; i < startDayOfWeek; i++) {
                  days.push(<div key={`empty-${i}`} style={{ aspectRatio: '1' }} />);
                }
                
                for (let i = 1; i <= lastDay.getDate(); i++) {
                  const date = new Date(year, month, i);
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                  const hasBookings = bookedDates[dateStr] > 0;
                  const isSelected = selectedDate && 
                    selectedDate.getDate() === i && 
                    selectedDate.getMonth() === month && 
                    selectedDate.getFullYear() === year;
                  const isToday = new Date().getDate() === i && 
                    new Date().getMonth() === month && 
                    new Date().getFullYear() === year;
                  
                  days.push(
                    <button
                      key={i}
                      onClick={() => setSelectedDate(date)}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.25s ease',
                        background: isSelected 
                          ? theme.buttonColor 
                          : isToday 
                            ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)')
                            : 'transparent',
                        color: isSelected 
                          ? theme.buttonTextColor 
                          : theme.textColor,
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      {i}
                      {hasBookings && !isSelected && (
                        <span 
                          style={{ 
                            position: 'absolute',
                            bottom: '3px',
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: theme.buttonColor,
                          }}
                        />
                      )}
                    </button>
                  );
                }
                
                return days;
              })()}
            </div>
          </div>
        </div>

        {/* Фильтры */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          {(['all', 'confirmed', 'cancelled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flex: 1,
                padding: '14px 8px',
                borderRadius: '14px',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.3s ease',
                background: filter === f 
                  ? `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`
                  : isDark 
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.04)',
                color: filter === f 
                  ? theme.buttonTextColor 
                  : theme.hintColor,
                border: `1px solid ${filter === f ? 'transparent' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')}`,
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? 'Все' : f === 'confirmed' ? 'Подтвержд.' : 'Отменен.'}
            </button>
          ))}
        </div>

        {/* Список */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: theme.hintColor }}>
            Загрузка...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: theme.hintColor }}>
            Нет записей
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredBookings.map(booking => (
              <div
                key={booking.id}
                className="glass-card"
                style={{ 
                  borderRadius: '22px',
                  padding: '22px',
                  background: isDark 
                    ? 'linear-gradient(135deg, rgba(35,35,35,0.95), rgba(25,25,25,0.9))' 
                    : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(252,252,252,0.9))',
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
                  opacity: booking.status === 'cancelled' ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: theme.textColor, fontSize: '17px' }}>
                      {booking.serviceName}
                    </div>
                    <div style={{ fontSize: '14px', color: theme.hintColor, marginTop: '4px' }}>
                      {formatDate(booking.date)} в {booking.time}
                    </div>
                  </div>
                  <div 
                    style={{ 
                      padding: '8px 14px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: booking.status === 'confirmed' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: booking.status === 'confirmed' ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {booking.status === 'confirmed' ? 'Подтверждено' : 'Отменено'}
                  </div>
                </div>
                
                {booking.clientName && (
                  <div style={{ fontSize: '14px', color: theme.hintColor, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} />
                    {booking.clientName}
                    {booking.clientPhone && ` • ${booking.clientPhone}`}
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: theme.buttonColor, fontSize: '20px' }}>
                    {booking.price} ₽
                  </span>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {booking.status === 'confirmed' ? (
                      <button
                        onClick={() => handleStatusChange(booking.id, 'cancelled')}
                        style={{
                          padding: '12px',
                          borderRadius: '14px',
                          background: 'rgba(239,68,68,0.15)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        title="Отменить"
                      >
                        <XCircle size={20} style={{ color: '#ef4444' }} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(booking.id, 'confirmed')}
                        style={{
                          padding: '12px',
                          borderRadius: '14px',
                          background: 'rgba(34,197,94,0.15)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        title="Подтвердить"
                      >
                        <CheckCircle size={20} style={{ color: '#22c55e' }} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(booking.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '14px',
                        background: 'rgba(239,68,68,0.15)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      title="Удалить"
                    >
                      <Trash2 size={20} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        )}
      </div>

      {/* ========== SERVICE EDIT MODAL ========== */}
      {showEditModal && (
        <ServiceEditModalRenderer
          service={editModalService}
          theme={theme}
          isDark={isDark}
          onSave={handleSaveFromModal}
          onClose={() => { setShowEditModal(false); setEditModalService(null); }}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Кастомный Alert */}
      <Alert
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        confirmText={alertState.confirmText}
        cancelText={alertState.cancelText}
        onConfirm={alertState.onConfirm}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

// ========== SORTABLE SERVICE CARD COMPONENT ==========
function SortableServiceCard({
  service,
  onToggle,
  onDelete,
  onEdit,
  theme,
  isDark,
}: {
  service: Service;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  theme: any;
  isDark: boolean;
}) {
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
        className="glass-card"
        style={{
          background: service.isActive 
            ? (isDark 
                ? 'linear-gradient(135deg, rgba(35,35,35,0.98), rgba(25,25,25,0.95))' 
                : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(252,252,252,0.95))')
            : (isDark ? 'rgba(35,35,35,0.5)' : 'rgba(255,255,255,0.5)'),
          backdropFilter: 'blur(24px)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)'}`,
          borderRadius: '14px',
          boxShadow: isDragging 
            ? '0 16px 48px rgba(0,0,0,0.4)' 
            : (isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 4px 16px rgba(0,0,0,0.06)'),
          opacity: service.isActive ? 1 : 0.6,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex', 
          alignItems: 'center',
          padding: '12px 14px',
          gap: '10px',
          cursor: isDragging ? 'grabbing' : 'pointer',
          touchAction: 'none',
          minHeight: '56px',
        }}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            padding: '4px',
            cursor: 'grab',
            borderRadius: '6px',
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          }}
        >
          <GripVertical size={16} style={{ color: theme.hintColor }} />
        </div>

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
              fontSize: '14px', 
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
        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
            title={service.isActive ? 'Скрыть' : 'Показать'}
          >
            {service.isActive ? (
              <Eye size={16} style={{ color: '#22c55e' }} />
            ) : (
              <EyeOff size={16} style={{ color: theme.hintColor }} />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
            title="Редактировать"
          >
            <Edit2 size={16} style={{ color: '#3b82f6' }} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
            title="Удалить"
          >
            <Trash2 size={16} style={{ color: '#ef4444' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== SERVICE EDIT MODAL COMPONENT ==========
function ServiceEditModalRenderer({
  service,
  theme,
  isDark,
  onSave,
  onClose,
}: {
  service: Service | null;
  theme: any;
  isDark: boolean;
  onSave: (data: Partial<Service>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(service?.name || '');
  const [description, setDescription] = useState(service?.description || '');
  const [duration, setDuration] = useState(service?.duration || 45);
  const [price, setPrice] = useState(service?.price || 1000);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Введите название услуги');
      return;
    }
    if (duration < 1) {
      alert('Укажите длительность');
      return;
    }
    if (price < 1) {
      alert('Укажите цену');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      duration,
      price,
    });
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, rgba(35,35,35,0.98), rgba(25,25,25,0.95))' 
            : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(252,252,252,0.95))',
          backdropFilter: 'blur(24px)',
          borderRadius: '24px',
          padding: '24px',
          width: '100%',
          maxWidth: '360px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ color: theme.textColor, fontSize: '18px', fontWeight: 700, margin: '0 0 20px 0' }}>
          {service ? 'Редактировать' : 'Новая услуга'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название услуги"
            style={{ 
              width: '100%',
              padding: '14px 16px',
              borderRadius: '12px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
              background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
              color: theme.textColor,
              fontSize: '15px',
              outline: 'none',
            }}
          />
          
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание (необязательно)"
            rows={3}
            style={{ 
              width: '100%',
              padding: '14px 16px',
              borderRadius: '12px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
              background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
              color: theme.textColor,
              fontSize: '15px',
              outline: 'none',
              resize: 'none',
            }}
          />
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: theme.hintColor, fontSize: '12px', marginBottom: '6px', display: 'block' }}>
                Длительность (мин)
              </label>
              <input
                type="number"
                value={duration || ''}
                onChange={(e) => setDuration(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                  background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                  color: theme.textColor,
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ color: theme.hintColor, fontSize: '12px', marginBottom: '6px', display: 'block' }}>
                Цена (₽)
              </label>
              <input
                type="number"
                value={price || ''}
                onChange={(e) => setPrice(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                  background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                  color: theme.textColor,
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '14px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
              background: 'transparent',
              color: theme.hintColor,
              fontSize: '14px',
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
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              background: `linear-gradient(135deg, ${theme.buttonColor}, ${theme.buttonColor}cc)`,
              color: theme.buttonTextColor,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
