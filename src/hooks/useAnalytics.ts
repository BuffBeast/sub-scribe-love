import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

export function usePageTracking() {
  const location = useLocation();
  const { user } = useAuth();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    const trackPageView = async () => {
      if (!user) return;
      
      // Avoid duplicate tracking for same path
      if (lastTrackedPath.current === location.pathname) return;
      lastTrackedPath.current = location.pathname;

      const sessionId = getSessionId();

      try {
        await supabase.from('analytics_events').insert({
          user_id: user.id,
          session_id: sessionId,
          page_path: location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
        });
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    };

    trackPageView();
  }, [location.pathname, user]);
}

export interface AnalyticsData {
  totalPageViews: number;
  uniqueSessions: number;
  pageViewsByPath: { path: string; count: number }[];
  dailyPageViews: { date: string; count: number }[];
  isLoading: boolean;
}

export function useAnalyticsData(days: number = 30): AnalyticsData {
  const { user } = useAuth();
  const [data, setData] = useState<Omit<AnalyticsData, 'isLoading'>>({
    totalPageViews: 0,
    uniqueSessions: 0,
    pageViewsByPath: [],
    dailyPageViews: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;

      setIsLoading(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      try {
        const { data: events, error } = await supabase
          .from('analytics_events')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (events) {
          const totalPageViews = events.length;
          const uniqueSessions = new Set(events.map(e => e.session_id)).size;

          const pathCounts: Record<string, number> = {};
          events.forEach(e => {
            pathCounts[e.page_path] = (pathCounts[e.page_path] || 0) + 1;
          });
          const pageViewsByPath = Object.entries(pathCounts)
            .map(([path, count]) => ({ path, count }))
            .sort((a, b) => b.count - a.count);

          const dailyCounts: Record<string, number> = {};
          events.forEach(e => {
            const date = new Date(e.created_at).toISOString().split('T')[0];
            dailyCounts[date] = (dailyCounts[date] || 0) + 1;
          });
          const dailyPageViews = Object.entries(dailyCounts)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

          setData({
            totalPageViews,
            uniqueSessions,
            pageViewsByPath,
            dailyPageViews,
          });
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, days]);

  return { ...data, isLoading };
}
