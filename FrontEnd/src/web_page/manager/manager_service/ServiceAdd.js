import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';
import styles from './ServiceAdd.module.css';

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

function ServiceAdd() {
  const navigate = useNavigate();
  const [service, setService] = useState({
    ServiceName: '',
    Description: '',
    Price: '',
    Category: 'Khác',
    IsActive: true,
    Duration: 0,
    MaxCapacity: 0,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setService((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate API create (replace with axios.post('/api/services', service))
    console.log('Create service:', service);
    navigate('/');
  };

  return (
    <div className={styles.container}>
      <h2 className="mb-4">Add Service</h2>
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

export default ServiceAdd;