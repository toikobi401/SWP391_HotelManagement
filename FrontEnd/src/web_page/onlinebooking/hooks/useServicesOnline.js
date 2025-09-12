import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

export const useServicesOnline = () => {
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
      
      console.log('🔄 Fetching services from API for online booking...');
      
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
          
          console.log(`✅ Loaded ${transformedServices.length} services for online booking`);
          console.log('📂 Categories found:', categories);
        } else {
          throw new Error('Invalid service data format received');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch services`);
      }
    } catch (error) {
      console.error('❌ Error fetching services for online booking:', error);
      setServicesError(error.message);
      setFallbackServices();
      // toast.warning('Không thể tải dịch vụ từ database, sử dụng dữ liệu mẫu');
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
        description: 'Dịch vụ spa và massage thư giãn toàn thân', 
        category: 'Spa & Wellness',
        duration: 60,
        maxCapacity: 2,
        isActive: true
      },
      { 
        id: 2, 
        name: 'Ăn sáng buffet', 
        price: 200000, 
        description: 'Buffet sáng đa dạng món Á - Âu phong phú', 
        category: 'Ăn uống',
        duration: 90,
        maxCapacity: 50,
        isActive: true
      },
      { 
        id: 3, 
        name: 'Đưa đón sân bay', 
        price: 300000, 
        description: 'Dịch vụ đưa đón sân bay 24/7 tiện lợi', 
        category: 'Vận chuyển',
        duration: 120,
        maxCapacity: 4,
        isActive: true
      },
      { 
        id: 4, 
        name: 'Thuê xe máy', 
        price: 150000, 
        description: 'Thuê xe máy theo ngày, xe mới, đầy đủ bảo hiểm', 
        category: 'Vận chuyển',
        duration: 1440,
        maxCapacity: 2,
        isActive: true
      },
      { 
        id: 5, 
        name: 'Tour du lịch', 
        price: 800000, 
        description: 'Tour tham quan các điểm du lịch nổi tiếng trong thành phố', 
        category: 'Du lịch',
        duration: 480,
        maxCapacity: 20,
        isActive: true
      },
      { 
        id: 6, 
        name: 'Giặt ủi', 
        price: 100000, 
        description: 'Dịch vụ giặt ủi quần áo chuyên nghiệp', 
        category: 'Dịch vụ phòng',
        duration: 240,
        maxCapacity: 10,
        isActive: true
      },
      { 
        id: 7, 
        name: 'Phòng gym', 
        price: 100000, 
        description: 'Sử dụng phòng gym với đầy đủ thiết bị hiện đại', 
        category: 'Sức khỏe & Thể thao',
        duration: 120,
        maxCapacity: 15,
        isActive: true
      },
      { 
        id: 8, 
        name: 'Karaoke', 
        price: 250000, 
        description: 'Phòng karaoke cao cấp với âm thanh chất lượng', 
        category: 'Giải trí',
        duration: 180,
        maxCapacity: 8,
        isActive: true
      }
    ];
    setAvailableServices(fallbackServices);
    const categories = [...new Set(fallbackServices.map(s => s.category))];
    setServiceCategories(['all', ...categories]);
  };

  const getFilteredServices = () => {
    let filtered = availableServices.filter(service => service.isActive);

    if (activeCategory !== 'all') {
      filtered = filtered.filter(service => service.category === activeCategory);
    }

    if (serviceSearch.trim()) {
      const searchTerm = serviceSearch.toLowerCase();
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(searchTerm) ||
        service.description.toLowerCase().includes(searchTerm) ||
        service.category.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  };

  const getServiceById = (serviceId) => {
    return availableServices.find(service => service.id === serviceId);
  };

  const getServicesByCategory = (category) => {
    if (category === 'all') return availableServices;
    return availableServices.filter(service => service.category === category);
  };

  const calculateServiceTotal = (selectedServiceIds) => {
    return selectedServiceIds.reduce((total, serviceId) => {
      const service = getServiceById(serviceId);
      return total + (service?.price || 0);
    }, 0);
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
    getFilteredServices,
    getServiceById,
    getServicesByCategory,
    calculateServiceTotal,
    refetchServices: fetchServicesFromAPI
  };
};