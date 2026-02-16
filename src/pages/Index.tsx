import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, Tv, Video, LogOut, BarChart3, AlertTriangle } from 'lucide-react';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useThemeColor } from '@/hooks/useThemeColor';
import { usePageTracking } from '@/hooks/useAnalytics';
import { MetricCard } from '@/components/MetricCard';
import { CustomerTable } from '@/components/CustomerTable';
import { MobileCustomerCard } from '@/components/MobileCustomerCard';
import { MobileHeader } from '@/components/MobileHeader';
import { PullToRefresh } from '@/components/PullToRefresh';
import { SearchBar } from '@/components/SearchBar';
import { FilterTabs } from '@/components/FilterTabs';
import { CustomFieldFilters } from '@/components/CustomFieldFilters';
import { SortSelect, SortOption } from '@/components/SortSelect';
import { ImportCustomersDialog } from '@/components/ImportCustomersDialog';
import { AddCustomerDialog } from '@/components/AddCustomerDialog';
import { ColumnSettingsDialog } from '@/components/ColumnSettingsDialog';
import { EditCustomerDialog } from '@/components/EditCustomerDialog';
import { ExportCSVButton } from '@/components/ExportCSVButton';
import { BrandingSettingsDialog } from '@/components/BrandingSettingsDialog';
import { MassEmailDialog } from '@/components/MassEmailDialog';
import { StockTracker } from '@/components/StockTracker';
import { Button } from '@/components/ui/button';
import letsStreamLogo from '@/assets/lets-stream-logo.png';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customFieldFilters, setCustomFieldFilters] = useState<Record<string, string>>({});
  const [sortOption, setSortOption] = useState<SortOption>('expiry-asc');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: customers = [], isLoading, refetch } = useCustomers();
  const { data: customFields = [] } = useCustomFields();
  const { data: appSettings } = useAppSettings();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  useThemeColor(); // Apply theme color
  usePageTracking(); // Track page views

  const displayName = appSettings?.app_name || 'Customer Tracker';
  const displayLogo = appSettings?.logo_url || letsStreamLogo;
  const displayTagline = appSettings?.tagline || 'Your spooky-good customer dashboard 👻';

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalCustomers = customers.length;
    const activeLive = customers.filter(c => c.subscription_plan).length;
    const activeVod = customers.filter(c => c.vod_plan).length;
    const trialCustomers = customers.filter(c => c.has_trial === true).length;
    const expiredCustomers = customers.filter(c => c.subscription_status === 'expired').length;

    return { totalCustomers, activeLive, activeVod, trialCustomers, expiredCustomers };
  }, [customers]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return {
      all: customers.length,
      active: customers.filter(c => c.subscription_status === 'active' && !c.has_trial).length,
      trial: customers.filter(c => c.has_trial === true).length,
      expired: customers.filter(c => c.subscription_status === 'expired').length,
      cancelled: customers.filter(c => c.subscription_status === 'cancelled').length,
    };
  }, [customers]);

  // Custom field filter handlers
  const handleCustomFieldFilterChange = useCallback((fieldName: string, value: string) => {
    setCustomFieldFilters((prev) => ({
      ...prev,
      [fieldName]: value === '__all__' ? '' : value,
    }));
  }, []);

  const handleCustomFieldFilterClear = useCallback((fieldName: string) => {
    setCustomFieldFilters((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    const filtered = customers.filter(customer => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (customer.company?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      let matchesStatus = false;
      if (statusFilter === 'all') {
        matchesStatus = true;
      } else if (statusFilter === 'trial') {
        matchesStatus = customer.has_trial === true;
      } else if (statusFilter === 'active') {
        matchesStatus = customer.subscription_status === 'active' && !customer.has_trial;
      } else {
        matchesStatus = customer.subscription_status === statusFilter;
      }

      // Check custom field filters
      const matchesCustomFields = Object.entries(customFieldFilters).every(([fieldName, filterValue]) => {
        if (!filterValue) return true;
        const customData = (customer.custom_data as Record<string, unknown>) || {};
        return customData[fieldName] === filterValue;
      });

      return matchesSearch && matchesStatus && matchesCustomFields;
    });

    // Sort customers
    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'alpha-asc':
          return a.name.localeCompare(b.name);
        case 'alpha-desc':
          return b.name.localeCompare(a.name);
        case 'expiry-asc': {
          // Get soonest expiry date (LIVE or VOD, whichever is sooner)
          const aLive = a.subscription_end_date ? new Date(a.subscription_end_date).getTime() : Infinity;
          const aVod = a.vod_end_date ? new Date(a.vod_end_date).getTime() : Infinity;
          const bLive = b.subscription_end_date ? new Date(b.subscription_end_date).getTime() : Infinity;
          const bVod = b.vod_end_date ? new Date(b.vod_end_date).getTime() : Infinity;
          const aMin = Math.min(aLive, aVod);
          const bMin = Math.min(bLive, bVod);
          return aMin - bMin;
        }
        case 'expiry-desc': {
          const aLive = a.subscription_end_date ? new Date(a.subscription_end_date).getTime() : -Infinity;
          const aVod = a.vod_end_date ? new Date(a.vod_end_date).getTime() : -Infinity;
          const bLive = b.subscription_end_date ? new Date(b.subscription_end_date).getTime() : -Infinity;
          const bVod = b.vod_end_date ? new Date(b.vod_end_date).getTime() : -Infinity;
          const aMax = Math.max(aLive, aVod);
          const bMax = Math.max(bLive, bVod);
          return bMax - aMax;
        }
        default:
          return 0;
      }
    });
  }, [searchQuery, statusFilter, customFieldFilters, sortOption, customers]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRefresh = async () => {
    await refetch();
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-ghost-gradient flex flex-col">
        <MobileHeader
          displayName={displayName}
          displayLogo={displayLogo}
          displayTagline={displayTagline}
          customers={customers}
          customFields={customFields}
          signOut={signOut}
        />

        <PullToRefresh onRefresh={handleRefresh} className="flex-1">
          <main className="px-4 py-4 space-y-4">
            {/* Compact Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                title="Total"
                value={metrics.totalCustomers}
                icon={Users}
              />
              <MetricCard
                title="Live"
                value={metrics.activeLive}
                icon={Tv}
              />
              <MetricCard
                title="VOD"
                value={metrics.activeVod}
                icon={Video}
              />
              <MetricCard
                title="Trial"
                value={metrics.trialCustomers}
                icon={Clock}
              />
              <MetricCard
                title="Expired"
                value={metrics.expiredCustomers}
                icon={AlertTriangle}
                className="col-span-2"
              />
            </div>

            {/* Stock Tracker */}
            <StockTracker />

            {/* Search, Filters, and Sort */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchBar value={searchQuery} onChange={setSearchQuery} />
                </div>
                <SortSelect value={sortOption} onChange={setSortOption} />
              </div>
              <div className="overflow-x-auto -mx-4 px-4">
                <FilterTabs
                  value={statusFilter}
                  onChange={setStatusFilter}
                  counts={statusCounts}
                />
              </div>
              <CustomFieldFilters
                customFields={customFields}
                filters={customFieldFilters}
                onChange={handleCustomFieldFilterChange}
                onClear={handleCustomFieldFilterClear}
              />
            </div>

            {/* Customer Cards */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading customers...</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {customers.length === 0
                      ? 'No customers yet. Add your first customer!'
                      : 'No customers found matching your criteria.'}
                  </p>
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <MobileCustomerCard
                    key={customer.id}
                    customer={customer}
                    selected={selectedIds.has(customer.id)}
                    onSelect={toggleSelect}
                    onClick={(c) => setEditingCustomer(c)}
                  />
                ))
              )}
            </div>
          </main>
        </PullToRefresh>

        <EditCustomerDialog
          customer={editingCustomer}
          open={!!editingCustomer}
          onOpenChange={(open) => !open && setEditingCustomer(null)}
        />
      </div>
    );
  }

  // Desktop layout
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
                  {displayTagline}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MassEmailDialog customers={customers} />
              <ExportCSVButton customers={customers} customFields={customFields} />
              <ColumnSettingsDialog />
              <BrandingSettingsDialog />
              <ImportCustomersDialog />
              <AddCustomerDialog />
              <Link to="/analytics">
                <Button variant="outline" size="icon" title="Analytics">
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" size="icon" onClick={signOut} title="Sign Out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <MetricCard
            title="Total Customers"
            value={metrics.totalCustomers}
            icon={Users}
            trend={{ value: 12, isPositive: true }}
          />
          <MetricCard
            title="Active Live"
            value={metrics.activeLive}
            subtitle={metrics.totalCustomers > 0 ? `${Math.round((metrics.activeLive / metrics.totalCustomers) * 100)}% of total` : '0% of total'}
            icon={Tv}
          />
          <MetricCard
            title="Active VOD"
            value={metrics.activeVod}
            subtitle={metrics.totalCustomers > 0 ? `${Math.round((metrics.activeVod / metrics.totalCustomers) * 100)}% of total` : '0% of total'}
            icon={Video}
          />
          <MetricCard
            title="In Trial"
            value={metrics.trialCustomers}
            subtitle="Potential conversions"
            icon={Clock}
          />
          <MetricCard
            title="Expired"
            value={metrics.expiredCustomers}
            subtitle={metrics.totalCustomers > 0 ? `${Math.round((metrics.expiredCustomers / metrics.totalCustomers) * 100)}% of total` : '0% of total'}
            icon={AlertTriangle}
          />
        </div>

        {/* Stock Tracker */}
        <div className="mb-8">
          <StockTracker />
        </div>

        {/* Filters, Search, and Sort */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <FilterTabs
              value={statusFilter}
              onChange={setStatusFilter}
              counts={statusCounts}
            />
            <div className="flex items-center gap-3">
              <SortSelect value={sortOption} onChange={setSortOption} />
              <div className="w-full md:w-72">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>
            </div>
          </div>
          <CustomFieldFilters
            customFields={customFields}
            filters={customFieldFilters}
            onChange={handleCustomFieldFilterChange}
            onClear={handleCustomFieldFilterClear}
          />
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
