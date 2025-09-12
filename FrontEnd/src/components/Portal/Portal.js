import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const Portal = ({ children, containerId = 'modal-root' }) => {
  const [container, setContainer] = useState(null);

  useEffect(() => {
    // Tìm hoặc tạo container
    let modalContainer = document.getElementById(containerId);
    
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = containerId;
      modalContainer.style.position = 'relative';
      modalContainer.style.zIndex = '1055';
      document.body.appendChild(modalContainer);
    }
    
    setContainer(modalContainer);

    // Cleanup khi component unmount
    return () => {
      if (modalContainer && modalContainer.children.length === 0) {
        document.body.removeChild(modalContainer);
      }
    };
  }, [containerId]);

  if (!container) return null;

  return createPortal(children, container);
};

export default Portal;