import { useState, useMemo } from 'react';
import { Users, CreditCard, TrendingUp, Clock } from 'lucide-react';
import { mockCustomers } from '@/data/mockCustomers';
import { Customer, SubscriptionStatus } from '@/types/customer';
import { MetricCard } from '@/components/MetricCard';
import { CustomerTable } from '@/components/CustomerTable';
import { CustomerDetailPanel } from '@/components/CustomerDetailPanel';
import { SearchBar } from '@/components/SearchBar';
import { FilterTabs } from '@/components/FilterTabs';
import ghostBuffMascot from '@/assets/ghostbuff-mascot.png';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalCustomers = mockCustomers.length;
    const activeCustomers = mockCustomers.filter(c => c.subscriptionStatus === 'active').length;
    const totalRevenue = mockCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
    const trialCustomers = mockCustomers.filter(c => c.subscriptionStatus === 'trial').length;

    return { totalCustomers, activeCustomers, totalRevenue, trialCustomers };
  }, []);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return {
      all: mockCustomers.length,
      active: mockCustomers.filter(c => c.subscriptionStatus === 'active').length,
      trial: mockCustomers.filter(c => c.subscriptionStatus === 'trial').length,
      expired: mockCustomers.filter(c => c.subscriptionStatus === 'expired').length,
      cancelled: mockCustomers.filter(c => c.subscriptionStatus === 'cancelled').length,
    };
  }, []);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return mockCustomers.filter(customer => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.company.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || customer.subscriptionStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

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
                src={ghostBuffMascot} 
                alt="GhostBuff mascot" 
                className="h-14 w-14 animate-ghost-float"
              />
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gradient">GhostBuff</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your spooky-good customer dashboard 👻
                </p>
              </div>
            </div>
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
