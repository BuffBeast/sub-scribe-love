import { supabase } from '@/integrations/supabase/client';

type ScrapeResponse = {
  success: boolean;
  error?: string;
  data?: {
    markdown: string;
    html: string;
    metadata?: {
      title?: string;
      sourceURL?: string;
    };
  };
};

export const scraperApi = {
  async scrapeCustomers(url: string): Promise<ScrapeResponse> {
    const { data, error } = await supabase.functions.invoke('scrape-customers', {
      body: { url },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },
};
