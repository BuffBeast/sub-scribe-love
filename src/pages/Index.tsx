import { useState, useMemo } from 'react';
import { Users, CreditCard, TrendingUp, Clock, LogOut } from 'lucide-react';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAuth } from '@/hooks/useAuth';
import { MetricCard } from '@/components/MetricCard';
import { CustomerTable } from '@/components/CustomerTable';
import { SearchBar } from '@/components/SearchBar';
import { FilterTabs } from '@/components/FilterTabs';
import { ImportCustomersDialog } from '@/components/ImportCustomersDialog';
import { AddCustomerDialog } from '@/components/AddCustomerDialog';
import { ColumnSettingsDialog } from '@/components/ColumnSettingsDialog';
import { EditCustomerDialog } from '@/components/EditCustomerDialog';
import { ExportCSVButton } from '@/components/ExportCSVButton';
import { BrandingSettingsDialog } from '@/components/BrandingSettingsDialog';
import { Button } from '@/components/ui/button';
import letsStreamLogo from '@/assets/lets-stream-logo.png';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { data: customers = [], isLoading } = useCustomers();
  const { data: customFields = [] } = useCustomFields();
  const { data: appSettings } = useAppSettings();
  const { signOut } = useAuth();

  const displayName = appSettings?.app_name || 'Let\'s Stream Customer Tracker';
  const displayLogo = appSettings?.logo_url || letsStreamLogo;

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.subscription_status === 'active').length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const trialCustomers = customers.filter(c => c.subscription_status === 'trial').length;

    return { totalCustomers, activeCustomers, totalRevenue, trialCustomers };
  }, [customers]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return {
      all: customers.length,
      active: customers.filter(c => c.subscription_status === 'active').length,
      trial: customers.filter(c => c.subscription_status === 'trial').length,
      expired: customers.filter(c => c.subscription_status === 'expired').length,
      cancelled: customers.filter(c => c.subscription_status === 'cancelled').length,
    };
  }, [customers]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (customer.company?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || customer.subscription_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, customers]);

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
                src={displayLogo} 
                alt={`${displayName} logo`} 
                className="h-12 sm:h-14 w-auto object-contain drop-shadow-xl"
              />
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gradient">{displayName}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your spooky-good customer dashboard 👻
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ExportCSVButton customers={customers} customFields={customFields} />
              <ColumnSettingsDialog />
              <BrandingSettingsDialog />
              <ImportCustomersDialog />
              <AddCustomerDialog />
              <Button variant="outline" size="icon" onClick={signOut} title="Sign Out">
                <LogOut className="h-4 w-4" />
              </Button>
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
            subtitle={metrics.totalCustomers > 0 ? `${Math.round((metrics.activeCustomers / metrics.totalCustomers) * 100)}% of total` : '0% of total'}
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
        <div className="w-full">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading customers...</p>
            </div>
          ) : (
            <>
              <CustomerTable
                customers={filteredCustomers}
                onCustomerClick={(c) => setEditingCustomer(c)}
              />
              {filteredCustomers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {customers.length === 0 
                      ? 'No customers yet. Add your first customer!' 
                      : 'No customers found matching your criteria.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <EditCustomerDialog
          customer={editingCustomer}
          open={!!editingCustomer}
          onOpenChange={(open) => !open && setEditingCustomer(null)}
        />
      </main>
    </div>
  );
};

export default Index;
