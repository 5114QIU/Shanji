declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export const GA_TRACKING_ID = 'G-LC60SPJXRF';

export const trackPageView = (pagePath: string, pageTitle?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};

export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};

export const analytics = {
  pageView: trackPageView,
  event: trackEvent,
};

export const events = {
  homepageView: 'homepage_view',
  fastRecordClick: 'fast_record_click',
  tmdbSearchAction: 'tmdb_search_action',
  searchResultSelect: 'search_result_select',
  manualInputClick: 'manual_input_click',
  recordSaveClick: 'record_save_click',
  posterShareClick: 'poster_share_click',
  statsView: 'stats_view',
};