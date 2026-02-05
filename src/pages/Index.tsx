import { useState, useMemo } from 'react';
import { Users, CreditCard, TrendingUp, Clock } from 'lucide-react';
import { mockCustomers } from '@/data/mockCustomers';
import { Customer, SubscriptionStatus } from '@/types/customer';
import { MetricCard } from '@/components/MetricCard';
import { CustomerTable } from '@/components/CustomerTable';
import { CustomerDetailPanel } from '@/components/CustomerDetailPanel';
import { SearchBar } from '@/components/SearchBar';
import { FilterTabs } from '@/components/FilterTabs';
import { ImportCustomersDialog } from '@/components/ImportCustomersDialog';
import ghostBuffLogo from '@/assets/ghostbuff-logo.jpeg';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [importedCustomers, setImportedCustomers] = useState<Customer[]>([]);

  // Combine mock and imported customers
  const allCustomers = useMemo(() => {
    return [...mockCustomers, ...importedCustomers];
  }, [importedCustomers]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalCustomers = allCustomers.length;
    const activeCustomers = allCustomers.filter(c => c.subscriptionStatus === 'active').length;
    const totalRevenue = allCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
    const trialCustomers = allCustomers.filter(c => c.subscriptionStatus === 'trial').length;

    return { totalCustomers, activeCustomers, totalRevenue, trialCustomers };
  }, [allCustomers]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return {
      all: allCustomers.length,
      active: allCustomers.filter(c => c.subscriptionStatus === 'active').length,
      trial: allCustomers.filter(c => c.subscriptionStatus === 'trial').length,
      expired: allCustomers.filter(c => c.subscriptionStatus === 'expired').length,
      cancelled: allCustomers.filter(c => c.subscriptionStatus === 'cancelled').length,
    };
  }, [allCustomers]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter(customer => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.company.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || customer.subscriptionStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, allCustomers]);

  const handleImport = (customers: Customer[]) => {
    setImportedCustomers(prev => [...prev, ...customers]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-ghost-gradient">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={ghostBuffLogo} 
                alt="GhostBuff logo" 
                className="h-14 w-14 rounded-full shadow-glow animate-ghost-float object-cover"
              />
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gradient">GhostBuff</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your spooky-good customer dashboard 👻
                </p>
              </div>
            </div>
            <ImportCustomersDialog onImport={handleImport} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Customers"
            value={metrics.totalCustomers}
            icon={Users}
            trend={{ value: 12, isPositive: true }}
          />
          <MetricCard
            title="Active Subscriptions"
            value={metrics.activeCustomers}
            subtitle={`${Math.round((metrics.activeCustomers / metrics.totalCustomers) * 100)}% of total`}
            icon={TrendingUp}
          />
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(metrics.totalRevenue)}
            icon={CreditCard}
            trend={{ value: 8, isPositive: true }}
          />
          <MetricCard
            title="In Trial"
            value={metrics.trialCustomers}
            subtitle="Potential conversions"
            icon={Clock}
          />
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
          <FilterTabs
            value={statusFilter}
            onChange={setStatusFilter}
            counts={statusCounts}
          />
          <div className="w-full md:w-72">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
        </div>

        {/* Content */}
        <div className="flex gap-6">
          {/* Customer Table */}
          <div className={selectedCustomer ? 'flex-1' : 'w-full'}>
            <CustomerTable
              customers={filteredCustomers}
              onCustomerClick={setSelectedCustomer}
            />
            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No customers found matching your criteria.</p>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedCustomer && (
            <div className="w-96 shrink-0">
              <CustomerDetailPanel
                customer={selectedCustomer}
                onClose={() => setSelectedCustomer(null)}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
