import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

export const useServices = () => {
  const [availableServices, setAvailableServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState('');
  const [serviceCategories, setServiceCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [servicesView, setServicesView] = useState('grid');
  const [serviceSearch, setServiceSearch] = useState('');

  useEffect(() => {
    fetchServicesFromAPI();
  }, []);

  const fetchServicesFromAPI = async () => {
    try {
      setServicesLoading(true);
      setServicesError('');
      
      console.log('🔄 Fetching services from API...');
      
      const response = await fetch('http://localhost:3000/api/services/active', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Services response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Services data received:', data);

        if (data.success && Array.isArray(data.data)) {
          const transformedServices = data.data.map(service => ({
            id: service.ServiceID,
            name: service.ServiceName,
            price: service.Price,
            description: service.Description,
            isActive: service.IsActive,
            category: service.Category || 'Khác',
            duration: service.Duration || 0,
            maxCapacity: service.MaxCapacity || 1,
            imageUrl: service.Image
          }));

          setAvailableServices(transformedServices);
          
          const categories = [...new Set(transformedServices.map(s => s.category))];
          setServiceCategories(['all', ...categories]);
          
          console.log(`✅ Loaded ${transformedServices.length} services from database`);
          console.log('📂 Categories found:', categories);
        } else {
          throw new Error('Invalid service data format received');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch services`);
      }
    } catch (error) {
      console.error('❌ Error fetching services:', error);
      setServicesError(error.message);
      setFallbackServices();
      toast.warning('Không thể tải dịch vụ từ database, sử dụng dữ liệu mẫu');
    } finally {
      setServicesLoading(false);
    }
  };

  const setFallbackServices = () => {
    const fallbackServices = [
      { 
        id: 1, 
        name: 'Spa & Massage', 
        price: 500000, 
        description: 'Dịch vụ spa và massage thư giãn', 
        category: 'Spa & Wellness',
        duration: 60,
        maxCapacity: 2
      },
      { 
        id: 2, 
        name: 'Ăn sáng buffet', 
        price: 200000, 
        description: 'Buffet sáng đa dạng món Á - Âu', 
        category: 'Ăn uống',
        duration: 90,
        maxCapacity: 50
      },
      { 
        id: 3, 
        name: 'Đưa đón sân bay', 
        price: 300000, 
        description: 'Dịch vụ đưa đón sân bay 24/7', 
        category: 'Vận chuyển',
        duration: 120,
        maxCapacity: 4
      },
      { 
        id: 4, 
        name: 'Thuê xe máy', 
        price: 150000, 
        description: 'Thuê xe máy theo ngày', 
        category: 'Vận chuyển',
        duration: 1440,
        maxCapacity: 2
      },
      { 
        id: 5, 
        name: 'Tour du lịch', 
        price: 800000, 
        description: 'Tour tham quan các điểm du lịch nổi tiếng', 
        category: 'Du lịch',
        duration: 480,
        maxCapacity: 20
      },
      { 
        id: 6, 
        name: 'Giặt ủi', 
        price: 100000, 
        description: 'Dịch vụ giặt ủi quần áo', 
        category: 'Phòng',
        duration: 240,
        maxCapacity: 10
      }
    ];
    setAvailableServices(fallbackServices);
    const categories = [...new Set(fallbackServices.map(s => s.category))];
    setServiceCategories(['all', ...categories]);
  };

  const getFilteredServices = () => {
    let filtered = availableServices;

    if (activeCategory !== 'all') {
      filtered = filtered.filter(service => service.category === activeCategory);
    }

    if (serviceSearch.trim()) {
      const searchTerm = serviceSearch.toLowerCase();
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(searchTerm) ||
        service.description.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  };

  return {
    availableServices,
    servicesLoading,
    servicesError,
    serviceCategories,
    activeCategory,
    setActiveCategory,
    servicesView,
    setServicesView,
    serviceSearch,
    setServiceSearch,
    getFilteredServices
  };
};