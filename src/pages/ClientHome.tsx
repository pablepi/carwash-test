import React, { useState } from 'react';
import { useTenantConfig } from '@/lib/tenant-store';
import { HeroSection } from '@/components/client/HeroSection';
import { ServiceCatalog, ServiceItem } from '@/components/client/ServiceCatalog';
import { Footer } from '@/components/client/Footer';
import { BookingModal } from '@/components/client/BookingModal';
import { BookingSuccess } from '@/components/client/BookingSuccess';
import { FloatingBottomNav } from '@/components/common/FloatingBottomNav';

export const ClientHome: React.FC = () => {
  const { config: tenant } = useTenantConfig();

  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);

  // Triggered when user selects a service in the catalog -> open booking modal popup
  const handleSelectService = (service: ServiceItem) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  // Triggered from Hero button -> open booking modal popup
  const handleHeroBookClick = () => {
    setSelectedService(tenant.services[0]);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#F5F5F7]">
      {confirmedBooking ? (
        <BookingSuccess
          booking={confirmedBooking}
          tenant={tenant}
          onReset={() => {
            setConfirmedBooking(null);
            setSelectedService(null);
          }}
        />
      ) : (
        <>
          {/* Hero Section with Liquid Glass Action Button */}
          <HeroSection tenant={tenant} onBookClick={handleHeroBookClick} />

          {/* Clean, direct flow to Services Catalog */}
          <ServiceCatalog
            services={tenant.services}
            selectedServiceId={selectedService?.id}
            onSelectService={handleSelectService}
          />

          {/* Elegant Apple-style Footer */}
          <Footer tenant={tenant} />
        </>
      )}

      {/* Booking Flow as a dedicated Popup Modal */}
      {isModalOpen && (
        <BookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          tenant={tenant}
          initialService={selectedService}
          onSuccess={(bookingData) => {
            setIsModalOpen(false);
            setConfirmedBooking(bookingData);
          }}
        />
      )}

      {/* Floating Liquid-Glass Bottom Navigation */}
      <FloatingBottomNav
        onOpenBooking={() => {
          if (confirmedBooking) setConfirmedBooking(null);
          setIsModalOpen(true);
        }}
      />
    </div>
  );
};
