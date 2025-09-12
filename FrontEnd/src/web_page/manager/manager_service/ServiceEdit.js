import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';
import styles from './ServiceEdit.module.css';

// Mock data (replace with API calls)
const mockServices = [
  {
    ServiceID: 1,
    ServiceName: 'Massage',
    Description: 'Relaxing massage',
    Price: 50,
    Category: 'Spa & Wellness',
    IsActive: true,
    Duration: 60,
    MaxCapacity: 2,
  },
];

const categories = [
  'Spa & Wellness',
  'Ăn uống',
  'Vận chuyển',
  'Tour & Hoạt động',
  'Dịch vụ phòng',
  'Giặt ủi',
  'Dịch vụ doanh nghiệp',
  'Giải trí',
  'Trẻ em & Gia đình',
  'Sức khỏe & Thể thao',
  'Mua sắm',
  'Sự kiện đặc biệt',
  'Khác',
];

function ServiceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id !== 'new';
  const [service, setService] = useState({
    ServiceName: '',
    Description: '',
    Price: '',
    Category: 'Khác',
    IsActive: true,
    Duration: 0,
    MaxCapacity: 0,
  });

  useEffect(() => {
    if (isEdit) {
      // Simulate API fetch (replace with axios.get(`/api/services/${id}`))
      const foundService = mockServices.find((s) => s.ServiceID === parseInt(id));
      if (foundService) setService(foundService);
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setService((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate API save (replace with axios.post/put)
    if (isEdit) {
      console.log('Update service:', service);
    } else {
      console.log('Create service:', service);
    }
    navigate('/');
  };

  return (
    <div className={styles.container}>
      <h2 className="mb-4">{isEdit ? 'Edit Service' : 'Add Service'}</h2>
      <Card className={styles.card}>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Service Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="ServiceName"
                    value={service.ServiceName}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="Description"
                    value={service.Description}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Price</Form.Label>
                  <Form.Control
                    type="number"
                    name="Price"
                    value={service.Price}
                    onChange={handleChange}
                    step="0.01"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Select name="Category" value={service.Category} onChange={handleChange}>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Duration (minutes)</Form.Label>
                  <Form.Control
                    type="number"
                    name="Duration"
                    value={service.Duration}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Max Capacity</Form.Label>
                  <Form.Control
                    type="number"
                    name="MaxCapacity"
                    value={service.MaxCapacity}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Active"
                    name="IsActive"
                    checked={service.IsActive}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Button variant="primary" type="submit" className="me-2">
              Save
            </Button>
            <Button variant="secondary" onClick={() => navigate('/')}>
              Cancel
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}

export default ServiceEdit;