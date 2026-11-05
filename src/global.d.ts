interface Window {
  __env?: {
    apiBase?: string;
    importApiBase?: string;
    fiscalApiBase?: string;
    gaMeasurementId?: string;
    metaPixelId?: string;
  };
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  _fbq?: unknown;
}
